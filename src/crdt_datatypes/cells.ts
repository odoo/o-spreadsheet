import * as Y from "yjs";
import { Cell } from "../types";

export function createCellsCRDT(cells: { [key: string]: Cell }) {
  const crdt = new Y.Map();
  for (let [key, cell] of Object.entries(cells)) {
    crdt.set(key.toString(), cell);
  }
  return crdt;
}
