import { BasePlugin } from "../base_plugin";
import { GridCommand, Col, Row, Workbook, Sheet, Cell, Zone } from "../types";
import { updateState } from "../history";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { addCell, deleteCell } from "../core";
import { numberToLetters, toCartesian, toXC } from "../../helpers";
import { SheetData, WorkbookData, HeaderData } from "../import_export";
import { formatValue, formatNumber } from "../../formatters";

export class CorePlugin extends BasePlugin {
  static getters = ["getCellText", "zoneToXC"];

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  dispatch(cmd: GridCommand): GridCommand[] | void {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.activateSheet(cmd.sheet);
        break;
      case "CREATE_SHEET":
        const sheet = this.createSheet();
        return [{ type: "ACTIVATE_SHEET", sheet }];
      case "DELETE":
        this.deleteContent(cmd.sheet, cmd.target);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  private activateSheet(name: string) {
    const sheet = this.workbook.sheets.find(s => s.name === name)!;
    updateState(this.workbook, ["activeSheet"], sheet);

    // setting up rows and columns
    updateState(this.workbook, ["rows"], sheet.rows);
    updateState(
      this.workbook,
      ["height"],
      this.workbook.rows[this.workbook.rows.length - 1].bottom + DEFAULT_CELL_HEIGHT + 5
    );
    updateState(this.workbook, ["cols"], sheet.cols);
    updateState(
      this.workbook,
      ["width"],
      this.workbook.cols[this.workbook.cols.length - 1].right + DEFAULT_CELL_WIDTH
    );

    // merges
    updateState(this.workbook, ["merges"], sheet.merges);
    updateState(this.workbook, ["mergeCellMap"], sheet.mergeCellMap);

    // cells
    updateState(this.workbook, ["cells"], sheet.cells);
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
    updateState(this.workbook, ["sheets"], sheets);
    // activateSheet(this.workbook, sheet.name);
    return sheet.name;
  }

  import(data: WorkbookData) {
    const sheets = data.sheets || [];
    if (sheets.length === 0) {
      sheets.push({ name: "Sheet1", colNumber: 26, rowNumber: 100 });
    }
    for (let sheet of sheets) {
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
    if (data.merges) {
      addMerges(this.workbook, sheet, data.merges);
    }
    addSheet(this.workbook, sheet);
    // cells
    for (let xc in data.cells) {
      addCell(this.workbook, xc, data.cells[xc], { sheet: name });
      const cell = sheet.cells[xc];
      sheet.rows[cell.row].cells[cell.col] = cell;
    }
  }

  private deleteContent(sheet: string, zones: Zone[]) {
    // TODO: get cells from the actual sheet
    const cells = this.workbook.activeSheet.cells;
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const xc = toXC(col, row);
          if (xc in cells) {
            deleteCell(this.workbook, xc);
          }
        }
      }
    }
  }
}

function addSheet(state: Workbook, sheet: Sheet) {
  const sheets = state.sheets.slice();
  sheets.push(sheet);
  updateState(state, ["sheets"], sheets);
}

function addMerges(state: Workbook, sheet: Sheet, merges: string[]) {
  for (let m of merges) {
    let id = state.nextId++;
    const [tl, br] = m.split(":");
    const [left, top] = toCartesian(tl);
    const [right, bottom] = toCartesian(br);
    sheet.merges[id] = {
      id,
      left,
      top,
      right,
      bottom,
      topLeft: tl
    };
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const xc = toXC(col, row);
        sheet.mergeCellMap[xc] = id;
      }
    }
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
