import { Model } from "../../src/model";
import { MockTransportService } from "../__mocks__/transport_service";
import "../jest_extend";
import { CollaborativeSession } from "../../src/collaborative/collaborative_session";
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
    collaborativeSession: new CollaborativeSession(network, {
      id: "alice",
      name: "Alice",
    }),
  });
  const bob = new Model(emptySheetData, {
    collaborativeSession: new CollaborativeSession(network, { id: "bob", name: "Bob" }),
  });
  const charly = new Model(emptySheetData, {
    collaborativeSession: new CollaborativeSession(network, {
      id: "charly",
      name: "Charly",
    }),
  });
  return { network, alice, bob, charly };
}
