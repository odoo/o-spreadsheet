import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { formatNumber, formatValue } from "../formatters";
import { AsyncFunction, compile } from "../formulas/index";
import { isEqual, isNumber, numberToLetters, toCartesian, toXC, union } from "../helpers/index";
import {
  Cell,
  CellData,
  Col,
  GridCommand,
  HeaderData,
  Merge,
  Row,
  Sheet,
  SheetData,
  WorkbookData,
  Zone
} from "../types/index";
import { BasePlugin } from "../base_plugin";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CorePlugin extends BasePlugin {
  static getters = ["getCell", "getCellText", "zoneToXC", "expandZone"];

  handle(cmd: GridCommand) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.activateSheet(cmd.sheet);
        break;
      case "CREATE_SHEET":
        const sheet = this.createSheet();
        this.dispatch({ type: "ACTIVATE_SHEET", sheet });
        break;
      case "DELETE_CONTENT":
        this.clearZones(cmd.sheet, cmd.target);
        break;
      case "SET_VALUE":
        const [col, row] = toCartesian(cmd.xc);
        this.dispatch({
          type: "UPDATE_CELL",
          sheet: this.workbook.activeSheet.name,
          col,
          row,
          content: cmd.text
        });
        break;
      case "UPDATE_CELL":
        this.updateCell(cmd.sheet, cmd.col, cmd.row, cmd);
        break;
      case "CLEAR_CELL":
        this.dispatch({
          type: "UPDATE_CELL",
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

  /**
   * Add all necessary merge to the current selection to make it valid
   * Todo: move this to merge plugin
   */
  expandZone(zone: Zone): Zone {
    let { left, right, top, bottom } = zone;
    let result: Zone = { left, right, top, bottom };
    for (let i = left; i <= right; i++) {
      for (let j = top; j <= bottom; j++) {
        let mergeId = this.workbook.mergeCellMap[toXC(i, j)];
        if (mergeId) {
          result = union(this.workbook.merges[mergeId], result);
        }
      }
    }
    return isEqual(result, zone) ? result : this.expandZone(result);
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
    this.history.updateState(
      ["height"],
      this.workbook.rows[this.workbook.rows.length - 1].bottom + DEFAULT_CELL_HEIGHT + 5
    );
    this.history.updateState(["cols"], sheet.cols);
    this.history.updateState(
      ["width"],
      this.workbook.cols[this.workbook.cols.length - 1].right + DEFAULT_CELL_WIDTH
    );

    // merges
    this.history.updateState(["merges"], sheet.merges);
    this.history.updateState(["mergeCellMap"], sheet.mergeCellMap);

    // cells
    this.history.updateState(["cells"], sheet.cells);
  }

  private createSheet(): string {
    const sheet: Sheet = {
      name: `Sheet${this.workbook.sheets.length + 1}`,
      cells: {},
      colNumber: 26,
      rowNumber: 100,
      cols: createDefaultCols(26),
      rows: createDefaultRows(100),
      merges: {},
      mergeCellMap: {},
      conditionalFormats: []
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
            this.dispatch({
              type: "UPDATE_CELL",
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
    this.activateSheet(this.workbook.sheets[0].name);
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
      mergeCellMap: {},
      conditionalFormats: data.conditionalFormats || []
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

  export(): Partial<WorkbookData> {
    const sheets: SheetData[] = [];
    for (let sheetName in this.workbook.sheets) {
      const sheet = this.workbook.sheets[sheetName];
      const cells: { [key: string]: CellData } = {};
      for (let [key, cell] of Object.entries(sheet.cells)) {
        cells[key] = {
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format
        };
      }
      sheets.push({
        name: sheet.name,
        colNumber: sheet.colNumber,
        rowNumber: sheet.rowNumber,
        rows: exportRows(sheet.rows),
        cols: exportCols(sheet.cols),
        merges: exportMerges(sheet.merges),
        cells: cells,
        conditionalFormats: sheet.conditionalFormats
      });
    }

    return {
      sheets
    };
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
