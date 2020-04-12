import { BasePlugin } from "../base_plugin";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { formatNumber, formatValue } from "../formatters";
import { AsyncFunction, compile } from "../formulas/index";
import { isNumber, numberToLetters, toCartesian, toXC } from "../helpers/index";
import {
  Cell,
  CellData,
  Col,
  Command,
  HeaderData,
  Merge,
  Row,
  Sheet,
  SheetData,
  WorkbookData,
  Zone
} from "../types/index";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CorePlugin extends BasePlugin {
  static getters = [
    "getCell",
    "getCellText",
    "zoneToXC",
    "getActiveSheet",
    "getSheets",
    "getCol",
    "getRow"
  ];

  allowDispatch(cmd: Command): boolean {
    switch (cmd.type) {
      case "CREATE_SHEET":
        return !cmd.name || this.workbook.sheets.findIndex(sheet => sheet.name === cmd.name) === -1;
      default:
        return true;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.activateSheet(cmd.to);
        break;
      case "CREATE_SHEET":
        const sheet = this.createSheet(
          cmd.name || `Sheet${this.workbook.sheets.length + 1}`,
          cmd.cols || 26,
          cmd.rows || 100
        );
        this.dispatch("ACTIVATE_SHEET", { from: this.workbook.activeSheet.name, to: sheet });
        break;
      case "DELETE_CONTENT":
        this.clearZones(cmd.sheet, cmd.target);
        break;
      case "SET_VALUE":
        const [col, row] = toCartesian(cmd.xc);
        this.dispatch("UPDATE_CELL", {
          sheet: cmd.sheet ? cmd.sheet : this.workbook.activeSheet.name,
          col,
          row,
          content: cmd.text
        });
        break;
      case "UPDATE_CELL":
        this.updateCell(cmd.sheet, cmd.col, cmd.row, cmd);
        break;
      case "CLEAR_CELL":
        this.dispatch("UPDATE_CELL", {
          sheet: this.workbook.activeSheet.name,
          col: cmd.col,
          row: cmd.row,
          content: "",
          border: 0,
          style: 0,
          format: ""
        });
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCell(col: number, row: number): Cell | null {
    return this.workbook.rows[row].cells[col] || null;
  }

  getCellText(cell: Cell): string {
    if (cell.value === "") {
      return "";
    }
    if (cell.value === false) {
      return "FALSE";
    }
    if (cell.value === true) {
      return "TRUE";
    }
    if (cell.error) {
      return cell.value;
    }

    const value = cell.value || 0;
    if (cell.type === "text") {
      return value.toString();
    }
    if (cell.format) {
      return formatValue(cell.value, cell.format);
    }
    return formatNumber(value);
  }

  /**
   * Converts a zone to a XC coordinate system
   *
   * The conversion also treats merges a one single cell
   *
   * Examples:
   * {top:0,left:0,right:0,bottom:0} ==> A1
   * {top:0,left:0,right:1,bottom:1} ==> A1:B2
   *
   * if A1:B2 is a merge:
   * {top:0,left:0,right:1,bottom:1} ==> A1
   */
  zoneToXC(zone: Zone): string {
    const topLeft = toXC(zone.left, zone.top);
    const botRight = toXC(zone.right, zone.bottom);

    if (topLeft != botRight && !this.workbook.mergeCellMap[topLeft]) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  getActiveSheet(): string {
    return this.workbook.activeSheet.name;
  }

  getSheets(): string[] {
    return this.workbook.sheets.map(s => s.name);
  }

  getCol(index: number): Col {
    return this.workbook.cols[index];
  }

  getRow(index: number): Row {
    return this.workbook.rows[index];
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  private updateCell(sheet: string, col: number, row: number, data: CellData) {
    const _sheet = this.workbook.sheets.find(s => s.name === sheet)!;
    const current = _sheet.rows[row].cells[col];
    const xc = (current && current.xc) || toXC(col, row);

    // Compute the new cell properties
    const dataContent = data.content ? data.content.replace(nbspRegexp, "") : "";
    const content = "content" in data ? dataContent : (current && current.content) || "";
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
      (!current && dataContent) || (current && current.content !== dataContent);
    let cell: Cell;
    if (current && !didContentChange) {
      cell = { col, row, xc, content, value: current.value, type: current.type };
      if (cell.type === "formula") {
        cell.error = current.error;
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
        type = "number";
        value = parseFloat(content);
        if (content.includes("%")) {
          value = value / 100;
          format = content.includes(".") ? "0.00%" : "0%";
        }
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
        cell.error = false;
        try {
          cell.formula = compile(content, sheet);

          if (cell.formula instanceof AsyncFunction) {
            cell.async = true;
          }
        } catch (e) {
          cell.value = "#BAD_EXPR";
          cell.error = true;
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

  private activateSheet(name: string) {
    const sheet = this.workbook.sheets.find(s => s.name === name)!;
    this.history.updateState(["activeSheet"], sheet);

    // setting up rows and columns
    this.history.updateState(["rows"], sheet.rows);
    this.history.updateState(["cols"], sheet.cols);

    // merges
    this.history.updateState(["merges"], sheet.merges);
    this.history.updateState(["mergeCellMap"], sheet.mergeCellMap);

    // cells
    this.history.updateState(["cells"], sheet.cells);
  }

  private createSheet(name: string, cols: number, rows: number): string {
    const sheet: Sheet = {
      name,
      cells: {},
      colNumber: cols,
      rowNumber: rows,
      cols: createDefaultCols(cols),
      rows: createDefaultRows(rows),
      merges: {},
      mergeCellMap: {}
    };
    const sheets = this.workbook.sheets.slice();
    sheets.push(sheet);
    this.history.updateState(["sheets"], sheets);
    return sheet.name;
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
              row
            });
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      this.importSheet(sheet);
    }
    this.activateSheet(data.activeSheet);
  }

  importSheet(data: SheetData) {
    const name = data.name || `Sheet${this.workbook.sheets.length + 1}`;
    const sheet: Sheet = {
      name: name,
      cells: {},
      colNumber: data.colNumber,
      rowNumber: data.rowNumber,
      cols: createCols(data.cols || {}, data.colNumber),
      rows: createRows(data.rows || {}, data.rowNumber),
      merges: {},
      mergeCellMap: {}
    };
    const sheets = this.workbook.sheets.slice();
    sheets.push(sheet);
    this.history.updateState(["sheets"], sheets);
    // cells
    for (let xc in data.cells) {
      const cell = data.cells[xc];
      const [col, row] = toCartesian(xc);
      this.updateCell(name, col, row, cell);
    }
  }

  export(data: WorkbookData) {
    data.sheets = this.workbook.sheets.map(sheet => {
      const cells: { [key: string]: CellData } = {};
      for (let [key, cell] of Object.entries(sheet.cells)) {
        cells[key] = {
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format
        };
      }
      return {
        name: sheet.name,
        colNumber: sheet.colNumber,
        rowNumber: sheet.rowNumber,
        rows: exportRows(sheet.rows),
        cols: exportCols(sheet.cols),
        merges: exportMerges(sheet.merges),
        cells: cells,
        conditionalFormats: []
      };
    });
    data.activeSheet = this.workbook.activeSheet.name;
  }
}

function createDefaultCols(colNumber: number): Col[] {
  const cols: Col[] = [];
  let current = 0;
  for (let i = 0; i < colNumber; i++) {
    const size = DEFAULT_CELL_WIDTH;
    const col = {
      left: current,
      right: current + size,
      size: size,
      name: numberToLetters(i)
    };
    cols.push(col);
    current = col.right;
  }
  return cols;
}

function createDefaultRows(rowNumber: number): Row[] {
  const rows: Row[] = [];
  let current = 0;
  for (let i = 0; i < rowNumber; i++) {
    const size = DEFAULT_CELL_HEIGHT;
    const row = {
      top: current,
      bottom: current + size,
      size: size,
      name: String(i + 1),
      cells: {}
    };
    rows.push(row);
    current = row.bottom;
  }
  return rows;
}

function createCols(savedCols: { [key: number]: HeaderData }, colNumber: number): Col[] {
  const cols: Col[] = [];
  let current = 0;
  for (let i = 0; i < colNumber; i++) {
    const size = savedCols[i] ? savedCols[i].size || DEFAULT_CELL_WIDTH : DEFAULT_CELL_WIDTH;
    const col = {
      left: current,
      right: current + size,
      size: size,
      name: numberToLetters(i)
    };
    cols.push(col);
    current = col.right;
  }
  return cols;
}

function createRows(savedRows: { [key: number]: HeaderData }, rowNumber: number): Row[] {
  const rows: Row[] = [];
  let current = 0;
  for (let i = 0; i < rowNumber; i++) {
    const size = savedRows[i] ? savedRows[i].size || DEFAULT_CELL_HEIGHT : DEFAULT_CELL_HEIGHT;
    const row = {
      top: current,
      bottom: current + size,
      size: size,
      name: String(i + 1),
      cells: {}
    };
    rows.push(row);
    current = row.bottom;
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

function exportMerges(merges: { [key: number]: Merge }): string[] {
  return Object.values(merges).map(
    merge => toXC(merge.left, merge.top) + ":" + toXC(merge.right, merge.bottom)
  );
}
