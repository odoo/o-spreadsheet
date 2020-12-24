import { Model } from "../../src/model";
import { MockNetwork } from "../__mocks__/network";
import "../jest_extend";
import { DistributedCollaborativeSession } from "../../src/ot/collaborative_session";
interface CollaborativeEnv {
  network: MockNetwork;
  alice: Model;
  bob: Model;
  charly: Model;
}

export function setupCollaborativeEnv(): CollaborativeEnv {
  const network = new MockNetwork();
  const emptySheetData = new Model().exportData();
  const alice = new Model(emptySheetData, {
    collaborativeSession: new DistributedCollaborativeSession(network, {
      id: "alice",
      name: "Alice",
    }),
  });
  const bob = new Model(emptySheetData, {
    collaborativeSession: new DistributedCollaborativeSession(network, { id: "bob", name: "Bob" }),
  });
  const charly = new Model(emptySheetData, {
    collaborativeSession: new DistributedCollaborativeSession(network, {
      id: "charly",
      name: "Charly",
    }),
  });
  return { network, alice, bob, charly };
}
