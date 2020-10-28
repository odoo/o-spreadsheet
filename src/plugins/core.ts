import * as Y from "yjs";

import { BasePlugin } from "../base_plugin";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { compile, rangeTokenize } from "../formulas/index";
import { cellReference } from "../formulas/parser";
import { formatDateTime, InternalDate, parseDateTime } from "../functions/dates";
import {
  formatNumber,
  formatStandardNumber,
  isNumber,
  numberToLetters,
  parseNumber,
  getUnquotedSheetName,
  toCartesian,
  toXC,
  toZone,
  mapCellsInZone,
  getComposerSheetName,
} from "../helpers/index";
import { _lt } from "../translation";
import {
  CancelledReason,
  Cell,
  CellData,
  Col,
  Command,
  CommandResult,
  HeaderData,
  Row,
  Sheet,
  ImportSheetData,
  SheetData,
  WorkbookData,
  Zone,
  RenameSheetCommand,
  UID,
  Getters,
  CommandDispatcher,
} from "../types/index";
import { WHistory } from "../history";
import { ModelConfig } from "../model";
import { CRDTRepository } from "../crdt_datatypes/repository";
import { createColsCRDT, createRowsCRDT } from "../crdt_datatypes/rows_crdt";
import { createCellsCRDT } from "../crdt_datatypes/cells";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");
const MIN_PADDING = 3;

// interface Test2 {
//   testsub1: string;
//   testsub2: number;
// }

// interface CoreState {
//   testProp1: string;
//   testProp2: number;
//   testProp3: Test2;
//   testProp4: { [xc: string]: number };
// }

export interface CoreState {
  sheetIds: Y.Map<UID>;
  cells: Y.Array<Cell>;
  showFormulas: boolean;
  visibleSheets: Y.Array<UID>;
}

// /**
//  * Repository Global: => role est de s'occuper du transfert des données, de l'écoute d'update
//  *  - CorePlugin: CoreRepository
//  *  - GridPlugin: GridRepository
//  */

// interface Repository<State> {
//   // Son role c'est de gerer toutes les données de Core Plugin (getters, setters, ...)
//   // Il n'y a que lui qui a la connaissance des CRDTS
//   // Découple le stockage de l'état de la logique business dans les plugins

//   set<T extends keyof State>(key: T, value: State[T]): void;
//   set<T extends keyof State, X extends keyof State[T]>(key: T, key2: X, value: State[T][X]): void;

//   get<T extends keyof State>(key: T): State[T];
// }

class CoreRepository extends CRDTRepository<CoreState> {
  setIdToSheetname(name: string, id: UID) {
    this.state.get("sheetIds").set(name, id);
  }
  deleteSheetName(name: string) {
    this.state.get("sheetIds").delete(name);
  }
  getSheetIdByName(name: string): UID {
    return this.state.get("sheetIds").get(name);
  }
  isFormulasShown(): boolean {
    return this.state.get("showFormulas");
  }
  getSheetMapping(): { [name: string]: UID } {
    return this.state.get("sheetIds").toJSON();
  }
  getVisibleSheets(): UID[] {
    return this.state.get("visibleSheets").toArray();
  }
  insertVisibleSheet(index: number, sheetId: UID) {
    this.state.get("visibleSheets").insert(index, [sheetId]);
  }
  deleteVisibleSheet(index: number) {
    this.state.get("visibleSheets").delete(index);
  }
  pushVisibleSheet(sheetId: UID) {
    this.state.get("visibleSheets").push([sheetId]);
  }

  setColNumber(sheetId: UID, colNumber: number) {
    this.state.get("sheets").get(sheetId).set("colNumber", colNumber);
  }
  getColNumber(sheetId: UID) {
    return this.state.get("sheets").get(sheetId).get("colNumber");
  }
  setRowNumber(sheetId: UID, rowNumber: number) {
    this.state.get("sheets").get(sheetId).set("rowNumber", rowNumber);
  }
  getRowNumber(sheetId: UID) {
    return this.state.get("sheets").get(sheetId).get("rowNumber");
  }
  getSheetName(sheetId: UID) {
    return this.state.get("sheets").get(sheetId).get("name");
  }
  getSheet(sheetId: UID): Sheet {
    return this.state.get("sheets").get(sheetId).toJSON();
  }
  getAllSheets(): Record<UID, Sheet> {
    return this.state.get("sheets").toJSON();
  }
  getCol(sheetId: UID, index: number): Col {
    return this.state.get("sheets").get(sheetId).get("cols").get(index.toString()).toJSON();
  }
  setColSize(sheetId: UID, index: number, size: number) {
    this.state.get("sheets").get(sheetId).get("cols").get(index).set("size", size);
  }
  setColStart(sheetId: UID, index: number, start: number) {
    this.state.get("sheets").get(sheetId).get("cols").get(index).set("start", start);
  }
  setColEnd(sheetId: UID, index: number, end: number) {
    this.state.get("sheets").get(sheetId).get("cols").get(index).set("end", end);
  }
  setCols(sheetId: UID, cols: Col[]) {
    const sheet = this.state.get("sheets").get(sheetId);
    sheet.set("cols", createColsCRDT(cols));
  }
  getCols(sheetId: UID): Col[] {
    return this.state
      .get("sheets")
      .get(sheetId)
      .get("cols")
      .toArray()
      .map((col) => col.toJSON());
  }
  getRow(sheetId: UID, index: number): Row {
    return this.state.get("sheets").get(sheetId).get("rows").get(index).toJSON();
  }
  getLastRowEnd(sheetId: UID): number {
    const rows = this.state.get("sheets").get(sheetId).get("rows");
    return rows.get(rows.length - 1).get("end");
  }
  getLastColEnd(sheetId: UID): number {
    const cols = this.state.get("sheets").get(sheetId).get("cols");
    return cols.get(cols.length - 1).get("end");
  }
  setRows(sheetId: UID, rows: Row[]) {
    const sheet = this.state.get("sheets").get(sheetId);
    sheet.set("rows", createRowsCRDT(rows));
  }

  getCell(sheetId: UID, col: number, row: number): Cell | null {
    return this.state
      .get("sheets")
      .get(sheetId)
      .get("rows")
      .get(row.toString())
      .get("cells")
      .get(col.toString());
  }

