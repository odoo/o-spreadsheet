import { ClientDisconnectedError, PendingMessagesStorage } from "../../src";
import { DEFAULT_REVISION_ID } from "../../src/constants";
import { deepCopy } from "../../src/helpers/misc";
import { Model } from "../../src/model";
import { StateUpdateMessage } from "../../src/types/collaborative/transport_service";
import { MockTransportService } from "../__mocks__/transport_service";
import { getCellContent } from "../test_helpers";
import { nextTick } from "../test_helpers/helpers";

/**
 * In-memory implementation of PendingMessagesStorage for tests.
 * No crypto or Web Locks — just a simple in-memory store.
 * `stored` is public so tests can inspect it without clearing it.
 */
class MemoryPendingMessagesStorage implements PendingMessagesStorage {
  stored: StateUpdateMessage[] = [];

  addMessage(message: StateUpdateMessage): void {
    if (!this.stored.some((e) => e.nextRevisionId === message.nextRevisionId)) {
      this.stored = [...this.stored, message];
    }
  }

  removeMessage(revisionId: string): void {
    this.stored = this.stored.filter((e) => e.nextRevisionId !== revisionId);
  }

  save(messages: StateUpdateMessage[]): void {
    this.stored = [...messages];
  }

  async loadAndClaim(): Promise<StateUpdateMessage[] | null> {
    const messages = this.stored.length ? [...this.stored] : null;
    this.stored = [];
    return messages;
  }
}

/**
 * Simulate a page reload: create a new Model with the original server-side data
 * (NOT model.exportData() — the server snapshot before Alice's offline changes)
 * plus the same storage instance, then call restoreOfflineChanges().
 */
async function simulateReload(
  initialData: any,
  storage: PendingMessagesStorage,
  network: MockTransportService,
  stateUpdateMessages: StateUpdateMessage[] = []
): Promise<Model> {
  const model = new Model(
    deepCopy(initialData),
    {
      transportService: network,
      client: { id: "alice", name: "Alice" },
      pendingChangesStorage: storage,
    },
    stateUpdateMessages
  );
  await model.restoreOfflineChanges();
  return model;
}

