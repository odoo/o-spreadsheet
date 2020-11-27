import { Model } from "../../src/model";
import "../jest_extend";
import { MockTransportService } from "../__mocks__/transport_service";
interface CollaborativeEnv {
  network: MockTransportService;
  alice: Model;
  bob: Model;
  charlie: Model;
}

export function setupCollaborativeEnv(): CollaborativeEnv {
  const network = new MockTransportService();
  const emptySheetData = new Model().exportData();
  const alice = new Model(emptySheetData, {
    transportService: network,
    client: { id: "alice", name: "Alice" },
  });
  const bob = new Model(emptySheetData, {
    transportService: network,
    client: { id: "bob", name: "Bob" },
  });
  const charlie = new Model(emptySheetData, {
    transportService: network,
    client: { id: "charlie", name: "Charlie" },
  });
  return { network, alice, bob, charlie };
}