  *getCells(sheetId: UID): Generator<Cell> {
    for (let [, cell] of this.state.get("sheets").get(sheetId).get("cells")) {
      yield cell.toJSON();
    }
  }
  getRows(sheetId: UID): Row[] {
    return this.state
      .get("sheets")
      .get(sheetId)
      .get("rows")
      .toArray()
      .map((row) => row.toJSON());
  }
  setRowSize(sheetId: UID, index: number, size: number) {
    this.state.get("sheets").get(sheetId).get("rows").get(index).set("size", size);
  }
  setRowStart(sheetId: UID, index: number, start: number) {
    this.state.get("sheets").get(sheetId).get("rows").get(index).set("start", start);
  }
  setRowEnd(sheetId: UID, index: number, end: number) {
    this.state.get("sheets").get(sheetId).get("rows").get(index).set("end", end);
  }

  resetCell(sheetId: UID, xc: string) {
    const row = toCartesian(xc)[1];
    this.state.get("sheets").get(sheetId).get("cells").delete(xc);
    this.state.get("sheets").get(sheetId).get("rows").get(row.toString()).get("cells").delete(xc);
  }

  updateCell(sheetId: UID, cell: Cell) {
    this.state.get("sheets").get(sheetId).get("cells").set(cell.xc, cell);
    this.state
      .get("sheets")
      .get(sheetId)
      .get("rows")
      .get(cell.row.toString())
      .get("cells")
      .set(cell.col.toString(), cell);
  }

  deleteSheet(sheetId: UID) {
    this.state.get("sheets").delete(sheetId);
  }

