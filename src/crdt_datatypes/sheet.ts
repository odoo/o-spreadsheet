import * as Y from "yjs";
import { Sheet, Cell, SheetData, UID } from "../types";
import { Header, Row } from "../types";
import { createCellsCRDT } from "./cells";
import { RowEntity, createRowsCRDT } from "./rows_crdt";

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
    if (!this.sheetCRDT.get("rows").toArray) {
      debugger;
    }
    return this.sheetCRDT
      .get("rows")
      .toArray()
      .map((rowCRDT) => new RowEntity(rowCRDT));
  }

  set rows(value) {
    // not needed
    debugger;
    this.sheetCRDT.set("rows", createRowsCRDT(value));
  }

  updateCell(xc: string, cell: Cell) {
    const currentRows = this.sheetCRDT.get("rows");
    // currentRows[cell.row].cells[cell.col] = cell;
    currentRows.get(cell.row.toString()).get("cells").set(cell.col.toString(), cell);
    // this.sheetCRDT.set("rows", [...currentRows]);
    // this.sheets.get('12345').get('rows').get(0).get('cells').toJSON()
    this.sheetCRDT.get("cells").set(xc, cell);
  }

  resetCell(xc: string) {
    // TODO delete in rows
    // const currentRows: Row[] = this.sheetCRDT.get("rows");
    // const cell = this.sheetCRDT.get("cells").get("xc");
    // delete currentRows[cell.row].cells[cell.col];
    // this.sheetCRDT.set("rows", [...currentRows]);
    this.sheetCRDT.get("cells").delete(xc);
  }
}

export class CRDTSheets {
  private doc = new Y.Doc();
  private syncing: boolean = false;

  private get sheets(): Y.Map<Y.Map<any>> {
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
    const sheet = new Y.Map();
    sheet.set("id", sheetData.id);
    sheet.set("name", sheetData.name);
    sheet.set("colNumber", sheetData.colNumber);
    sheet.set("rowNumber", sheetData.rowNumber);
    sheet.set("cells", createCellsCRDT(sheetData.cells)); // set cells here
    // sheet.set("rows", sheetData.rows);
    sheet.set("rows", createRowsCRDT(sheetData.rows));
    sheet.set("cols", sheetData.cols);
    this.sheets.set(sheetData.id, sheet);
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
