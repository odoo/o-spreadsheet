import { Model } from "../../src/model";
import { MockNetwork } from "../__mocks__/network";

interface CollaborativeEnv {
  network: MockNetwork;
  alice: Model;
  bob: Model;
  charly: Model;
}

export function setupCollaborativeEnv(): CollaborativeEnv {
  const network = new MockNetwork();
  const emptySheetData = new Model().exportData();
  const alice = new Model(emptySheetData, { network, userId: "alice" });
  const bob = new Model(emptySheetData, { network, userId: "bob" });
  const charly = new Model(emptySheetData, { network, userId: "charly" });
  return { network, alice, bob, charly };
}
