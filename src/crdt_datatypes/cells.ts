import * as Y from "yjs";
import { Cell } from "../types";

export type CellCRDT = Y.Map<any>;

export function createCellsCRDT(cells: { [key: string]: Cell }): Y.Map<CellCRDT> {
  const crdt = new Y.Map<CellCRDT>();
  for (let [key, cell] of Object.entries(cells)) {
    crdt.set(key.toString(), createCellCRDT(cell));
  }
  return crdt;
}

export function createCellCRDT(cell: Cell): CellCRDT {
  const crdt = new Y.Map();
  for (let [key, value] of Object.entries(cell)) {
    // TODO fix evaluation
    if (key !== "formula" && value !== undefined) {
      crdt.set(key, value);
    }
  }
  return crdt;
}
