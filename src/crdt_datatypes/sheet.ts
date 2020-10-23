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
class CRDTSheet extends Y.Map<any> {
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
  }

  // get id(): string {
  //   return this.get("id");
  //   // return this.misc.id;
  // }

  // set id(value) {
  //   // this.misc.id = value;
  //   this.set("id", value);
  // }

  // get name(): string {
  //   // return this.misc.name;
  //   return this.get("name");
  // }

  // set name(value) {
  //   // this.misc.name = value;
  //   this.set("name", value);
  // }

  // get cells(): { [key: string]: Cell } {
  //   // return this.misc.cells;
  //   return this.get("cells").toJSON();
  // }

  // set cells(value) {
  //   // this.misc.cells = value;
  //   this.set("cells", value);
  // }

  // get colNumber(): number {
  //   // return this.misc.colNumber;
  //   return this.get("colNumber");
  // }

  // set colNumber(value) {
  //   // this.misc.colNumber = value;
  //   this.set("colNumber", value);
  // }

  // get rowNumber(): number {
  //   // return this.misc.rowNumber;
  //   return this.get("rowNumber");
  // }

  // set rowNumber(value) {
  //   // this.misc.rowNumber = value;
  //   this.set("rowNumber", value);
  // }

  // get cols(): Header[] {
  //   // return this.misc.cols || [];
  //   return this.get("cols");
  // }

  // set cols(value) {
  //   // this.misc.cols = value;
  //   this.set("cols", value);
  // }

  // get rows(): Row[] {
  //   // return this.misc.rows || [];
  //   return this.get("rows");
  // }

  // set rows(value) {
  //   // this.misc.rows = value;
  //   this.set("rows", value);
  // }

  // updateCell(xc: string, cell: Cell) {
  //   const currentRows: Row[] = this.get("rows");
  //   // const currentRows = this.misc.rows;
  //   // this.history.update(["sheets", sheetId, "rows", row, "cells", col], undefined);
  //   currentRows[cell.row].cells[cell.col] = cell;
  //   this.set("rows", [...currentRows]);
  //   this.get("cells").set(xc, cell);
  //   // this.misc.cells[xc] = cell;
  // }

  // resetCell(xc: string) {
  //   const currentRows: Row[] = this.get("rows");
  //   // const currentRows: Row[] = this.misc.rows;
  //   // this.history.update(["sheets", sheetId, "rows", row, "cells", col], undefined);
  //   const cell = this.get("cells").get("xc");
  //   delete currentRows[cell.row].cells[cell.col];
  //   this.set("rows", [...currentRows]);
  //   this.get("cells").delete(xc);
  //   // delete this.misc.cells[xc];
  // }
}
class SheetEntity implements Sheet {
  constructor(private sheetCRDT: Y.Map<any>) {}

  get id(): string {
    return this.sheetCRDT.get("id");
  }

  set id(value) {
    this.sheetCRDT.set("id", value);
  }

  get name(): string {
    return this.sheetCRDT.get("name");
  }

  set name(value) {
    this.sheetCRDT.set("name", value);
  }

  get cells(): { [key: string]: Cell } {
    // wrap in entity object
    return this.sheetCRDT.get("cells").toJSON();
  }

  set cells(value) {
    this.sheetCRDT.set("cells", value);
  }

  get colNumber(): number {
    return this.sheetCRDT.get("colNumber");
  }

  set colNumber(value) {
    this.sheetCRDT.set("colNumber", value);
  }

  get rowNumber(): number {
    return this.sheetCRDT.get("rowNumber");
  }

  set rowNumber(value) {
    this.sheetCRDT.set("rowNumber", value);
  }

  get cols(): Header[] {
    return this.sheetCRDT.get("cols");
  }

  set cols(value) {
    this.sheetCRDT.set("cols", value);
  }

  get rows(): Row[] {
    return this.sheetCRDT.get("rows");
  }

  set rows(value) {
    this.sheetCRDT.set("rows", value);
  }

  updateCell(xc: string, cell: Cell) {
    const currentRows: Row[] = this.sheetCRDT.get("rows");
    currentRows[cell.row].cells[cell.col] = cell;
    this.sheetCRDT.set("rows", [...currentRows]);
    this.sheetCRDT.get("cells").set(xc, cell);
  }

  resetCell(xc: string) {
    const currentRows: Row[] = this.sheetCRDT.get("rows");
    const cell = this.sheetCRDT.get("cells").get("xc");
    delete currentRows[cell.row].cells[cell.col];
    this.sheetCRDT.set("rows", [...currentRows]);
    this.sheetCRDT.get("cells").delete(xc);
  }
}

export class CRDTSheets {
  private doc = new Y.Doc();
  private syncing: boolean = false;

  get sheets(): Y.Map<Y.Map<any>> {
    return this.doc.getMap("sheets");
  }

  constructor(private sendCommand: (data) => Promise<void>) {
    this.sendCommand = sendCommand;
    this.subscribeToUpdates();
  }

  crdtReceived(data: Uint8Array) {
    this.syncing = true;
    Y.applyUpdateV2(this.doc, data);
    this.syncing = false;
  }

  get ids(): UID[] {
    return [...this.sheets.keys()];
  }

  get(sheetId: UID): Sheet | undefined {
    const sheetCRDT = this.sheets.get(sheetId);
    return sheetCRDT ? new SheetEntity(sheetCRDT) : undefined;
  }

  addSheet(sheetData: SheetData) {
    const sheet = new CRDTSheet(sheetData);
    this.sheets.set(sheetData.id, sheet);
    // return sheet;
  }

  toObject(): Record<UID, Sheet> {
    return this.sheets.toJSON();
  }

  import(changes) {
    this.doc = new Y.Doc();
    Y.applyUpdateV2(this.doc, changes);
    this.subscribeToUpdates();
    console.log(this.sheets.toJSON());
  }

  getState() {
    console.log(this.sheets.toJSON());
    return Y.encodeStateAsUpdateV2(this.doc);
  }

  private subscribeToUpdates() {
    this.doc.on("updateV2", (update: Uint8Array) => {
      console.log("update!!!!!!!!!!!!!!!", this.sendCommand);
      if (!this.syncing) {
        this.sendCommand(update);
      }
    });
  }
}
