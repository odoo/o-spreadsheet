import { ClientDisconnectedError, Model } from "../../src";
import { PENDING_CHANGES_DISCONNECT_DELAY } from "../../src/constants";
import { hashToStorageKey } from "../../src/helpers/crypto";
import { LocalRevisionPersistenceStore } from "../../src/stores/local_revision_persistence_store";
import { CollaborationMessage } from "../../src/types/collaborative/transport_service";
import { MockTransportService } from "../__mocks__/transport_service";
import { setCellContent } from "../test_helpers/commands_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

function isRevisionMessage(message: CollaborationMessage): boolean {
  return (
    message.type === "REMOTE_REVISION" ||
    message.type === "REVISION_UNDONE" ||
    message.type === "REVISION_REDONE"
  );
}

/** A model whose revision sends are rejected: local edits stay queued. */
function offlineModel(data: any): Model {
  const network = new MockTransportService();
  network.sendMessage = (message) =>
    isRevisionMessage(message)
      ? Promise.reject(new ClientDisconnectedError("offline"))
      : Promise.resolve();
  return new Model(data, { transportService: network, client: { id: "tab", name: "Tab" } });
}

function emptyData() {
  return new Model().exportData();
}

describe("LocalRevisionPersistenceStore", () => {
  test("mirrors disconnected edits to localStorage (encrypted)", async () => {
    localStorage.clear();
    const data = emptyData();
    const model = offlineModel(data);
    const { store } = makeStoreWithModel(model, LocalRevisionPersistenceStore);
    await store.whenReady;

    setCellContent(model, "A1", "offline edit");
    await store.flushPersist();

    const storageKey = await hashToStorageKey(data.uuid!);
    const entry = localStorage.getItem(storageKey);
    expect(entry).toBeTruthy();
    const envelope = JSON.parse(entry!);
    expect(envelope.revisionIds).toHaveLength(1);
    // content is encrypted, never stored in clear text
    expect(entry).not.toContain("offline edit");
  });

  test("recovers persisted disconnected edits on reload", async () => {
    localStorage.clear();
    const data = emptyData();

    const model1 = offlineModel(data);
    const { store: store1 } = makeStoreWithModel(model1, LocalRevisionPersistenceStore);
    await store1.whenReady;
    setCellContent(model1, "A1", "offline edit");
    await store1.flushPersist();

    // A "reload": a fresh model with the same document (same uuid) recovers.
    const model2 = new Model(data, { client: { id: "reloaded", name: "Reloaded" } });
    const { store: store2 } = makeStoreWithModel(model2, LocalRevisionPersistenceStore);
    await store2.whenReady;

    expect(getCellContent(model2, "A1")).toBe("offline edit");
  });

  test("goes read-only when another tab stored different pending changes", async () => {
    localStorage.clear();
    const data = emptyData();
    const model = offlineModel(data);
    const { store } = makeStoreWithModel(model, LocalRevisionPersistenceStore);
    await store.whenReady;

    // Another tab wrote a divergent entry after this tab initialized.
    const storageKey = await hashToStorageKey(data.uuid!);
    const foreignEntry = JSON.stringify({ revisionIds: ["foreign-revision"], payload: "opaque" });
    localStorage.setItem(storageKey, foreignEntry);

    setCellContent(model, "A1", "mine");
    await store.flushPersist();

    expect(store.isDisconnected).toBe(true);
    expect(store.reason).toBe("another-tab-editing");
    expect(model.getters.isReadonly()).toBe(true);
    // the other tab's entry is left untouched
    expect(localStorage.getItem(storageKey)).toBe(foreignEntry);
  });

  test("goes read-only on a storage event carrying foreign revisions", async () => {
    localStorage.clear();
    const data = emptyData();
    const model = offlineModel(data);
    const { store } = makeStoreWithModel(model, LocalRevisionPersistenceStore);
    await store.whenReady;

    const storageKey = await hashToStorageKey(data.uuid!);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: storageKey,
        newValue: JSON.stringify({ revisionIds: ["foreign-revision"], payload: "opaque" }),
      })
    );

    expect(store.isDisconnected).toBe(true);
    expect(store.reason).toBe("another-tab-editing");
    expect(model.getters.isReadonly()).toBe(true);
  });

  test("flags the client disconnected after pending changes stay unsynced", async () => {
    localStorage.clear();
    jest.useFakeTimers();
    try {
      const model = offlineModel(emptyData());
      const { store } = makeStoreWithModel(model, LocalRevisionPersistenceStore);
      await store.whenReady;

      setCellContent(model, "A1", "x");
      expect(store.isDisconnected).toBe(false);

      jest.advanceTimersByTime(PENDING_CHANGES_DISCONNECT_DELAY);
      expect(store.isDisconnected).toBe(true);
      expect(store.reason).toBe("offline-pending-changes");
      // the owner stays editable
      expect(model.getters.isReadonly()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test("a fully synchronized client is not flagged and clears its storage", async () => {
    localStorage.clear();
    const data = emptyData();
    // default (working) in-memory transport: edits are acknowledged immediately
    const model = new Model(data, { client: { id: "solo", name: "Solo" } });
    const { store } = makeStoreWithModel(model, LocalRevisionPersistenceStore);
    await store.whenReady;

    setCellContent(model, "A1", "synced");
    await store.flushPersist();

    expect(store.isDisconnected).toBe(false);
    const storageKey = await hashToStorageKey(data.uuid!);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  test("does nothing when crypto is unavailable", async () => {
    localStorage.clear();
    const realCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues: realCrypto.getRandomValues.bind(realCrypto) },
    });
    try {
      const data = emptyData();
      const model = offlineModel(data);
      const { store } = makeStoreWithModel(model, LocalRevisionPersistenceStore);
      await store.whenReady;

      setCellContent(model, "A1", "x");
      await store.flushPersist();

      expect(store.isDisconnected).toBe(false);
      expect(localStorage.length).toBe(0);
    } finally {
      Object.defineProperty(globalThis, "crypto", { configurable: true, value: realCrypto });
    }
  });
});
