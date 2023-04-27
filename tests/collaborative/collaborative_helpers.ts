import { deepCopy } from "../../src/helpers";
import { Model } from "../../src/model";
import { MockTransportService } from "../__mocks__/transport_service";
interface CollaborativeEnv {
  network: MockTransportService;
  alice: Model;
  bob: Model;
  charlie: Model;
}

/**
 * Create a spreadsheet model which is edited by three users Alice, Bob and Charlie
 * at the same time.
 *
 * There's a bias in the order of messages: when multiple commands are
 * dispatched concurrently by different users, Alice will receive messages
 * first, meaning she will also resend her pending messages first.
 * Similarly, Bob's messages are resent before Charlie's.
 */
export function setupCollaborativeEnv(): CollaborativeEnv {
  const network = new MockTransportService();
  const emptySheetData = new Model().exportData();
  const alice = new Model(deepCopy(emptySheetData), {
    transportService: network,
    client: { id: "alice", name: "Alice" },
  });
  const bob = new Model(deepCopy(emptySheetData), {
    transportService: network,
    client: { id: "bob", name: "Bob" },
  });
  const charlie = new Model(deepCopy(emptySheetData), {
    transportService: network,
    client: { id: "charlie", name: "Charlie" },
  });
  return { network, alice, bob, charlie };
}
