// import * as Y from "yjs";
import * as Automerge from "automerge";
import { Sheet, SheetData, UID } from "../types";
// import { Header, Row } from "../types";

// class CRDTCell extends Y.Map<any> implements Cell {
//   get col(): number {
//     this;
//     return this.get("col");
//   }

//   set col(value) {
//     this.set("id", value);
//   }

//   get row(): number {
//     return this.get("col");
//   }

//   set row(value) {
//     this.set("row", value);
//   }

//   get xc(): string {
//     return this.get("xc");
//   }

//   set xc(value) {
//     this.set("xc", value);
//   }

//   get error(): string | undefined {
//     return this.get("error");
//   }

//   set error(value) {
//     this.set("error", value);
//   }

//   get pending(): boolean | undefined {
//     return this.get("pending");
//   }

//   set pending(value) {
//     this.set("pending", value);
//   }

//   get value(): any {
//     return this.get("value");
//   }

//   set value(value) {
//     this.set("value", value);
//   }

//   get formula(): CompiledFormula | undefined {
//     return this.get("formula");
//   }

//   set formula(value) {
//     this.set("formula", value);
//   }

//   get async(): boolean {
//     return this.get("async");
//   }

//   set async(value) {
//     this.set("async", value);
//   }

//   get type(): "formula" | "text" | "number" | "date" {
//     return this.get("type");
//   }

//   set type(value) {
//     this.set("type", value);
//   }
// }
// class CRDTSheet extends Y.Map<any> implements Sheet {
//   constructor(sheet: SheetData) {
//     super(undefined);
//     // super(Object.entries(Object.assign({}, sheet, {
//     //   cells: new Y.Map<CRDTCell>()
//     // })));
//     this.set("id", sheet.id);
//     this.set("name", sheet.name);
//     this.set("cells", new Y.Map<CRDTCell>()); // set cells here
//     this.set("colNumber", sheet.colNumber);
//     this.set("rowNumber", sheet.rowNumber);
//     this.set("rows", sheet.rows);
//     this.set("cols", sheet.cols);
//   }

//   get id(): string {
//     return this.get("id");
//   }

//   set id(value) {
//     this.set("id", value);
//   }

//   get name(): string {
//     return this.get("name");
//   }

//   set name(value) {
//     this.set("name", value);
//   }

//   get cells(): { [key: string]: Cell } {
//     // debugger
//     return this.get("cells").toJSON();
//   }

//   set cells(value) {
//     this.set("cells", value);
//   }

//   get colNumber(): number {
//     return this.get("colNumber");
//   }

//   set colNumber(value) {
//     this.set("colNumber", value);
//   }

//   get rowNumber(): number {
//     return this.get("rowNumber");
//   }

//   set rowNumber(value) {
//     this.set("rowNumber", value);
//   }

//   get cols(): Header[] {
//     return this.get("cols");
//   }

//   set cols(value) {
//     this.set("cols", value);
//   }

//   get rows(): Row[] {
//     return this.get("rows");
//   }

//   set rows(value) {
//     this.set("rows", value);
//   }

//   updateCell(xc: string, cell: Cell) {
//     const currentRows: Row[] = this.get("rows");
//     // this.history.update(["sheets", sheetId, "rows", row, "cells", col], undefined);
//     currentRows[cell.row].cells[cell.col] = cell;
//     // this.set("rows", [...currentRows])
//     this.get("cells").set(xc, cell);
//   }

//   resetCell(xc: string) {
//     const currentRows: Row[] = this.get("rows");
//     // this.history.update(["sheets", sheetId, "rows", row, "cells", col], undefined);
//     const cell = this.get("cells").get("xc");
//     delete currentRows[cell.row].cells[cell.col];
//     // this.set("rows", [...currentRows])
//     this.get("cells").delete(xc);
//   }
// }

// const sheet: Sheet = new CRDTSheet({
//   id: "42",
//   name: "sheet",
//   colNumber: 10,
//   rowNumber: 10,
//   cols: [],
//   rows: [],
//   cells: {}
// })

export class CRDTSheets {
  // private doc = new Y.Doc();
  private doc = Automerge.from({ sheets: {} });
  // private sheets = this.doc.getMap("sheets") as Y.Map<Sheet>;

  // private sendCommand: (data) => Promise<void>;
  // constructor(sendCommand: (data) => Promise<void>) {
  //   this.sendCommand = sendCommand;
  //   this.doc.on("updateV2", (update: Uint8Array) => {
  //     console.log("update", this.sendCommand);
  //     this.sendCommand(update);
  //   });
  // }

  // crdtReceived(data: Uint8Array) {
  //   debugger;
  //   Y.applyUpdateV2(this.doc, data);
  //   debugger;
  // }

  crdtReceived(changes) {
    this.doc = Automerge.applyChanges(this.doc, changes);
    debugger;
  }

  get ids(): UID[] {
    return [...Object.keys(this.doc.sheets)];
    // return [...this.sheets.keys()];
  }

  get(sheetId: UID): Sheet | undefined {
    return this.doc.sheets[sheetId];
  }

  addSheet(sheetData: SheetData): Sheet {
    this.doc = Automerge.change(this.doc, "Add a new sheet", (doc) => {
      doc.sheets[sheetData.id] = sheetData;
    });
    return this.doc.sheets[sheetData.id];
  }

  getDoc() {
    return this.doc;
  }

  getChanges(doc) {
    return Automerge.getChanges(doc, this.doc);
  }

  toObject() {
    return this.doc.sheets;
  }

  // toObject(): Record<UID, Sheet> {
  //   return this.sheets.toJSON();
  // }
}
