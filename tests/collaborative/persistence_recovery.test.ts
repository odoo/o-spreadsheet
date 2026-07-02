import { ClientDisconnectedError, Model } from "../../src";
import { StateUpdateMessage } from "../../src/types/collaborative/transport_service";
import { MockTransportService } from "../__mocks__/transport_service";
import { addColumns, setCellContent } from "../test_helpers/commands_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";

/**
 * Build the pending messages a client accumulates while editing offline: a
 * model whose sends are rejected keeps its local revisions queued. The result
 * is round-tripped through JSON to mimic (de)serialization from localStorage.
 */
function makeOfflinePendingMessages(data: any, edit: (model: Model) => void): StateUpdateMessage[] {
  const offlineNetwork = new MockTransportService();
  // Only revision sends fail while offline (these are caught + re-queued by the
  // session); client-position messages resolve so they don't leak as unhandled
  // rejections from `move()`.
  offlineNetwork.sendMessage = (message) => {
    if (
      message.type === "REMOTE_REVISION" ||
      message.type === "REVISION_UNDONE" ||
      message.type === "REVISION_REDONE"
    ) {
      return Promise.reject(new ClientDisconnectedError("offline"));
    }
    return Promise.resolve();
  };
  const offlineModel = new Model(data, {
    transportService: offlineNetwork,
    client: { id: "alice-offline", name: "Alice" },
  });
  edit(offlineModel);
  return JSON.parse(JSON.stringify(offlineModel.getters.getPendingRevisions()));
}

describe("disconnected changes recovery", () => {
  test("a disconnected edit is queued while offline", () => {
    const data = new Model().exportData();
    const pending = makeOfflinePendingMessages(data, (m) => setCellContent(m, "A1", "offline"));
    expect(pending).toHaveLength(1);
    expect(pending[0].type).toBe("REMOTE_REVISION");
  });

  test("recovers a disconnected edit and converges with the peer", () => {
    const data = new Model().exportData();
    const pending = makeOfflinePendingMessages(data, (m) =>
      setCellContent(m, "A1", "offline edit")
    );

    const network = new MockTransportService();
    const bob = new Model(data, { transportService: network, client: { id: "bob", name: "Bob" } });

    // A "reloaded" client starts from the current server state and replays the
    // persisted queue with a fresh clientId.
    const alice = new Model(bob.exportData(), {
      transportService: network,
      client: { id: "alice", name: "Alice" },
    });
    alice.recoverPendingMessages(pending);

    // (a) the edit is re-applied locally
    expect(getCellContent(alice, "A1")).toBe("offline edit");
    // (b) it is re-sent and both clients converge
    expect(getCellContent(bob, "A1")).toBe("offline edit");
    expect([alice, bob]).toHaveSynchronizedExportedData();
  });

  test("recovers multiple disconnected edits in order", () => {
    const data = new Model().exportData();
    const pending = makeOfflinePendingMessages(data, (m) => {
      setCellContent(m, "A1", "first");
      setCellContent(m, "A2", "second");
    });
    expect(pending).toHaveLength(2);

    const network = new MockTransportService();
    const bob = new Model(data, { transportService: network, client: { id: "bob", name: "Bob" } });
    const alice = new Model(bob.exportData(), {
      transportService: network,
      client: { id: "alice", name: "Alice" },
    });
    alice.recoverPendingMessages(pending);

    expect(getCellContent(bob, "A1")).toBe("first");
    expect(getCellContent(bob, "A2")).toBe("second");
    expect([alice, bob]).toHaveSynchronizedExportedData();
  });

  test("converges when the peer made a conflicting edit before recovery", () => {
    const data = new Model().exportData();
    const pending = makeOfflinePendingMessages(data, (m) =>
      setCellContent(m, "B1", "offline edit")
    );

    const network = new MockTransportService();
    const bob = new Model(data, { transportService: network, client: { id: "bob", name: "Bob" } });
    // The peer inserts a column while the other client is offline; this advances
    // the server, and the change is baked into the state the client reloads from.
    addColumns(bob, "before", "A", 1);

    const alice = new Model(bob.exportData(), {
      transportService: network,
      client: { id: "alice", name: "Alice" },
    });
    alice.recoverPendingMessages(pending);

    // Convergence is the operational-transform guarantee: both clients end up
    // with the same state and the recovered content survives.
    expect([alice, bob]).toHaveSynchronizedExportedData();
    expect(getCellContent(alice, "B1")).toBe("offline edit");
    expect(getCellContent(bob, "B1")).toBe("offline edit");
  });

  test("recovered edits can be undone locally", () => {
    const data = new Model().exportData();
    const pending = makeOfflinePendingMessages(data, (m) =>
      setCellContent(m, "A1", "offline edit")
    );

    const network = new MockTransportService();
    const bob = new Model(data, { transportService: network, client: { id: "bob", name: "Bob" } });
    const alice = new Model(bob.exportData(), {
      transportService: network,
      client: { id: "alice", name: "Alice" },
    });
    alice.recoverPendingMessages(pending);

    expect(alice.getters.canUndo()).toBe(true);
    alice.dispatch("REQUEST_UNDO");
    expect(getCellContent(alice, "A1")).toBe("");
    expect([alice, bob]).toHaveSynchronizedExportedData();
  });
});