  addSheet(sheetData: SheetData) {
    const sheet = new Y.Map();
    sheet.set("id", sheetData.id);
    sheet.set("name", sheetData.name);
    sheet.set("colNumber", sheetData.colNumber);
    sheet.set("rowNumber", sheetData.rowNumber);
    sheet.set("cells", createCellsCRDT(sheetData.cells));
    sheet.set("rows", createRowsCRDT(sheetData.rows));
    sheet.set("cols", createColsCRDT(sheetData.cols));
    this.state.get("sheets").set(sheetData.id, sheet);
  }
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CorePlugin extends BasePlugin {
  static getters = [
    "applyOffset",
    "getColsZone",
    "getRowsZone",
    "getCell",
    "getCellText",
    "zoneToXC",
    "getActiveSheetId",
    "getActiveSheet",
    "getSheetName",
    "getSheet",
    "getSheetIdByName",
    "getSheets",
    "getVisibleSheets",
    "getEvaluationSheets",
    "getCol",
    "getCols",
    "getRows",
    "getRow",
    "getCells",
    "getColCells",
    "getGridSize",
    "shouldShowFormulas",
    "getRangeValues",
    "getRangeFormattedValues",
  ];

  protected repository: CoreRepository;
  private activeSheetId: UID = (null as unknown) as UID;

  constructor(
    crdt: any,
    getters: Getters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(crdt, getters, history, dispatch, config);
    // this.repository = new CoreModel(this.repository.get("CorePlugin"));
    this.repository = new CoreRepository(crdt, "CorePlugin");
    this.repository.set("cells", new Y.Array<Cell>());
    this.repository.set("sheetIds", new Y.Map<UID>());
    this.repository.set("showFormulas", false);
    this.repository.set("visibleSheets", new Y.Array<UID>());
    this.repository.set("sheets", new Y.Map<any>()); // TODO interface
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "REMOVE_COLUMNS":
        return this.repository.getColNumber(cmd.sheetId) > cmd.columns.length
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.NotEnoughColumns };
      case "REMOVE_ROWS":
        return this.repository.getRowNumber(cmd.sheetId) > cmd.rows.length
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.NotEnoughRows };
      case "CREATE_SHEET":
      case "DUPLICATE_SHEET":
        return !cmd.name ||
          !this.repository
            .getVisibleSheets()
            .find((id) => this.repository.getSheetName(id) === cmd.name)
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
      case "MOVE_SHEET":
        const currentIndex = this.repository
          .getVisibleSheets()
          .findIndex((id) => id === cmd.sheetId);
        if (currentIndex === -1) {
          return { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
        }
        return (cmd.direction === "left" && currentIndex === 0) ||
          (cmd.direction === "right" &&
            currentIndex === this.repository.getVisibleSheets().length - 1)
          ? { status: "CANCELLED", reason: CancelledReason.WrongSheetMove }
          : { status: "SUCCESS" };
      case "RENAME_SHEET":
        return this.isRenameAllowed(cmd);
      case "DELETE_SHEET_CONFIRMATION":
      case "DELETE_SHEET":
        return this.repository.getVisibleSheets().length > 1
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.NotEnoughSheets };
      default:
        return { status: "SUCCESS" };
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.activeSheetId = cmd.sheetIdTo;
        // if (this.historizeActiveSheet) {
        //   this.history42.update(["activeSheet"], this.sheets.get(cmd.sheetIdTo)!);
        // } else {
        //   this.activeSheet = this.sheets.get(cmd.sheetIdTo)!;
        // }
        break;
      case "CREATE_SHEET":
        const sheet = this.createSheet(
          cmd.sheetId,
          cmd.name || this.generateSheetName(),
          cmd.cols || 26,
          cmd.rows || 100
        );
        this.repository.setIdToSheetname(this.repository.getSheetName(sheet), sheet);
        if (cmd.activate) {
          this.dispatch("ACTIVATE_SHEET", {
            sheetIdFrom: this.getters.getActiveSheetId(),
            sheetIdTo: sheet,
          });
        }
        break;
      case "MOVE_SHEET":
        this.moveSheet(cmd.sheetId, cmd.direction);
        break;
      case "RENAME_SHEET":
        if (cmd.interactive) {
          this.interactiveRenameSheet(cmd.sheetId, _lt("Rename Sheet"));
        } else {
          this.renameSheet(cmd.sheetId, cmd.name!);
        }
        break;
      case "DUPLICATE_SHEET":
        this.duplicateSheet(cmd.sheetIdFrom, cmd.sheetIdTo, cmd.name);
        break;
      case "DELETE_SHEET_CONFIRMATION":
        this.interactiveDeleteSheet(cmd.sheetId);
        break;
      case "DELETE_SHEET":
        this.deleteSheet(cmd.sheetId);
        break;
      case "DELETE_CONTENT":
        this.clearZones(cmd.sheetId, cmd.target);
        break;
      case "SET_VALUE":
        const [col, row] = toCartesian(cmd.xc);
        this.dispatch("UPDATE_CELL", {
          sheetId: cmd.sheetId ? cmd.sheetId : this.getters.getActiveSheetId(),
          col,
          row,
          content: cmd.text,
        });
        break;
      case "UPDATE_CELL":
        this.updateCell(cmd.sheetId, cmd.col, cmd.row, cmd);
        break;
      case "CLEAR_CELL":
        this.dispatch("UPDATE_CELL", {
          sheetId: cmd.sheetId,
          col: cmd.col,
          row: cmd.row,
          content: "",
          border: 0,
          style: 0,
          format: "",
        });
        break;
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(col);
          if (size !== 0) {
            this.setColSize(cmd.sheetId, col, size + 2 * MIN_PADDING);
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let col of cmd.rows) {
          const size = this.getRowMaxHeight(col);
          if (size !== 0) {
            this.setRowSize(cmd.sheetId, col, size + 2 * MIN_PADDING);
          }
        }
        break;
      case "RESIZE_COLUMNS":
        for (let col of cmd.cols) {
          this.setColSize(cmd.sheetId, col, cmd.size);
        }
        break;
      case "RESIZE_ROWS":
        for (let row of cmd.rows) {
          this.setRowSize(cmd.sheetId, row, cmd.size);
        }
        break;
      case "REMOVE_COLUMNS":
        this.removeColumns(cmd.sheetId, cmd.columns);
        const newColNumber = this.repository.getColNumber(cmd.sheetId) - cmd.columns.length;
        this.repository.setColNumber(cmd.sheetId, newColNumber);
        break;
      case "REMOVE_ROWS":
        this.removeRows(cmd.sheetId, cmd.rows);
        const newRowNumber = this.repository.getRowNumber(cmd.sheetId) - cmd.rows.length;
        this.repository.setRowNumber(cmd.sheetId, newRowNumber);
        break;
      case "ADD_COLUMNS": {
        this.addColumns(cmd.sheetId, cmd.column, cmd.position, cmd.quantity);
        const newColNumber = this.repository.getColNumber(cmd.sheetId) + cmd.quantity;
        this.repository.setColNumber(cmd.sheetId, newColNumber);
        break;
      }
      case "ADD_ROWS": {
        this.addRows(cmd.sheetId, cmd.row, cmd.position, cmd.quantity);
        const newRowNumber = this.repository.getRowNumber(cmd.sheetId) + cmd.quantity;
        this.repository.setRowNumber(cmd.sheetId, newRowNumber);
        break;
      }
      case "SET_FORMULA_VISIBILITY":
        this.repository.set("showFormulas", cmd.show);
        break;
    }
  }

  get activeSheet(): Sheet {
    return this.repository.getSheet(this.activeSheetId);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  applyOffset(formula: string, offsetX: number, offsetY: number): string {
    return rangeTokenize(formula)
      .map((t) => {
        if (t.type === "SYMBOL" && cellReference.test(t.value)) {
          const [xcs, sheetName] = t.value.split("!").reverse();
          const sheetId = this.getSheetIdByName(sheetName);
          if (xcs.includes(":")) {
            return this.updateRange(xcs, offsetX, offsetY, sheetId);
          }
          return this.updateReference(xcs, offsetX, offsetY, sheetId);
        }
        return t.value;
      })
      .join("");
  }

  getCell(col: number, row: number): Cell | null {
    return this.repository.getCell(this.activeSheetId, col, row);
  }

  getCellText(cell: Cell): string {
    const value = this.repository.get("showFormulas") ? cell.content : cell.value;
    const shouldFormat = (value || value === 0) && cell.format && !cell.error && !cell.pending;
    const dateTimeFormat = shouldFormat && cell.format!.match(/y|m|d|:/);
    const numberFormat = shouldFormat && !dateTimeFormat;
    switch (typeof value) {
      case "string":
        return value;
      case "boolean":
        return value ? "TRUE" : "FALSE";
      case "number":
        if (dateTimeFormat) {
          return formatDateTime({ value } as InternalDate, cell.format);
        }
        if (numberFormat) {
          return formatNumber(value, cell.format!);
        }
        return formatStandardNumber(value);
      case "object":
        if (dateTimeFormat) {
          return formatDateTime(value as InternalDate, cell.format);
        }
        if (numberFormat) {
          return formatNumber(value.value, cell.format!);
        }
        if (value && value.format!.match(/y|m|d|:/)) {
          return formatDateTime(value);
        }
        return "0";
    }
    return value.toString();
  }

  /**
   * Converts a zone to a XC coordinate system
   *
   * The conversion also treats merges as one single cell
   *
   * Examples:
   * {top:0,left:0,right:0,bottom:0} ==> A1
   * {top:0,left:0,right:1,bottom:1} ==> A1:B2
   *
   * if A1:B2 is a merge:
   * {top:0,left:0,right:1,bottom:1} ==> A1
   * {top:1,left:0,right:1,bottom:2} ==> A1:B3
   *
   * if A1:B2 and A4:B5 are merges:
   * {top:1,left:0,right:1,bottom:3} ==> A1:A5
   */
  zoneToXC(zone: Zone): string {
    zone = this.getters.expandZone(zone);
    const topLeft = toXC(zone.left, zone.top);
    const botRight = toXC(zone.right, zone.bottom);
    if (
      topLeft != botRight &&
      this.getters.getMainCell(topLeft) !== this.getters.getMainCell(botRight)
    ) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  /**
   * Returns the id (not the name) of the currently active sheet
   */
  getActiveSheetId(): UID {
    return this.activeSheetId;
  }

  getActiveSheet(): Sheet {
    return this.repository.getSheet(this.activeSheetId);
  }

  getSheet(sheetId: UID): Sheet {
    return this.repository.getSheet(sheetId);
  }

  getSheetName(sheetId: UID): string | undefined {
    return this.repository.getSheetName(sheetId);
  }

  getSheetIdByName(name: string | undefined): UID | undefined {
    return name && this.repository.getSheetIdByName(name);
  }

  getSheets(): Sheet[] {
    return this.repository.getVisibleSheets().map((id) => this.repository.getSheet(id));
  }

  getVisibleSheets(): UID[] {
    return this.repository.getVisibleSheets();
  }

  getEvaluationSheets(): Record<UID, Sheet> {
    return this.repository.getAllSheets();
  }

  getCells(): Generator<Cell> {
    return this.repository.getCells(this.activeSheetId);
  }

  getCol(sheetId: UID, index: number): Col {
    return this.repository.getCol(sheetId, index);
  }

  getRow(sheetId: UID, index: number): Row {
    return this.repository.getRow(sheetId, index);
  }

  getCols(sheetId: UID): Col[] {
    return this.repository.getCols(sheetId);
  }

  getRows(sheetId: UID): Row[] {
    return this.repository.getRows(sheetId);
  }

  /**
   * Returns all the cells of a col
   */
  getColCells(col: number): Cell[] {
    return this.repository
      .getRows(this.activeSheetId)
      .reduce((acc: Cell[], cur) => (cur.cells[col] ? acc.concat(cur.cells[col]) : acc), []);
  }

  getColsZone(start: number, end: number): Zone {
    return {
      top: 0,
      bottom: this.repository.getRowNumber(this.activeSheetId) - 1,
      left: start,
      right: end,
    };
  }

  getRowsZone(start: number, end: number): Zone {
    return {
      top: start,
      bottom: end,
      left: 0,
      right: this.repository.getColNumber(this.activeSheetId) - 1,
    };
  }

  getGridSize(): [number, number] {
    const height = this.repository.getLastRowEnd(this.activeSheetId) + DEFAULT_CELL_HEIGHT + 5;
    const width = this.repository.getLastColEnd(this.activeSheetId) + DEFAULT_CELL_WIDTH;
    return [width, height];
  }

  shouldShowFormulas(): boolean {
    return this.repository.isFormulasShown();
  }

  getRangeValues(reference: string, defaultSheetId: UID): any[][] {
    const [range, sheetName] = reference.split("!").reverse();
    const sheetId = sheetName ? this.repository.getSheetIdByName(sheetName) : defaultSheetId;
    return mapCellsInZone(toZone(range), this.repository.getSheet(sheetId), (cell) => cell.value);
  }

  getRangeFormattedValues(reference: string, defaultSheetId: UID): string[][] {
    const [range, sheetName] = reference.split("!").reverse();
    const sheetId = sheetName ? this.repository.getSheetIdByName(sheetName) : defaultSheetId;
    return mapCellsInZone(
      toZone(range),
      this.repository.getSheet(sheetId),
      this.getters.getCellText,
      ""
    );
  }

  // ---------------------------------------------------------------------------
  // Row/Col manipulation
  // ---------------------------------------------------------------------------

  private getColMaxWidth(index: number): number {
    const cells = this.activeSheet.rows.reduce(
      (acc: Cell[], cur) => (cur.cells[index] ? acc.concat(cur.cells[index]) : acc),
      []
    );
    const sizes = cells.map(this.getters.getCellWidth);
    return Math.max(0, ...sizes);
  }

  private getRowMaxHeight(index: number): number {
    const cells = Object.values(this.activeSheet.rows[index].cells);
    const sizes = cells.map(this.getters.getCellHeight);
    return Math.max(0, ...sizes);
  }

  private setColSize(sheetId: UID, index: number, size: number) {
    const cols = this.repository.getCols(sheetId);
    const col = cols[index];
    const delta = size - col.size;
    this.repository.setColSize(sheetId, index, size);
    this.repository.setColEnd(sheetId, index, col.end + delta);
    for (let i = index + 1; i < cols.length; i++) {
      const col = cols[i];
      this.repository.setColStart(sheetId, i, col.start + delta);
      this.repository.setColEnd(sheetId, i, col.end + delta);
    }
  }

  private setRowSize(sheetId: UID, index: number, size: number) {
    const rows = this.repository.getRows(sheetId);
    const row = rows[index];
    const delta = size - row.size;
    this.repository.setRowSize(sheetId, index, size);
    this.repository.setRowEnd(sheetId, index, row.end + delta);
    for (let i = index + 1; i < rows.length; i++) {
      const row = rows[i];
      this.repository.setRowStart(sheetId, i, row.start + delta);
      this.repository.setRowEnd(sheetId, i, row.end + delta);
    }
  }

  /**
   * Delete column. This requires a lot of handling:
   * - Update all the formulas in all sheets
   * - Move the cells
   * - Update the cols/rows (size, number, (cells), ...)
   * - Reevaluate the cells
   *
   * @param sheetId ID of the sheet on which deletion should be applied
   * @param columns Columns to delete
   */
  private removeColumns(sheetId: UID, columns: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    columns.sort((a, b) => b - a);
    for (let column of columns) {
      // Update all the formulas.
      this.updateColumnsFormulas(column, -1, sheetId);

      // Move the cells.
      this.moveCellsHorizontally(column, -1, sheetId);

      // Effectively delete the element and recompute the left-right.
      this.manageColumnsHeaders(column, -1, sheetId);
    }
  }

  /**
   * Delete row. This requires a lot of handling:
   * - Update the merges
   * - Update all the formulas in all sheets
   * - Move the cells
   * - Update the cols/rows (size, number, (cells), ...)
   * - Reevaluate the cells
   *
   * @param sheetId ID of the sheet on which deletion should be applied
   * @param rows Rows to delete
   */
  private removeRows(sheetId: UID, rows: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    rows.sort((a, b) => b - a);

    const consecutiveRows = rows.reduce((groups, currentRow, index, rows) => {
      if (currentRow - rows[index - 1] === -1) {
        const lastGroup = groups[groups.length - 1];
        lastGroup.push(currentRow);
      } else {
        groups.push([currentRow]);
      }
      return groups;
    }, [] as number[][]);

    for (let group of consecutiveRows) {
      // Update all the formulas.
      this.updateRowsFormulas(group[0], -group.length, sheetId);

      // Move the cells.
      this.moveCellVerticallyBatched(group[group.length - 1], group[0], sheetId);

      // Effectively delete the element and recompute the left-right/top-bottom.
      group.map((row) => this.processRowsHeaderDelete(row, sheetId));
    }
  }

  private addColumns(sheetId: UID, column: number, position: "before" | "after", quantity: number) {
    // Update all the formulas.
    this.updateColumnsFormulas(position === "before" ? column - 1 : column, quantity, sheetId);

    // Move the cells.
    this.moveCellsHorizontally(position === "before" ? column : column + 1, quantity, sheetId);

    // Recompute the left-right/top-bottom.
    this.manageColumnsHeaders(column, quantity, sheetId);
  }

  private addRows(sheetId: UID, row: number, position: "before" | "after", quantity: number) {
    for (let i = 0; i < quantity; i++) {
      this.addEmptyRow();
    }
    // Update all the formulas.
    this.updateRowsFormulas(position === "before" ? row - 1 : row, quantity, sheetId);

    // Move the cells.
    this.moveCellsVertically(position === "before" ? row : row + 1, quantity, sheetId);

    // Recompute the left-right/top-bottom.
    this.processRowsHeaderAdd(row, quantity);
  }

  private moveCellsHorizontally(base: number, step: number, sheetId: UID) {
    return this.processCellsToMove(
      (cell) => cell.col >= base,
      (cell) => cell.col !== base || step !== -1,
      (cell) => {
        return {
          type: "UPDATE_CELL",
          sheetId: sheetId,
          col: cell.col + step,
          row: cell.row,
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format,
        };
      },
      sheetId
    );
  }

  /**
   * Move all the cells that are from the row under `deleteToRow` up to `deleteFromRow`
   *
   * b.e.
   * move vertically with delete from 3 and delete to 5 will first clear all the cells from lines 3 to 5,
   * then take all the row starting at index 6 and add them back at index 3
   *
   * @param deleteFromRow the row index from which to start deleting
   * @param deleteToRow the row index until which the deleting must continue
   * @param the sheet from which to remove
   */
  private moveCellVerticallyBatched(deleteFromRow: number, deleteToRow: number, sheetId: UID) {
    return this.processCellsToMove(
      ({ row }) => row >= deleteFromRow,
      ({ row }) => row > deleteToRow,
      (cell) => {
        return {
          type: "UPDATE_CELL",
          sheetId,
          col: cell.col,
          row: cell.row - (deleteToRow - deleteFromRow + 1),
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format,
        };
      },
      sheetId
    );
  }

  private moveCellsVertically(base: number, step: number, sheetId: UID) {
    return this.processCellsToMove(
      (cell) => cell.row >= base,
      (cell) => cell.row !== base || step !== -1,
      (cell) => {
        return {
          type: "UPDATE_CELL",
          sheetId: sheetId,
          col: cell.col,
          row: cell.row + step,
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format,
        };
      },
      sheetId
    );
  }

  private manageColumnsHeaders(base: number, step: number, sheetId: UID) {
    const cols: Col[] = [];
    let start = 0;
    let colIndex = 0;
    const sheet = this.repository.getSheet(sheetId);
    for (let i in sheet.cols) {
      if (parseInt(i, 10) === base) {
        if (step !== -1) {
          const { size } = sheet.cols[colIndex];
          for (let a = 0; a < step; a++) {
            cols.push({
              name: numberToLetters(colIndex),
              size,
              start,
              end: start + size,
            });
            start += size;
            colIndex++;
          }
        } else {
          continue;
        }
      }
      const { size } = sheet.cols[i];
      cols.push({
        name: numberToLetters(colIndex),
        size,
        start,
        end: start + size,
      });
      start += size;
      colIndex++;
    }
    this.repository.setCols(sheetId, cols);
  }

  private processRowsHeaderDelete(index: number, sheetId: UID) {
    const rows: Row[] = [];
    let start = 0;
    let rowIndex = 0;
    const sheet = this.repository.getSheet(sheetId);
    const cellsQueue = sheet.rows.map((row) => row.cells);
    for (let i in sheet.rows) {
      const row = sheet.rows[i];
      const { size } = row;
      if (parseInt(i, 10) === index) {
        continue;
      }
      rowIndex++;
      rows.push({
        start,
        end: start + size,
        size,
        cells: cellsQueue.shift()!,
        name: String(rowIndex),
      });
      start += size;
    }
    this.repository.setRows(sheetId, rows);
  }

  private processRowsHeaderAdd(index: number, quantity: number) {
    const rows: Row[] = [];
    let start = 0;
    let rowIndex = 0;
    let sizeIndex = 0;
    const cellsQueue = this.activeSheet.rows.map((row) => row.cells);
    for (let i in this.activeSheet.rows) {
      const { size } = this.activeSheet.rows[sizeIndex];
      if (parseInt(i, 10) < index || parseInt(i, 10) >= index + quantity) {
        sizeIndex++;
      }
      rowIndex++;
      rows.push({
        start,
        end: start + size,
        size,
        cells: cellsQueue.shift()!,
        name: String(rowIndex),
      });
      start += size;
    }
    this.repository.setRows(this.getActiveSheetId(), rows);
  }

  private addEmptyRow() {
    const lastEnd = this.activeSheet.rows[this.activeSheet.rows.length - 1].end;
    const name = (this.activeSheet.rows.length + 1).toString();
    const newRows: Row[] = this.activeSheet.rows.slice();
    const size = 0;
    newRows.push({
      start: lastEnd,
      end: lastEnd + size,
      size,
      name,
      cells: {},
    });
    this.repository.setRows(this.getActiveSheetId(), newRows);
  }

  private updateColumnsFormulas(base: number, step: number, sheetId: UID) {
    return this.visitFormulas(
      this.repository.getSheet(sheetId).name,
      (value: string, sheet: string | undefined): string => {
        if (value.includes(":")) {
          return this.updateColumnsRange(value, sheet, base, step);
        }
        return this.updateColumnsRef(value, sheet, base, step);
      }
    );
  }

  private updateRowsFormulas(base: number, step: number, sheetId: UID) {
    return this.visitFormulas(
      this.repository.getSheet(sheetId).name,
      (value: string, sheet: string | undefined): string => {
        if (value.includes(":")) {
          return this.updateRowsRange(value, sheet, base, step);
        }
        return this.updateRowsRef(value, sheet, base, step);
      }
    );
  }

  private processCellsToMove(
    shouldDelete: (cell: Cell) => boolean,
    shouldAdd: (cell: Cell) => boolean,
    buildCellToAdd: (cell: Cell) => Command,
    sheetId: UID
  ) {
    const deleteCommands: Command[] = [];
    const addCommands: Command[] = [];

    const sheet = this.repository.getSheet(sheetId);

    for (let cell of Object.values(sheet.cells)) {
      if (shouldDelete(cell)) {
        const [col, row] = [cell.col, cell.row];
        deleteCommands.push({
          type: "CLEAR_CELL",
          sheetId: sheet.id,
          col,
          row,
        });
        if (shouldAdd(cell)) {
          addCommands.push(buildCellToAdd(cell));
        }
      }
    }
    for (let cmd of deleteCommands) {
      this.dispatch(cmd.type, cmd);
    }
    for (let cmd of addCommands) {
      this.dispatch(cmd.type, cmd);
    }
  }
  // ---------------------------------------------------------------------------
  // Cells
  // ---------------------------------------------------------------------------

  private updateCell(sheetId: UID, col: number, row: number, data: CellData) {
    const current = this.repository.getCell(sheetId, col, row);
    const xc = (current && current.xc) || toXC(col, row);
    const hasContent = "content" in data;

    // Compute the new cell properties
    const dataContent = data.content ? data.content.replace(nbspRegexp, "") : "";
    let content = hasContent ? dataContent : (current && current.content) || "";
    const style = "style" in data ? data.style : (current && current.style) || 0;
    const border = "border" in data ? data.border : (current && current.border) || 0;
    let format = "format" in data ? data.format : (current && current.format) || "";

    // if all are empty, we need to delete the underlying cell object
    if (!content && !style && !border && !format) {
      if (current) {
        // todo: make this work on other sheets
        // this.history42.update(["sheets", sheetId, "cells", xc], undefined);
        this.repository.resetCell(sheetId, xc);
        // this.history42.update(["sheets", sheetId, "rows", row, "cells", col], undefined);
      }
      return;
    }

    // compute the new cell value
    const didContentChange =
      (!current && dataContent) || (hasContent && current && current.content !== dataContent);
    let cell: Cell;
    if (current && !didContentChange) {
      cell = { col, row, xc, content, value: current.value, type: current.type };
      if (cell.type === "formula") {
        cell.error = current.error;
        cell.pending = current.pending;
        cell.formula = current.formula;
        if (current.async) {
          cell.async = true;
        }
      }
    } else {
      // the current content cannot be reused, so we need to recompute the
      // derived values
      let type: Cell["type"] = content[0] === "=" ? "formula" : "text";
      let value: Cell["value"] = content;
      if (isNumber(content)) {
        value = parseNumber(content);
        type = "number";
        if (content.includes("%")) {
          format = content.includes(".") ? "0.00%" : "0%";
        }
      }
      let date = parseDateTime(content);
      if (date) {
        type = "date";
        value = date;
        content = formatDateTime(date);
      }
      const contentUpperCase = content.toUpperCase();
      if (contentUpperCase === "TRUE") {
        value = true;
      }
      if (contentUpperCase === "FALSE") {
        value = false;
      }
      cell = { col, row, xc, content, value, type };
      if (cell.type === "formula") {
        cell.error = undefined;
        try {
          cell.formula = compile(content, sheetId, this.repository.getSheetMapping(), xc);
          cell.async = cell.formula.async;
        } catch (e) {
          cell.value = "#BAD_EXPR";
          cell.error = _lt("Invalid Expression");
        }
      }
    }
    if (style) {
      cell.style = style;
    }
    if (border) {
      cell.border = border;
    }
    if (format) {
      cell.format = format;
    }
    // todo: make this work on other sheets
    // this.history42.update(["sheets", sheetId, "cells", xc], cell);
    this.repository.updateCell(sheetId, cell);
    // this.history42.update(["sheets", sheetId, "rows", row, "cells", col], cell);
  }

  private generateSheetName(): string {
    let i = 1;
    const names = this.getSheets().map((s) => s.name);
    const baseName = _lt("Sheet");
    let name = `${baseName}${i}`;
    while (names.includes(name)) {
      name = `${baseName}${i}`;
      i++;
    }
    return name;
  }

  private createSheet(id: UID, name: string, cols: number, rows: number): string {
    const sheet: SheetData = {
      id,
      name,
      cells: {},
      colNumber: cols,
      rowNumber: rows,
      cols: createDefaultCols(cols),
      rows: createDefaultRows(rows),
    };
    const visibleSheets = this.repository.getVisibleSheets();
    const index = visibleSheets.findIndex((id) => this.getters.getActiveSheetId() === id);
    this.repository.insertVisibleSheet(index + 1, sheet.id);
    this.repository.addSheet(sheet);
    // this.history42.update(["sheets"], Object.assign({}, sheets, { [sheet.id]: sheet }));
    return sheet.id;
  }

  private moveSheet(sheetId: UID, direction: "left" | "right") {
    const visibleSheets = this.repository.getVisibleSheets();
    const currentIndex = visibleSheets.findIndex((id) => id === sheetId);
    this.repository.deleteVisibleSheet(currentIndex);
    this.repository.insertVisibleSheet(currentIndex + (direction === "left" ? -1 : 1), sheetId);
  }

  private isRenameAllowed(cmd: RenameSheetCommand): CommandResult {
    if (cmd.interactive) {
      return { status: "SUCCESS" };
    }
    const name = cmd.name && cmd.name.trim().toLowerCase();
    if (!name) {
      return { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
    }
    return this.repository
      .getVisibleSheets()
      .findIndex((id) => this.repository.getSheetName(id).toLowerCase() === name) === -1
      ? { status: "SUCCESS" }
      : { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
  }

  private interactiveRenameSheet(sheetId: UID, title: string) {
    const placeholder = this.getSheetName(sheetId)!;
    this.ui.editText(title, placeholder, (name: string | null) => {
      if (!name) {
        return;
      }
      const result = this.dispatch("RENAME_SHEET", { sheetId: sheetId, name });
      const sheetName = this.getSheetName(sheetId);
      if (result.status === "CANCELLED" && sheetName !== name) {
        this.interactiveRenameSheet(sheetId, _lt("Please enter a valid sheet name"));
      }
    });
  }

  private renameSheet(sheetId: UID, name: string) {
    const sheet = this.repository.getSheet(sheetId);
    const oldName = sheet.name;
    // this.history42.update(["sheets", sheetId, "name"], name.trim());
    // const sheetIds = Object.assign({}, this.sheetIds);
    // sheetIds[name] = sheet.id;
    // delete sheetIds[oldName];
    // this.history42.update(["sheetIds"], sheetIds);
    this.repository.setIdToSheetname(sheet.id, name.trim());
    this.repository.deleteSheetName(oldName);
    this.visitAllFormulasSymbols((value: string) => {
      let [val, sheetRef] = value.split("!").reverse();
      if (sheetRef) {
        sheetRef = getUnquotedSheetName(sheetRef);
        if (sheetRef === oldName) {
          if (val.includes(":")) {
            return this.updateRange(val, 0, 0, sheet.id);
          }
          return this.updateReference(val, 0, 0, sheet.id);
        }
      }
      return value;
    });
  }

  private duplicateSheet(fromId: UID, toId: UID, toName: string) {
    const sheet = this.repository.getSheet(fromId);
    const newSheet = JSON.parse(JSON.stringify(sheet));
    newSheet.id = toId;
    newSheet.name = toName;
    const visibleSheets = this.repository.getVisibleSheets();
    const currentIndex = visibleSheets.findIndex((id) => id === fromId);
    this.repository.insertVisibleSheet(currentIndex + 1, newSheet.id);
    this.repository.addSheet(newSheet);
    this.repository.set("sheetIds", newSheet.name, newSheet.id);
    this.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.getters.getActiveSheetId(),
      sheetIdTo: toId,
    });
  }

  private interactiveDeleteSheet(sheetId: UID) {
    this.ui.askConfirmation(_lt("Are you sure you want to delete this sheet ?"), () => {
      this.dispatch("DELETE_SHEET", { sheetId: sheetId });
    });
  }

  private deleteSheet(sheetId: UID) {
    const name = this.repository.getSheetName(sheetId);
    this.repository.deleteSheet(sheetId);

    const visibleSheets = this.repository.getVisibleSheets();
    const currentIndex = visibleSheets.findIndex((id) => id === sheetId);
    this.repository.deleteVisibleSheet(currentIndex);

    // const sheetIds = Object.assign({}, this.sheetIds);
    // delete sheetIds[name];
    // this.history42.update(["sheetIds"], sheetIds);
    this.repository.deleteSheetName(name);
    this.visitAllFormulasSymbols((value: string) => {
      let [, sheetRef] = value.split("!").reverse();
      if (sheetRef) {
        sheetRef = getUnquotedSheetName(sheetRef);
        if (sheetRef === name) {
          return "#REF";
        }
      }
      return value;
    });
    if (this.getActiveSheetId() === sheetId) {
      this.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: sheetId,
        sheetIdTo: visibleSheets[Math.max(0, currentIndex - 1)],
      });
    }
  }

  private clearZones(sheetId: UID, zones: Zone[]) {
    // TODO: get cells from the actual sheet
    const cells = this.getters.getCells();
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const xc = toXC(col, row);
          if (xc in cells) {
            this.dispatch("UPDATE_CELL", {
              sheetId: sheetId,
              content: "",
              col,
              row,
            });
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Cols/Rows addition/deletion offsets manipulation
  // ---------------------------------------------------------------------------

  /**
   * Update a reference by applying an offset to the column
   *
   * @param ref Reference to update
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added or -1 if removed
   */
  private updateColumnsRef = (
    ref: string,
    sheetId: UID | undefined,
    base: number,
    step: number
  ): string => {
    let x = toCartesian(ref)[0];
    if (x === base && step === -1) {
      return "#REF";
    }
    return this.updateReference(ref, x > base ? step : 0, 0, this.getSheetIdByName(sheetId), false);
  };

  /**
   * Update a part of a range by appling an offset. If the current column is
   * removed, adapt the range accordingly
   *
   * @param ref Reference to update
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added or -1 if removed
   * @param direction 1 if it's the left part, -1 if it's the right part
   */
  private updateColumnsRangePart = (
    ref: string,
    sheetId: UID | undefined,
    base: number,
    step: number,
    direction: number
  ): string => {
    let [x, y] = toCartesian(ref);
    if (x === base && step === -1) {
      x += direction;
    }
    const [xcRef] = this.updateColumnsRef(toXC(x, y), sheetId, base, step).split("!").reverse();
    return xcRef;
  };

  /**
   * Update a full range by appling an offset.
   *
   * @param ref Reference to update
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added or -1 if removed
   */
  private updateColumnsRange = (
    ref: string,
    sheetId: UID | undefined,
    base: number,
    step: number
  ): string => {
    let [left, right] = ref.split(":");
    left = this.updateColumnsRangePart(left, sheetId, base, step, 1);
    right = this.updateColumnsRangePart(right, sheetId, base, step, -1);
    if (left === "#REF" || right === "#REF") {
      return "#REF";
    }
    const columnLeft = toCartesian(left)[0];
    const columnRight = toCartesian(right)[0];
    if (columnLeft > columnRight) {
      return "#REF";
    }
    if (left === right) {
      return left;
    }
    const range = `${left}:${right}`;
    return sheetId ? `${sheetId}!${range}` : range;
  };

  /**
   * Update a reference by applying an offset to the row
   *
   * @param ref Reference to update
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added or -1 if removed
   */
  private updateRowsRef = (
    ref: string,
    sheetId: UID | undefined,
    base: number,
    step: number
  ): string => {
    let y = toCartesian(ref)[1];
    if (base + step < y && y <= base) {
      return "#REF";
    }
    return this.updateReference(ref, 0, y > base ? step : 0, this.getSheetIdByName(sheetId), false);
  };

  /**
   * Update a part of a range by appling an offset. If the current row is
   * removed, adapt the range accordingly
   *
   * @param ref Reference to update
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added/removed (negative when removed)
   * @param direction 1 if it's the left part, -1 if it's the right part
   */
  private updateRowsRangePart = (
    value: string,
    sheetId: UID | undefined,
    base: number,
    step: number,
    direction: number
  ): string => {
    let [x, y] = toCartesian(value);
    if (base + step < y && y <= base) {
      if (direction === -1) {
        y = Math.max(base, y) + step;
      }
      step = 0;
    }
    const [xcRef] = this.updateRowsRef(toXC(x, y), sheetId, base, step).split("!").reverse();
    return xcRef;
  };

  /**
   * Update a full range by appling an offset.
   *
   * @param ref Reference to update
   * @param sheetId Id of the sheet, if cross-sheet reference
   * @param base Index of the element added/removed
   * @param step Number of elements added/removed (negative when removed)
   */
  private updateRowsRange = (
    value: string,
    sheetId: UID | undefined,
    base: number,
    step: number
  ): string => {
    let [left, right] = value.split(":");
    left = this.updateRowsRangePart(left, sheetId, base, step, 1);
    right = this.updateRowsRangePart(right, sheetId, base, step, -1);
    if (left === "#REF" || right === "#REF") {
      return "#REF";
    }
    const rowLeft = toCartesian(left)[1];
    const rowRight = toCartesian(right)[1];
    if (rowLeft > rowRight) {
      return "#REF";
    }
    if (left === right) {
      return left;
    }
    const range = `${left}:${right}`;
    return sheetId ? `${sheetId}!${range}` : range;
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Update a range with some offsets
   */
  private updateRange(
    symbol: string,
    offsetX: number,
    offsetY: number,
    sheetId: UID | undefined
  ): string {
    let [left, right] = symbol.split(":");
    left = this.updateReference(left, offsetX, offsetY, sheetId);
    right = this.updateReference(right, offsetX, offsetY, sheetId);
    if (left === "#REF" || right === "#REF") {
      return "#REF";
    }
    //As updateReference put the sheet in the ref, we need to remove it from the right part
    right = right.split("!").pop()!;
    return `${left}:${right}`;
  }

  /**
   * Update a reference with some offsets.
   */
  private updateReference(
    symbol: string,
    offsetX: number,
    offsetY: number,
    sheetId: UID | undefined,
    updateFreeze: boolean = true
  ): string {
    const xc = symbol.replace(/\$/g, "");
    let [x, y] = toCartesian(xc);
    const freezeCol = symbol.startsWith("$");
    const freezeRow = symbol.includes("$", 1);
    x += freezeCol && updateFreeze ? 0 : offsetX;
    y += freezeRow && updateFreeze ? 0 : offsetY;
    if (
      x < 0 ||
      x >= this.getters.getSheet(sheetId || this.getters.getActiveSheetId()).colNumber ||
      y < 0 ||
      y >= this.getters.getSheet(sheetId || this.getters.getActiveSheetId()).rowNumber
    ) {
      return "#REF";
    }
    const sheetName = sheetId && getComposerSheetName(this.getters.getSheetName(sheetId)!);
    return (
      (sheetName ? `${sheetName}!` : "") +
      (freezeCol ? "$" : "") +
      numberToLetters(x) +
      (freezeRow ? "$" : "") +
      String(y + 1)
    );
  }

  private visitAllFormulasSymbols(cb: (value: string, sheetId: UID) => string) {
    for (let sheet of Object.values(this.repository.getAllSheets())) {
      for (let cell of Object.values(sheet.cells)) {
        if (cell.type === "formula") {
          const content = rangeTokenize(cell.content!)
            .map((t) => {
              if (t.type === "SYMBOL" && cellReference.test(t.value)) {
                return cb(t.value, sheet.id);
              }
              return t.value;
            })
            .join("");
          if (content !== cell.content) {
            const [col, row] = [cell.col, cell.row];
            this.dispatch("UPDATE_CELL", {
              sheetId: sheet.id,
              col,
              row,
              content,
            });
          }
        }
      }
    }
  }

  /**
   * Apply a function to update the formula on every cells of every sheets which
   * contains a formula
   * @param cb Update formula function to apply
   */
  private visitFormulas(
    sheetNameToFind: string,
    cb: (value: string, sheet: string | undefined) => string
  ) {
    this.visitAllFormulasSymbols((content: string, sheetId: UID): string => {
      let [value, sheetRef] = content.split("!").reverse();
      if (sheetRef) {
        sheetRef = getUnquotedSheetName(sheetRef);
        if (sheetRef === sheetNameToFind) {
          return cb(value, sheetRef);
        }
      } else if (this.repository.getSheetIdByName(sheetNameToFind) === sheetId) {
        return cb(value, undefined);
      }
      return content;
    });
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    // we need to fill the sheetIds mapping first, because otherwise formulas
    // that depends on a sheet not already imported will not be able to be
    // compiled
    // this.repository.sheetsIds;
    // for (let sheet of data.sheets) {
    // }

    for (let sheet of data.sheets) {
      this.repository.set("sheetIds", sheet.name, sheet.id);
      // this.sheetIds[sheet.name] = sheet.id;
    }

    for (let sheet of data.sheets) {
      this.importSheet(sheet);
    }
    this.activeSheetId = data.activeSheet;
  }

  importSheet(data: ImportSheetData) {
    const name = data.name || `Sheet${Object.keys(this.repository.getAllSheets()).length + 1}`;
    const sheet: SheetData = {
      id: data.id,
      name: name,
      cells: {},
      colNumber: data.colNumber,
      rowNumber: data.rowNumber,
      cols: createCols(data.cols || {}, data.colNumber),
      rows: createRows(data.rows || {}, data.rowNumber),
    };
    this.repository.pushVisibleSheet(sheet.id);
    this.repository.addSheet(sheet);
    // cells
    for (let xc in data.cells) {
      const cell = data.cells[xc];
      const [col, row] = toCartesian(xc);
      this.updateCell(data.id, col, row, cell);
    }
  }

  export(data: WorkbookData) {
    data.sheets = this.repository.getVisibleSheets().map((id) => {
      const sheet = this.repository.getSheet(id);
      const cells: { [key: string]: CellData } = {};
      for (let cell of Object.values(sheet.cells)) {
        cells[cell.xc] = {
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format,
        };
      }
      return {
        id: sheet.id,
        name: sheet.name,
        colNumber: sheet.colNumber,
        rowNumber: sheet.rowNumber,
        rows: exportRows(sheet.rows),
        cols: exportCols(sheet.cols),
        merges: [], //exportMerges(sheet.merges),
        cells: cells,
        conditionalFormats: [],
        figures: [],
      };
    });
    data.activeSheet = this.getters.getActiveSheetId();
  }
}

function createDefaultCols(colNumber: number): Col[] {
  const cols: Col[] = [];
  let current = 0;
  for (let i = 0; i < colNumber; i++) {
    const size = DEFAULT_CELL_WIDTH;
    const col = {
      start: current,
      end: current + size,
      size: size,
      name: numberToLetters(i),
    };
    cols.push(col);
    current = col.end;
  }
  return cols;
}

function createDefaultRows(rowNumber: number): Row[] {
  const rows: Row[] = [];
  let current = 0;
  for (let i = 0; i < rowNumber; i++) {
    const size = DEFAULT_CELL_HEIGHT;
    const row = {
      start: current,
      end: current + size,
      size: size,
      name: String(i + 1),
      cells: {},
    };
    rows.push(row);
    current = row.end;
  }
  return rows;
}

function createCols(savedCols: { [key: number]: HeaderData }, colNumber: number): Col[] {
  const cols: Col[] = [];
  let current = 0;
  for (let i = 0; i < colNumber; i++) {
    const size = savedCols[i] ? savedCols[i].size || DEFAULT_CELL_WIDTH : DEFAULT_CELL_WIDTH;
    const col = {
      start: current,
      end: current + size,
      size: size,
      name: numberToLetters(i),
    };
    cols.push(col);
    current = col.end;
  }
  return cols;
}

function createRows(savedRows: { [key: number]: HeaderData }, rowNumber: number): Row[] {
  const rows: Row[] = [];
  let current = 0;
  for (let i = 0; i < rowNumber; i++) {
    const size = savedRows[i] ? savedRows[i].size || DEFAULT_CELL_HEIGHT : DEFAULT_CELL_HEIGHT;
    const row = {
      start: current,
      end: current + size,
      size: size,
      name: String(i + 1),
      cells: {},
    };
    rows.push(row);
    current = row.end;
  }
  return rows;
}

function exportCols(cols: Col[]): { [key: number]: HeaderData } {
  const exportedCols: { [key: number]: HeaderData } = {};
  for (let i in cols) {
    const col = cols[i];
    if (col.size !== DEFAULT_CELL_WIDTH) {
      exportedCols[i] = { size: col.size };
    }
  }
  return exportedCols;
}

function exportRows(rows: Row[]): { [key: number]: HeaderData } {
  const exportedRows: { [key: number]: HeaderData } = {};
  for (let i in rows) {
    const row = rows[i];
    if (row.size !== DEFAULT_CELL_HEIGHT) {
      exportedRows[i] = { size: row.size };
    }
  }
  return exportedRows;
}
