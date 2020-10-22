import * as Y from "yjs";
import { Sheet, Cell, CompiledFormula, SheetData, UID } from "../types";
import { Header, Row } from "../types";

class CRDTCell extends Y.Map<any> implements Cell {
  get col(): number {
    this;
    return this.get("col");
  }

  set col(value) {
    this.set("id", value);
  }

  get row(): number {
    return this.get("col");
  }

  set row(value) {
    this.set("row", value);
  }

  get xc(): string {
    return this.get("xc");
  }

  set xc(value) {
    this.set("xc", value);
  }

  get error(): string | undefined {
    return this.get("error");
  }

  set error(value) {
    this.set("error", value);
  }

  get pending(): boolean | undefined {
    return this.get("pending");
  }

  set pending(value) {
    this.set("pending", value);
  }

  get value(): any {
    return this.get("value");
  }

  set value(value) {
    this.set("value", value);
  }

  get formula(): CompiledFormula | undefined {
    return this.get("formula");
  }

  set formula(value) {
    this.set("formula", value);
  }

  get async(): boolean {
    return this.get("async");
  }

  set async(value) {
    this.set("async", value);
  }

  get type(): "formula" | "text" | "number" | "date" {
    return this.get("type");
  }

  set type(value) {
    this.set("type", value);
  }
}
class CRDTSheet extends Y.Map<any> implements Sheet {
  constructor(sheet: SheetData) {
    super(undefined);
    // super(Object.entries(Object.assign({}, sheet, {
    //   cells: new Y.Map<CRDTCell>()
    // })));
    this.set("id", sheet.id);
    this.set("name", sheet.name);
    this.set("colNumber", sheet.colNumber);
    this.set("rowNumber", sheet.rowNumber);
    this.set("cells", new Y.Map<CRDTCell>()); // set cells here
    this.set("rows", sheet.rows);
    this.set("cols", sheet.cols);
    this.misc = sheet;
  }

  private misc = {} as any;

  get id(): string {
    return this.get("id");
    // return this.misc.id;
  }

  set id(value) {
    // this.misc.id = value;
    this.set("id", value);
  }

  get name(): string {
    // return this.misc.name;
    return this.get("name");
  }

  set name(value) {
    // this.misc.name = value;
    this.set("name", value);
  }

  get cells(): { [key: string]: Cell } {
    // return this.misc.cells;
    return this.get("cells").toJSON();
  }

  set cells(value) {
    // this.misc.cells = value;
    this.set("cells", value);
  }

  get colNumber(): number {
    // return this.misc.colNumber;
    return this.get("colNumber");
  }

  set colNumber(value) {
    // this.misc.colNumber = value;
    this.set("colNumber", value);
  }

  get rowNumber(): number {
    // return this.misc.rowNumber;
    return this.get("rowNumber");
  }

  set rowNumber(value) {
    // this.misc.rowNumber = value;
    this.set("rowNumber", value);
  }

  get cols(): Header[] {
    // return this.misc.cols || [];
    return this.get("cols");
  }

  set cols(value) {
    // this.misc.cols = value;
    this.set("cols", value);
  }

  get rows(): Row[] {
    // return this.misc.rows || [];
    return this.get("rows");
  }

  set rows(value) {
    // this.misc.rows = value;
    this.set("rows", value);
  }

  updateCell(xc: string, cell: Cell) {
    const currentRows: Row[] = this.get("rows");
    // const currentRows = this.misc.rows;
    // this.history.update(["sheets", sheetId, "rows", row, "cells", col], undefined);
    currentRows[cell.row].cells[cell.col] = cell;
    this.set("rows", [...currentRows]);
    this.get("cells").set(xc, cell);
    // this.misc.cells[xc] = cell;
  }

  resetCell(xc: string) {
    const currentRows: Row[] = this.get("rows");
    // const currentRows: Row[] = this.misc.rows;
    // this.history.update(["sheets", sheetId, "rows", row, "cells", col], undefined);
    const cell = this.get("cells").get("xc");
    delete currentRows[cell.row].cells[cell.col];
    this.set("rows", [...currentRows]);
    this.get("cells").delete(xc);
    // delete this.misc.cells[xc];
  }
}

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
  private doc = new Y.Doc();

  get sheets(): Y.Map<Sheet> {
    return this.doc.getMap("sheets");
  }

  private sendCommand: (data) => Promise<void>;
  constructor(sendCommand: (data) => Promise<void>) {
    this.sendCommand = sendCommand;
    this.doc.on("updateV2", (update: Uint8Array) => {
      // console.log("update", this.sendCommand);
      this.sendCommand(update);
    });
  }

  crdtReceived(data: Uint8Array) {
    debugger;
    Y.applyUpdateV2(this.doc, data);
    debugger;
  }

  get ids(): UID[] {
    return [...this.sheets.keys()];
  }

  get(sheetId: UID): Sheet | undefined {
    return new Proxy(this.sheets.get(sheetId) || {}, {
      get: function(target: Map<string, any>, prop) {
        return target.get(prop.toString())
      },
      set: function(target: Map<string, any>, prop, value) {
        target.set(prop.toString(), value)
        return true
      },
    }) as Sheet | undefined
  }

  addSheet(sheetData: SheetData): Sheet {
    const sheet = new CRDTSheet(sheetData);
    this.sheets.set(sheetData.id, sheet);
    return sheet;
  }

  toObject(): Record<UID, Sheet> {
    return this.sheets.toJSON();
  }

  import(changes) {
    this.doc = new Y.Doc();
    Y.applyUpdateV2(this.doc, changes);
    console.log(this.sheets.toJSON());
  }

  getState() {
    console.log(this.sheets.toJSON());
    return Y.encodeStateAsUpdateV2(this.doc);
  }
}
