import { Model } from "../../src/model";
import "../jest_extend";
import { MockTransportService } from "../__mocks__/transport_service";
interface CollaborativeEnv {
  network: MockTransportService;
  alice: Model;
  bob: Model;
  charly: Model;
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
  const charly = new Model(emptySheetData, {
    transportService: network,
    client: { id: "charly", name: "Charly" },
  });
  return { network, alice, bob, charly };
}
