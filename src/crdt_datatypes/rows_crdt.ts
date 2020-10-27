import * as Y from "yjs";
import { Row, Cell, Col } from "../types";
import { createCellsCRDT } from "./cells";

export function createRowsCRDT(rows: Row[]): Y.Array<Y.Map<any>> {
  const crdt = new Y.Array<Y.Map<any>>();
  // batch insertion
  while (rows.length) {
    crdt.push(
      rows.splice(0, 1000).map((row) => {
        const rowCRDT = new Y.Map();
        rowCRDT.set("start", row.start);
        rowCRDT.set("end", row.end);
        rowCRDT.set("name", row.name);
        rowCRDT.set("size", row.size);
        rowCRDT.set("cells", createCellsCRDT(row.cells));
        return rowCRDT;
      })
    );
    console.log(rows.length, "rows remaining");
  }
  return crdt;
}

export function createColsCRDT(cols: Col[]): Y.Array<Y.Map<any>> {
  const crdt = new Y.Array<Y.Map<any>>();
  // batch insertion
  while (cols.length) {
    crdt.push(
      cols.splice(0, 1000).map((col) => {
        const colCRDT = new Y.Map();
        colCRDT.set("start", col.start);
        colCRDT.set("end", col.end);
        colCRDT.set("name", col.name);
        colCRDT.set("size", col.size);
        return colCRDT;
      })
    );
    console.log(cols.length, "cols remaining");
  }
  return crdt;
}

export class RowEntity implements Row {
  constructor(private rowCRDT: Y.Map<any>) {}

  get start(): number {
    return this.rowCRDT.get("start");
  }

  set start(value) {
    this.rowCRDT.set("start", value);
  }

  get end(): number {
    return this.rowCRDT.get("end");
  }

  set end(value) {
    this.rowCRDT.set("end", value);
  }

  get name(): string {
    return this.rowCRDT.get("name");
  }

  set name(value) {
    this.rowCRDT.set("name", value);
  }

  get size(): number {
    return this.rowCRDT.get("size");
  }

  set size(value) {
    this.rowCRDT.set("size", value);
  }

  get cells(): { [col: number]: Cell } {
    return this.rowCRDT.get("cells").toJSON();
  }

  set cells(value: { [col: number]: Cell }) {
    // is it needed?
    this.rowCRDT.set("cells", createCellsCRDT(value));
  }
}
