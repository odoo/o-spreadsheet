import * as Y from "yjs";
import { uuidv4 } from "../helpers/index";
import { Sheet, Cell, SheetData, UID } from "../types";
import { Header, Row } from "../types";
import { createCellsCRDT } from "./cells";
import { RowEntity, createRowsCRDT } from "./rows_crdt";

class SheetEntity implements Sheet {
  private _cells: Y.Map<any>;
  private _rows: Y.Array<any>;

  constructor(private sheetCRDT: Y.Map<any>) {
    this._cells = this.sheetCRDT.get("cells");
    this._rows = this.sheetCRDT.get("rows");
  }

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
    // slow
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
    return this.sheetCRDT
      .get("rows")
      .toArray()
      .map((rowCRDT) => new RowEntity(rowCRDT));
  }

  set rows(value) {
    // not needed
    this.sheetCRDT.set("rows", createRowsCRDT(value));
  }

  getCell(xc: string): Cell | null {
    return this._cells.get(xc) || null;
  }

  *getCells(): Generator<Cell> {
    for (let [, cell] of this.sheetCRDT.get("cells")) {
      yield cell;
    }
  }

  updateCell(xc: string, cell: Cell) {
    const currentRows = this._rows;
    currentRows.get(cell.row).get("cells").set(cell.col.toString(), cell);
    this._cells.set(xc, cell);
  }

  resetCell(xc: string) {
    // TODO also delete in rows
    this.sheetCRDT.get("cells").delete(xc);
  }
}

export class CRDTSheets {
  public doc = new Y.Doc();
  // @ts-ignore
  private undoManager: Y.UndoManager;
  private syncing: boolean = false;
  public uuid: UID = uuidv4();

  private get sheets(): Y.Map<Y.Map<any>> {
    return this.doc.getMap("sheets");
  }

  constructor(private sendCommand: (data) => Promise<void>) {
    this.sendCommand = sendCommand;
    this.initUndoManager();
  }

  initUndoManager() {
    this.undoManager = new Y.UndoManager(this.sheets, {
      captureTimeout: 500,
      trackedOrigins: new Set([this.uuid]),
    });
  }

  undo() {
    this.undoManager.undo();
  }

  redo() {
    this.undoManager.redo();
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
    sheet.set("cells", createCellsCRDT(sheetData.cells));
    sheet.set("rows", createRowsCRDT(sheetData.rows));
    sheet.set("cols", sheetData.cols);
    this.sheets.set(sheetData.id, sheet);
  }

  toObject(): Record<UID, Sheet> {
    return this.sheets.toJSON();
  }

  import(changes) {
    console.time("import");
    this.doc = new Y.Doc();
    Y.applyUpdateV2(this.doc, changes);
    this.initUndoManager();
    console.timeEnd("import");
    this.subscribeToUpdates();
    console.log(this.sheets.toJSON());
  }

  getState() {
    console.log(this.sheets.toJSON());
    return Y.encodeStateAsUpdateV2(this.doc);
  }

  private subscribeToUpdates() {
    this.doc.on("updateV2", (update: Uint8Array) => {
      if (!this.syncing) {
        this.sendCommand(update);
      }
    });
  }
}
