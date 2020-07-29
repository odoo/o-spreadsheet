import { BasePlugin } from "../base_plugin";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { formatDateTime, InternalDate, parseDateTime } from "../functions/dates";
import { AsyncFunction, compile, tokenize } from "../formulas/index";
import { cellReference } from "../formulas/parser";
import {
  formatNumber,
  formatStandardNumber,
  isNumber,
  numberToLetters,
  parseNumber,
  sanitizeSheet,
  toCartesian,
  toXC,
} from "../helpers/index";
import {
  Cell,
  CellData,
  Col,
  Command,
  HeaderData,
  Row,
  Sheet,
  SheetData,
  WorkbookData,
  Zone,
  CommandResult,
  CancelledReason,
} from "../types/index";
import { _lt } from "../translation";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");
const MIN_PADDING = 3;

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CorePlugin extends BasePlugin {
  static getters = [
    "getColsZone",
    "getRowsZone",
    "getCell",
    "getCellText",
    "zoneToXC",
    "getActiveSheet",
    "getSheets",
    "getCol",
    "getRow",
    "getColCells",
    "getNumberCols",
    "getNumberRows",
    "getGridSize",
    "shouldShowFormulas",
  ];

  private sheetIds: { [name: string]: string } = {};
  private showFormulas: boolean = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "REMOVE_COLUMNS":
        return this.workbook.activeSheet.cols.length > cmd.columns.length
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.NotEnoughColumns };
      case "REMOVE_ROWS":
        return this.workbook.activeSheet.rows.length > cmd.rows.length
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.NotEnoughRows };
      case "CREATE_SHEET":
        const { visibleSheets, sheets } = this.workbook;
        return !cmd.name || visibleSheets.findIndex((id) => sheets[id].name === cmd.name) === -1
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
      default:
        return { status: "SUCCESS" };
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.history.updateState(["activeSheet"], this.workbook.sheets[cmd.to]);
        break;
      case "CREATE_SHEET":
        const sheet = this.createSheet(
          cmd.id,
          cmd.name || `Sheet${this.workbook.visibleSheets.length + 1}`,
          cmd.cols || 26,
          cmd.rows || 100
        );
        this.sheetIds[this.workbook.sheets[sheet].name] = sheet;
        if (cmd.activate) {
          this.dispatch("ACTIVATE_SHEET", { from: this.workbook.activeSheet.id, to: sheet });
        }
        break;
      case "DELETE_CONTENT":
        this.clearZones(cmd.sheet, cmd.target);
        break;
      case "SET_VALUE":
        const [col, row] = toCartesian(cmd.xc);
        this.dispatch("UPDATE_CELL", {
          sheet: cmd.sheetId ? cmd.sheetId : this.workbook.activeSheet.id,
          col,
          row,
          content: cmd.text,
        });
        break;
      case "UPDATE_CELL":
        this.updateCell(cmd.sheet, cmd.col, cmd.row, cmd);
        break;
      case "CLEAR_CELL":
        this.dispatch("UPDATE_CELL", {
          sheet: cmd.sheet,
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
            this.setColSize(cmd.sheet, col, size + 2 * MIN_PADDING);
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let col of cmd.rows) {
          const size = this.getRowMaxHeight(col);
          if (size !== 0) {
            this.setRowSize(cmd.sheet, col, size + 2 * MIN_PADDING);
          }
        }
        break;
      case "RESIZE_COLUMNS":
        for (let col of cmd.cols) {
          this.setColSize(cmd.sheet, col, cmd.size);
        }
        break;
      case "RESIZE_ROWS":
        for (let row of cmd.rows) {
          this.setRowSize(cmd.sheet, row, cmd.size);
        }
        break;
      case "REMOVE_COLUMNS":
        this.removeColumns(cmd.sheet, cmd.columns);
        this.history.updateState(
          ["activeSheet", "colNumber"],
          this.workbook.activeSheet.colNumber - cmd.columns.length
        );
        break;
      case "REMOVE_ROWS":
        this.removeRows(cmd.sheet, cmd.rows);
        this.history.updateState(
          ["activeSheet", "rowNumber"],
          this.workbook.activeSheet.rowNumber - cmd.rows.length
        );
        break;
      case "ADD_COLUMNS":
        this.addColumns(cmd.sheet, cmd.column, cmd.position, cmd.quantity);
        this.history.updateState(
          ["activeSheet", "colNumber"],
          this.workbook.activeSheet.colNumber + cmd.quantity
        );
        break;
      case "ADD_ROWS":
        this.addRows(cmd.sheet, cmd.row, cmd.position, cmd.quantity);
        this.history.updateState(
          ["activeSheet", "rowNumber"],
          this.workbook.activeSheet.rowNumber + cmd.quantity
        );
        break;
      case "SET_FORMULA_VISIBILITY":
        this.showFormulas = cmd.show;
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCell(col: number, row: number, sheetName?: string): Cell | null {
    let r;
    if (!sheetName) {
      r = this.workbook.activeSheet.rows[row];
    } else {
      const sheet = Object.values(this.workbook.sheets).find((x) => x.name === sheetName);
      if (sheet) {
        r = sheet.rows[row];
      } else {
        return null;
      }
    }
    return r ? r.cells[col] || null : null;
  }

  getCellText(cell: Cell): string {
    const value = this.showFormulas ? cell.content : cell.value;
    const shouldFormat = value && cell.format && !cell.error && !cell.pending;
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
  getActiveSheet(): string {
    return this.workbook.activeSheet.id;
  }

  getSheets(): Sheet[] {
    const { visibleSheets, sheets } = this.workbook;
    return visibleSheets.map((id) => sheets[id]);
  }

  getCol(sheetId: string, index: number): Col {
    return this.workbook.sheets[sheetId].cols[index];
  }

  getRow(sheetId: string, index: number): Row {
    return this.workbook.sheets[sheetId].rows[index];
  }

  /**
   * Returns all the cells of a col
   */
  getColCells(col: number): Cell[] {
    return this.workbook.activeSheet.rows.reduce(
      (acc: Cell[], cur) => (cur.cells[col] ? acc.concat(cur.cells[col]) : acc),
      []
    );
  }

  getNumberCols(sheetId: string): number {
    return this.workbook.sheets[sheetId].cols.length;
  }

  getNumberRows(sheetId: string): number {
    return this.workbook.sheets[sheetId].rows.length;
  }

  getColsZone(start: number, end: number): Zone {
    return {
      top: 0,
      bottom: this.workbook.activeSheet.rows.length - 1,
      left: start,
      right: end,
    };
  }

  getRowsZone(start: number, end: number): Zone {
    return {
      top: start,
      bottom: end,
      left: 0,
      right: this.workbook.activeSheet.cols.length - 1,
    };
  }

  getGridSize(): [number, number] {
    const activeSheet = this.workbook.activeSheet;
    const height = activeSheet.rows[activeSheet.rows.length - 1].end + DEFAULT_CELL_HEIGHT + 5;
    const width = activeSheet.cols[activeSheet.cols.length - 1].end + DEFAULT_CELL_WIDTH;

    return [width, height];
  }

  shouldShowFormulas(): boolean {
    return this.showFormulas;
  }

  // ---------------------------------------------------------------------------
  // Row/Col manipulation
  // ---------------------------------------------------------------------------

  private getColMaxWidth(index: number): number {
    const cells = this.workbook.activeSheet.rows.reduce(
      (acc: Cell[], cur) => (cur.cells[index] ? acc.concat(cur.cells[index]) : acc),
      []
    );
    const sizes = cells.map(this.getters.getCellWidth);
    return Math.max(0, ...sizes);
  }

  private getRowMaxHeight(index: number): number {
    const cells = Object.values(this.workbook.activeSheet.rows[index].cells);
    const sizes = cells.map(this.getters.getCellHeight);
    return Math.max(0, ...sizes);
  }

  private setColSize(sheetId: string, index: number, size: number) {
    const cols = this.workbook.sheets[sheetId].cols;
    const col = cols[index];
    const delta = size - col.size;
    this.history.updateState(["sheets", sheetId, "cols", index, "size"], size);
    this.history.updateState(["sheets", sheetId, "cols", index, "end"], col.end + delta);
    for (let i = index + 1; i < cols.length; i++) {
      const col = cols[i];
      this.history.updateState(["sheets", sheetId, "cols", i, "start"], col.start + delta);
      this.history.updateState(["sheets", sheetId, "cols", i, "end"], col.end + delta);
    }
  }

  private setRowSize(sheetId: string, index: number, size: number) {
    const rows = this.workbook.sheets[sheetId].rows;
    const row = rows[index];
    const delta = size - row.size;
    this.history.updateState(["sheets", sheetId, "rows", index, "size"], size);
    this.history.updateState(["sheets", sheetId, "rows", index, "end"], row.end + delta);
    for (let i = index + 1; i < rows.length; i++) {
      const row = rows[i];
      this.history.updateState(["sheets", sheetId, "rows", i, "start"], row.start + delta);
      this.history.updateState(["sheets", sheetId, "rows", i, "end"], row.end + delta);
    }
  }

  /**
   * Delete column. This requires a lot of handling:
   * - Update all the formulas in all sheets
   * - Move the cells
   * - Update the cols/rows (size, number, (cells), ...)
   * - Reevaluate the cells
   *
   * @param sheetID ID of the sheet on which deletion should be applied
   * @param columns Columns to delete
   */
  private removeColumns(sheetID: string, columns: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    columns.sort((a, b) => b - a);
    for (let column of columns) {
      // Update all the formulas.
      this.updateAllFormulasHorizontally(column, -1);

      // Move the cells.
      this.moveCellsHorizontally(column, -1);

      // Effectively delete the element and recompute the left-right.
      this.manageColumnsHeaders(column, -1);
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
   * @param sheetID ID of the sheet on which deletion should be applied
   * @param rows Rows to delete
   */
  private removeRows(sheetID: string, rows: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    rows.sort((a, b) => b - a);
    for (let row of rows) {
      // Update all the formulas.
      this.updateAllFormulasVertically(row, -1);

      // Move the cells.
      this.moveCellsVertically(row, -1);

      // Effectively delete the element and recompute the left-right/top-bottom.
      this.processRowsHeaderDelete(row);
    }
  }

  private addColumns(
    sheetID: string,
    column: number,
    position: "before" | "after",
    quantity: number
  ) {
    // Update all the formulas.
    this.updateAllFormulasHorizontally(position === "before" ? column - 1 : column, quantity);

    // Move the cells.
    this.moveCellsHorizontally(position === "before" ? column : column + 1, quantity);

    // Recompute the left-right/top-bottom.
    this.manageColumnsHeaders(column, quantity);
  }

  private addRows(sheetID: string, row: number, position: "before" | "after", quantity: number) {
    for (let i = 0; i < quantity; i++) {
      this.addEmptyRow();
    }
    // Update all the formulas.
    this.updateAllFormulasVertically(position === "before" ? row - 1 : row, quantity);

    // Move the cells.
    this.moveCellsVertically(position === "before" ? row : row + 1, quantity);

    // Recompute the left-right/top-bottom.
    this.processRowsHeaderAdd(row, quantity);
  }

  private moveCellsHorizontally(base: number, step: number) {
    return this.processCellsToMove(
      (cell) => cell.col >= base,
      (cell) => cell.col !== base || step !== -1,
      (cell) => {
        return {
          type: "UPDATE_CELL",
          sheet: this.workbook.activeSheet.id,
          col: cell.col + step,
          row: cell.row,
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format,
        };
      }
    );
  }

  private moveCellsVertically(base: number, step: number) {
    return this.processCellsToMove(
      (cell) => cell.row >= base,
      (cell) => cell.row !== base || step !== -1,
      (cell) => {
        return {
          type: "UPDATE_CELL",
          sheet: this.workbook.activeSheet.id,
          col: cell.col,
          row: cell.row + step,
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format,
        };
      }
    );
  }

  private manageColumnsHeaders(base: number, step: number) {
    const cols: Col[] = [];
    let start = 0;
    let colIndex = 0;
    for (let i in this.workbook.activeSheet.cols) {
      if (parseInt(i, 10) === base) {
        if (step !== -1) {
          const { size } = this.workbook.activeSheet.cols[colIndex];
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
      const { size } = this.workbook.activeSheet.cols[i];
      cols.push({
        name: numberToLetters(colIndex),
        size,
        start,
        end: start + size,
      });
      start += size;
      colIndex++;
    }
    this.history.updateState(["activeSheet", "cols"], cols);
  }

  private processRowsHeaderDelete(index: number) {
    const rows: Row[] = [];
    let start = 0;
    let rowIndex = 0;
    const cellsQueue = this.workbook.activeSheet.rows.map((row) => row.cells);
    for (let i in this.workbook.activeSheet.rows) {
      const row = this.workbook.activeSheet.rows[i];
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
    this.history.updateState(["activeSheet", "rows"], rows);
  }

  private processRowsHeaderAdd(index: number, quantity: number) {
    const rows: Row[] = [];
    let start = 0;
    let rowIndex = 0;
    let sizeIndex = 0;
    const cellsQueue = this.workbook.activeSheet.rows.map((row) => row.cells);
    for (let i in this.workbook.activeSheet.rows) {
      const { size } = this.workbook.activeSheet.rows[sizeIndex];
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
    this.history.updateState(["activeSheet", "rows"], rows);
  }

  private addEmptyRow() {
    const lastEnd = this.workbook.activeSheet.rows[this.workbook.activeSheet.rows.length - 1].end;
    const name = (this.workbook.activeSheet.rows.length + 1).toString();
    const newRows: Row[] = this.workbook.activeSheet.rows.slice();
    const size = 0;
    newRows.push({
      start: lastEnd,
      end: lastEnd + size,
      size,
      name,
      cells: {},
    });
    const path = ["activeSheet", "rows"];
    this.history.updateState(path, newRows);
  }

  private updateAllFormulasHorizontally(base: number, step: number) {
    return this.visitFormulas((value: string, sheet: string | undefined): string => {
      let [x, y] = toCartesian(value);
      if (x === base && step === -1) {
        return "#REF";
      }
      if (x > base) {
        x += step;
      }
      return this.getNewRef(value, sheet, x, y);
    });
  }

  private updateAllFormulasVertically(base: number, step: number) {
    return this.visitFormulas((value: string, sheet: string | undefined): string => {
      let [x, y] = toCartesian(value);
      if (y === base && step === -1) {
        return "#REF";
      }
      if (y > base) {
        y += step;
      }
      return this.getNewRef(value, sheet, x, y);
    });
  }

  private processCellsToMove(
    shouldDelete: (cell: Cell) => boolean,
    shouldAdd: (cell: Cell) => boolean,
    buildCellToAdd: (cell: Cell) => Command
  ) {
    const deleteCommands: Command[] = [];
    const addCommands: Command[] = [];
    for (let [xc, cell] of Object.entries(this.workbook.activeSheet.cells)) {
      if (shouldDelete(cell)) {
        const [col, row] = toCartesian(xc);
        deleteCommands.push({
          type: "CLEAR_CELL",
          sheet: this.workbook.activeSheet.id,
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

  private updateCell(sheet: string, col: number, row: number, data: CellData) {
    const _sheet = this.workbook.sheets[sheet];
    const current = _sheet.rows[row].cells[col];
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
        this.history.updateSheet(_sheet, ["cells", xc], undefined);
        this.history.updateSheet(_sheet, ["rows", row, "cells", col], undefined);
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
          cell.formula = compile(content, sheet, this.sheetIds);

          if (cell.formula instanceof AsyncFunction) {
            cell.async = true;
          }
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
    this.history.updateSheet(_sheet, ["cells", xc], cell);
    this.history.updateSheet(_sheet, ["rows", row, "cells", col], cell);
  }

  private createSheet(id: string, name: string, cols: number, rows: number): string {
    const sheet: Sheet = {
      id,
      name,
      cells: {},
      colNumber: cols,
      rowNumber: rows,
      cols: createDefaultCols(cols),
      rows: createDefaultRows(rows),
      merges: {},
      mergeCellMap: {},
    };
    const visibleSheets = this.workbook.visibleSheets.slice();
    visibleSheets.push(sheet.id);
    const sheets = this.workbook.sheets;
    this.history.updateState(["visibleSheets"], visibleSheets);
    this.history.updateState(["sheets"], Object.assign({}, sheets, { [sheet.id]: sheet }));
    return sheet.id;
  }

  private clearZones(sheet: string, zones: Zone[]) {
    // TODO: get cells from the actual sheet
    const cells = this.workbook.activeSheet.cells;
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const xc = toXC(col, row);
          if (xc in cells) {
            this.dispatch("UPDATE_CELL", {
              sheet,
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
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Apply a function to update the formula on every cells of every sheets which
   * contains a formula
   * @param cb Update formula function to apply
   */
  private visitFormulas(cb: (value: string, sheet: string | undefined) => string) {
    const { sheets, activeSheet } = this.workbook;
    for (let sheetId in sheets) {
      const sheet = sheets[sheetId];
      for (let [xc, cell] of Object.entries(sheet.cells)) {
        if (cell.type === "formula") {
          const content = tokenize(cell.content!)
            .map((t) => {
              if (t.type === "SYMBOL" && cellReference.test(t.value)) {
                let [value, sheetRef] = t.value.split("!").reverse();
                if (sheetRef) {
                  sheetRef = sanitizeSheet(sheetRef);
                  if (sheetRef === activeSheet.name) {
                    return cb(value, sheetRef);
                  }
                } else if (activeSheet.id === sheet.id) {
                  return cb(value, undefined);
                }
              }
              return t.value;
            })
            .join("");
          if (content !== cell.content) {
            const [col, row] = toCartesian(xc);
            this.dispatch("UPDATE_CELL", {
              sheet: sheet.id,
              col,
              row,
              content,
            });
          }
        }
      }
    }
  }

  private getNewRef(value: string, sheet: string | undefined, x: number, y: number): string {
    const fixedCol = value.startsWith("$");
    const fixedRow = value.includes("$", 1);
    return `${sheet ? sheet + "!" : ""}${fixedCol ? "$" : ""}${numberToLetters(x)}${
      fixedRow ? "$" : ""
    }${String(y + 1)}`;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    // we need to fill the sheetIds mapping first, because otherwise formulas
    // that depends on a sheet not already imported will not be able to be
    // compiled
    for (let sheet of data.sheets) {
      this.sheetIds[sheet.name] = sheet.id;
    }

    for (let sheet of data.sheets) {
      this.importSheet(sheet);
    }
    this.workbook.activeSheet = this.workbook.sheets[data.activeSheet];
  }

  importSheet(data: SheetData) {
    let { sheets, visibleSheets } = this.workbook;
    const name = data.name || `Sheet${Object.keys(sheets).length + 1}`;
    const sheet: Sheet = {
      id: data.id,
      name: name,
      cells: {},
      colNumber: data.colNumber,
      rowNumber: data.rowNumber,
      cols: createCols(data.cols || {}, data.colNumber),
      rows: createRows(data.rows || {}, data.rowNumber),
      merges: {},
      mergeCellMap: {},
    };
    visibleSheets = visibleSheets.slice();
    visibleSheets.push(sheet.id);
    this.history.updateState(["visibleSheets"], visibleSheets);
    this.history.updateState(["sheets"], Object.assign({}, sheets, { [sheet.id]: sheet }));
    // cells
    for (let xc in data.cells) {
      const cell = data.cells[xc];
      const [col, row] = toCartesian(xc);
      this.updateCell(data.id, col, row, cell);
    }
  }

  export(data: WorkbookData) {
    data.sheets = this.workbook.visibleSheets.map((id) => {
      const sheet = this.workbook.sheets[id];
      const cells: { [key: string]: CellData } = {};
      for (let [key, cell] of Object.entries(sheet.cells)) {
        cells[key] = {
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
      };
    });
    data.activeSheet = this.workbook.activeSheet.id;
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
