import { Style, Border, GridState, Col, Row, Sheet, Merge, CURRENT_VERSION } from "./state";
import { addCell } from "./core";
import { numberToLetters, toXC, toCartesian } from "../helpers";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, HEADER_WIDTH, HEADER_HEIGHT } from "../constants";
import { addSheet, activateSheet } from "./sheet";

/**
 * Data
 *
 * This file defines the basic types involved in import-export. It also defines
 * how to import and export data.
 *
 * The most important exported values are:
 * - interface GridData: the type of that data that is given to the spreadsheet
 * - function importData: convert from GridData -> GridState
 * - funtion exportData: convert from GridState -> GridData
 */

export interface PartialGridDataWithVersion extends Partial<GridData> {
  version: GridData["version"];
}

interface CellData {
  content?: string;
  style?: number;
  border?: number;
}

interface HeaderData {
  size?: number;
}

interface SheetData {
  name?: string;
  colNumber: number;
  rowNumber: number;
  cells?: { [key: string]: CellData };
  merges?: string[];
  cols?: { [key: number]: HeaderData };
  rows?: { [key: number]: HeaderData };
}

interface GridData {
  version: number;
  sheets?: SheetData[];
  styles?: { [key: number]: Style };
  borders?: { [key: number]: Border };
  objects?: { [key: string]: { [key: string]: Object } };
}

// -----------------------------------------------------------------------------
// Import
// -----------------------------------------------------------------------------

// TODO: use this code in importData function
// const UPGRADES = {
//   1: function (state) {
//     // return here a state upgraded to version 2
//     return state;
//   }
// };

export const DEFAULT_STYLE: Style = {
  fillColor: "white",
  textColor: "black",
  fontSize: 10
};

export function importData(data: PartialGridDataWithVersion): GridState {
  if (!data.version) {
    throw new Error("Missing version number");
  }
  // styles and borders
  const styles: GridState["styles"] = data.styles || {};
  styles[0] = Object.assign({}, DEFAULT_STYLE, styles[0]);
  const borders: GridState["borders"] = data.borders || {};
  const objects: GridState["objects"] = data.objects || {};

  // compute next id
  let nextId = 1;
  for (let k in styles) {
    nextId = Math.max(k as any, nextId);
  }
  for (let k in borders) {
    nextId = Math.max(k as any, nextId);
  }
  nextId++;

  const state: GridState = {
    rows: [],
    cols: [],
    cells: {},
    styles,
    borders,
    objects,
    merges: {},
    mergeCellMap: {},
    width: 0,
    height: 0,
    clientWidth: DEFAULT_CELL_WIDTH + HEADER_WIDTH,
    clientHeight: DEFAULT_CELL_HEIGHT + HEADER_HEIGHT,
    offsetX: 0,
    offsetY: 0,
    scrollTop: 0,
    scrollLeft: 0,
    viewport: { top: 0, left: 0, bottom: 0, right: 0 },
    selection: { zones: [{ top: 0, left: 0, bottom: 0, right: 0 }], anchor: { col: 0, row: 0 } },
    activeCol: 0,
    activeRow: 0,
    activeXc: "A1",
    isEditing: false,
    currentContent: "",
    clipboard: {
      status: "empty",
      zones: []
    },
    trackChanges: false,
    undoStack: [],
    redoStack: [],
    nextId,
    highlights: [],
    isSelectingRange: false,
    isCopyingFormat: false,
    asyncComputations: [],
    activeSheet: 0,
    activeSheetName: "Sheet1",
    sheets: []
  };

  // sheets
  const sheets = data.sheets || [];
  if (sheets.length === 0) {
    sheets.push({ name: "Sheet1", colNumber: 10, rowNumber: 10 });
  }
  for (let sheet of sheets) {
    importSheet(state, sheet);
  }

  activateSheet(state, 0);

  return state;
}

function addCols(
  state: GridState,
  savedCols: { [key: number]: HeaderData },
  colNumber: number
): Col[] {
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

function addRows(
  state: GridState,
  savedRows: { [key: number]: HeaderData },
  rowNumber: number
): Row[] {
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

function addMerges(state: GridState, sheet: Sheet, merges: string[]) {
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

function importSheet(state: GridState, data: SheetData) {
  const sheet: Sheet = {
    name: data.name || `Sheet${state.sheets.length + 1}`,
    cells: {},
    colNumber: data.colNumber,
    rowNumber: data.rowNumber,
    cols: addCols(state, data.cols || {}, data.colNumber),
    rows: addRows(state, data.rows || {}, data.rowNumber),
    merges: {},
    mergeCellMap: {}
  };
  if (data.merges) {
    addMerges(state, sheet, data.merges);
  }
  // cells
  for (let xc in data.cells) {
    addCell(state, xc, data.cells[xc], { sheet });
    const cell = sheet.cells[xc];
    sheet.rows[cell.row].cells[cell.col] = cell;
  }
  addSheet(state, sheet);
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

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

export function exportData(state: GridState): GridData {
  // styles and borders
  const styles: GridData["styles"] = state.styles || {};
  const borders: GridData["borders"] = state.borders || {};
  const objects: GridData["objects"] = state.objects || {};

  const sheets: SheetData[] = [];
  for (let sheet of state.sheets) {
    const cells: { [key: string]: CellData } = {};
    for (let [key, cell] of Object.entries(sheet.cells)) {
      cells[key] = {
        content: cell.content,
        border: cell.border,
        style: cell.style
      };
    }
    sheets.push({
      name: sheet.name,
      colNumber: sheet.colNumber,
      rowNumber: sheet.rowNumber,
      rows: exportRows(sheet.rows),
      cols: exportCols(sheet.cols),
      merges: exportMerges(sheet.merges),
      cells: cells
    });
  }

  return {
    version: CURRENT_VERSION,
    sheets,
    styles,
    borders,
    objects
  };
}