describe("Offline change persistence", () => {
  let network: MockTransportService;
  /** The original server-side data — passed to the reload to mimic a fresh page load */
  let initialData: any;
  let alice: Model;
  let storage: MemoryPendingMessagesStorage;

  beforeEach(() => {
    network = new MockTransportService();
    initialData = new Model().exportData();
    storage = new MemoryPendingMessagesStorage();
    alice = new Model(deepCopy(initialData), {
      transportService: network,
      client: { id: "alice", name: "Alice" },
      pendingChangesStorage: storage,
    });
  });

  test("1. pending change is stored and cell value is restored after reload", async () => {
    // Simulate Alice going offline
    network.sendMessage = () => Promise.reject(new ClientDisconnectedError("offline"));

    alice.dispatch("UPDATE_CELL", {
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: "hello",
    });
    await nextTick(); // let the failed send settle → waitingAck = false

    // Storage has the pending message
    expect(storage.stored.length).toBeGreaterThan(0);

    // Simulate reload: new model with original server data + same storage, still offline
    const alice2 = await simulateReload(initialData, storage, network);
    await nextTick(); // let failed send settle

    // Alice sees her offline change restored
    expect(getCellContent(alice2, "A1")).toBe("hello");
    // Storage still has the pending message (not yet acked)
    expect(storage.stored.length).toBeGreaterThan(0);
  });

  test("2. storage is cleared once pending changes are sent and acked", async () => {
    const bob = new Model(deepCopy(initialData), {
      transportService: network,
      client: { id: "bob", name: "Bob" },
    });

    // Alice goes offline, makes a change
    network.sendMessage = () => Promise.reject(new ClientDisconnectedError("offline"));
    alice.dispatch("UPDATE_CELL", {
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: "hello",
    });
    await nextTick();

    // Restore the network
    network.sendMessage = MockTransportService.prototype.sendMessage.bind(network);

    // Reload Alice — network is now working so the pending message is sent and acked
    const alice2 = await simulateReload(initialData, storage, network);

    // Alice sees her change
    expect(getCellContent(alice2, "A1")).toBe("hello");
    // Bob received Alice's change
    expect(getCellContent(bob, "A1")).toBe("hello");
    // Storage is cleared after ack
    expect(storage.stored.length).toBe(0);
  });

  test("3. multiple offline changes are all restored in order", async () => {
    network.sendMessage = () => Promise.reject(new ClientDisconnectedError("offline"));

    const sheetId = alice.getters.getActiveSheetId();
    alice.dispatch("UPDATE_CELL", { sheetId, col: 0, row: 0, content: "A1 value" });
    alice.dispatch("UPDATE_CELL", { sheetId, col: 1, row: 1, content: "B2 value" });
    alice.dispatch("UPDATE_CELL", { sheetId, col: 2, row: 2, content: "C3 value" });
    await nextTick();

    const alice2 = await simulateReload(initialData, storage, network);
    await nextTick();

    expect(getCellContent(alice2, "A1")).toBe("A1 value");
    expect(getCellContent(alice2, "B2")).toBe("B2 value");
    expect(getCellContent(alice2, "C3")).toBe("C3 value");
  });

  test("4. undo is preserved across reload — cell is empty after restoring [REMOTE_REVISION, REVISION_UNDONE]", async () => {
    network.sendMessage = () => Promise.reject(new ClientDisconnectedError("offline"));

    const sheetId = alice.getters.getActiveSheetId();
    alice.dispatch("UPDATE_CELL", { sheetId, col: 0, row: 0, content: "hello" });
    await nextTick();
    // Undo the cell change
    alice.dispatch("REQUEST_UNDO", {});
    await nextTick();

    // Both REMOTE_REVISION and REVISION_UNDONE should be stored
    expect(storage.stored.length).toBeGreaterThan(0);
    expect(storage.stored.some((m) => m.type === "REMOTE_REVISION")).toBe(true);
    expect(storage.stored.some((m) => m.type === "REVISION_UNDONE")).toBe(true);

    const alice2 = await simulateReload(initialData, storage, network);
    await nextTick();

    // Undo was replayed: cell should be empty
    expect(getCellContent(alice2, "A1")).toBe("");
  });

  test("5. reload with newer server state: offline change is preserved alongside server changes", async () => {
    const bob = new Model(deepCopy(initialData), {
      transportService: network,
      client: { id: "bob", name: "Bob" },
    });

    // Bob changes B1 online → acked. Alice (connected) also receives this via the network.
    bob.dispatch("UPDATE_CELL", {
      sheetId: bob.getters.getActiveSheetId(),
      col: 1,
      row: 0,
      content: "Bob's B1",
    });
    await nextTick();

    // Alice goes offline, changes A1. The stored message has serverRevisionId = current server state.
    network.sendMessage = () => Promise.reject(new ClientDisconnectedError("offline"));
    alice.dispatch("UPDATE_CELL", {
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: "Alice's A1",
    });
    await nextTick();

    // The server snapshot at reload time is initialData + Bob's change.
    // alice.exportData() includes both Bob's B1 (received via broadcast) AND alice's pending A1
    // — we want the server-side snapshot which is alice's state minus the pending change.
    // The cleanest way to get that is from bob's model (which has only the acked server state).
    const serverSnapshot = bob.exportData();

    // Reload on a fresh network to avoid listener interference from the original alice model
    const freshNetwork = new MockTransportService();
    const alice2 = await simulateReload(serverSnapshot, storage, freshNetwork);
    await nextTick(); // let any pending sends settle

    // Alice's offline A1 change is restored from storage and applied (via revisions.insert OT)
    expect(getCellContent(alice2, "A1")).toBe("Alice's A1");
    // Bob's B1 change is present from the server snapshot
    expect(getCellContent(alice2, "B1")).toBe("Bob's B1");
  });

  test("6. second loadAndClaim returns null — replay lock prevents double-restore", async () => {
    network.sendMessage = () => Promise.reject(new ClientDisconnectedError("offline"));

    alice.dispatch("UPDATE_CELL", {
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: "tab A value",
    });
    await nextTick();

    // First claim succeeds — simulates Tab A (the live tab) claiming on reload
    const first = await storage.loadAndClaim();
    expect(first).not.toBeNull();

    // Second claim returns null — simulates Tab B being unable to steal Tab A's messages
    const second = await storage.loadAndClaim();
    expect(second).toBeNull();
  });

  test("7. stored revisions already acked by server are skipped and storage is cleared", async () => {
    // Capture alice's revision ID when it is acked
    let ackedNextRevisionId = "";
    const originalSend = network.sendMessage.bind(network);
    network.sendMessage = async (msg) => {
      await originalSend(msg);
      if (msg.type === "REMOTE_REVISION" && "nextRevisionId" in msg) {
        ackedNextRevisionId = msg.nextRevisionId;
      }
    };

    // Alice makes a change online — it is acked by the server
    alice.dispatch("UPDATE_CELL", {
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: "already acked",
    });
    await nextTick();
    expect(ackedNextRevisionId).not.toBe("");

    // Storage was cleared after the ack — inject a stale entry back to simulate a race condition
    // (another tab stored the same message before the ack arrived)
    const staleEntry: StateUpdateMessage = {
      type: "REMOTE_REVISION",
      version: 1,
      clientId: "alice",
      nextRevisionId: ackedNextRevisionId,
      serverRevisionId: "any",
      commands: [],
    };
    storage.save([staleEntry]);
    expect(storage.stored.length).toBeGreaterThan(0);

    // Reload Alice, passing the acked revision as a stateUpdateMessage
    // so that it ends up in processedRevisions
    const stateUpdateMessages: StateUpdateMessage[] = [
      {
        type: "REMOTE_REVISION",
        version: 1,
        clientId: "alice",
        nextRevisionId: ackedNextRevisionId,
        serverRevisionId: DEFAULT_REVISION_ID,
        commands: [
          {
            type: "UPDATE_CELL",
            sheetId: alice.getters.getActiveSheetId(),
            col: 0,
            row: 0,
            content: "already acked",
          },
        ],
      },
    ];
    network.sendMessage = originalSend;
    const alice2 = await simulateReload(
      initialData,
      storage,
      new MockTransportService(),
      stateUpdateMessages
    );

    // Stale entry was skipped (its nextRevisionId is in processedRevisions) → storage cleared
    expect(storage.stored.length).toBe(0);
    // Model shows the value from the stateUpdateMessage
    expect(getCellContent(alice2, "A1")).toBe("already acked");
  });

  test("8. restoreOfflineChanges is a no-op when storage returns null", async () => {
    // No pending messages in storage (fresh storage)
    expect(storage.stored.length).toBe(0);

    const alice2 = await simulateReload(initialData, storage, network);

    // No crash, model is in clean initial state
    expect(getCellContent(alice2, "A1")).toBe("");
    expect(storage.stored.length).toBe(0);
  });

  test("9. restoreOfflineChanges is a no-op when no storage is configured", async () => {
    // Model without pendingChangesStorage
    const aliceNoStorage = new Model(deepCopy(initialData), {
      transportService: network,
      client: { id: "alice", name: "Alice" },
    });

    // No crash when calling restoreOfflineChanges
    await expect(aliceNoStorage.restoreOfflineChanges()).resolves.toBeUndefined();
  });

  test("10. multi-tab: messages from two tabs are merged and both restored", async () => {
    network.sendMessage = () => Promise.reject(new ClientDisconnectedError("offline"));

    const sheetId = alice.getters.getActiveSheetId();

    // Tab A (alice) goes offline and edits A1 — stored via addMessage
    alice.dispatch("UPDATE_CELL", { sheetId, col: 0, row: 0, content: "tab A value" });
    await nextTick();
    expect(storage.stored.length).toBe(1);

    // Tab B independently adds its own pending message to the shared storage
    // (simulates a second tab that made an offline edit and called addMessage)
    const tabBMessage: StateUpdateMessage = {
      type: "REMOTE_REVISION",
      version: 1,
      clientId: "bob",
      nextRevisionId: "bob-rev-1",
      serverRevisionId: DEFAULT_REVISION_ID,
      commands: [{ type: "UPDATE_CELL", sheetId, col: 1, row: 0, content: "tab B value" }],
    };
    storage.addMessage(tabBMessage);

    // Storage now contains messages from both tabs
    expect(storage.stored.length).toBe(2);

    // Reload: both tabs' changes are merged and replayed together
    const freshNetwork = new MockTransportService();
    freshNetwork.sendMessage = () => Promise.reject(new ClientDisconnectedError("offline"));
    const alice2 = await simulateReload(initialData, storage, freshNetwork);
    await nextTick();

    expect(getCellContent(alice2, "A1")).toBe("tab A value");
    expect(getCellContent(alice2, "B1")).toBe("tab B value");
  });
});
