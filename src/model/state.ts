import { addMerge } from "./merges";
import { addCell, selectCell } from "./core";
import { evaluateCells } from "./evaluation";
import { numberToLetters } from "../helpers";

/**
 * State
 *
 * This file defines the basic types involved in maintaining the state of a
 * o-spreadsheet. It also defines how to import and export data.
 *
 * The most important exported values are:
 * - interface GridData: the type of that data that is given to the spreadsheet
 * - interface GridState: the internal type of the state managed by the model
 * - function importData: convert from GridData -> GridState
 * - funtion exportData: convert from GridState -> GridData
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface GridState {
  rows: Row[];
  cols: Col[];
  cells: { [key: string]: Cell };
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
  merges: { [key: number]: Merge };
  mergeCellMap: { [key: string]: number };

  // width and height of the sheet zone (not just the visible part, and excluding
  // the row and col headers)
  width: number;
  height: number;
  clientWidth: number;

  // offset between the visible zone and the full zone (take into account
  // headers)
  offsetX: number;
  offsetY: number;
  scrollTop: number;
  scrollLeft: number;

  viewport: Zone;
  selection: Selection;

  activeCol: number;
  activeRow: number;
  activeXc: string;
  activeSheet: string;

  isEditing: boolean;
  currentContent: string;

  clipboard: ClipBoard;
  nextId: number;
  highlights: Highlight[];
  isSelectingRange: boolean;
}

export interface Zone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Selection {
  anchor: {
    col: number;
    row: number;
  };
  zones: Zone[];
}

export interface Style {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  align?: "left" | "right";
  fillColor?: string;
  textColor?: string;
  fontSize?: number; // in pt, not in px!
}

export interface CellData {
  content?: string;
  style?: number;
  border?: number;
}

interface HeaderData {
  size?: number;
}

export interface Sheet {
  name?: string;
  colNumber: number;
  rowNumber: number;
  cells?: { [key: string]: CellData };
  merges?: string[];
  cols?: { [key: number]: HeaderData };
  rows?: { [key: number]: HeaderData };
}

// A border description is a pair [style, ]
export type BorderStyle = "thin" | "medium" | "thick" | "dashed" | "dotted" | "double";
export type BorderDescr = [BorderStyle, string];

export interface Border {
  top?: BorderDescr;
  left?: BorderDescr;
  bottom?: BorderDescr;
  right?: BorderDescr;
}

export interface GridData {
  sheets: Sheet[];
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
}

export interface Cell extends CellData {
  col: number;
  row: number;
  xc: string;
  error?: boolean;
  value: any;
  formula?: any;
  type: "formula" | "text" | "number";
}

export interface Row {
  cells: { [col: number]: Cell };
  bottom: number;
  top: number;
  name: string;
  size: number;
}

export interface Col {
  left: number;
  right: number;
  name: string;
  size: number;
}

export interface Merge extends Zone {
  id: number;
  topLeft: string;
}

export interface ClipBoard {
  zone?: Zone;
  cells?: (Cell | null)[][];
}

export interface Highlight {
  zone: Zone;
  color: string | null;
}

export type BorderCommand =
  | "all"
  | "hv"
  | "h"
  | "v"
  | "external"
  | "left"
  | "top"
  | "right"
  | "bottom"
  | "clear";

// -----------------------------------------------------------------------------
// import
// -----------------------------------------------------------------------------

const DEFAULT_CELL_WIDTH = 96;
const DEFAULT_CELL_HEIGHT = 23;

export const DEFAULT_STYLE: Style = {
  fillColor: "white",
  textColor: "black",
  fontSize: 10
};

export function importData(data: Partial<GridData> = {}): GridState {
  // styles and borders
  const styles: GridState["styles"] = data.styles || {};
  styles[0] = Object.assign({}, DEFAULT_STYLE, styles[0]);
  const borders: GridState["borders"] = data.borders || {};

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
    merges: {},
    mergeCellMap: {},
    width: 0,
    height: 0,
    clientWidth: 0,
    offsetX: 0,
    offsetY: 0,
    scrollTop: 0,
    scrollLeft: 0,
    viewport: { top: 0, left: 0, bottom: 0, right: 0 },
    selection: { zones: [{ top: 0, left: 0, bottom: 0, right: 0 }], anchor: { col: 0, row: 0 } },
    activeCol: 0,
    activeRow: 0,
    activeXc: "A1",
    activeSheet: "Sheet1",
    isEditing: false,
    currentContent: "",
    clipboard: {},
    nextId,
    highlights: [],
    isSelectingRange: false
  };

  const sheets = data.sheets || [
    {
      name: "Sheet1",
      colNumber: 10,
      rowNumber: 10
    }
  ];
  if (sheets.length === 0) {
    sheets.push({ name: "Sheet1", colNumber: 10, rowNumber: 10 });
  }

  activateSheet(state, sheets[0]);

  return state;
}

function activateSheet(state: GridState, sheet: Sheet) {
  state.activeSheet = sheet.name || "Sheet1";

  // setting up rows and columns
  addRowsCols(state, sheet);

  // merges
  if (sheet.merges) {
    for (let m of sheet.merges) {
      addMerge(state, m);
    }
  }

  // cells
  for (let xc in sheet.cells) {
    addCell(state, xc, sheet.cells[xc]);
  }
  evaluateCells(state);
  selectCell(state, 0, 0);
}

function addRowsCols(state: GridState, sheet: Sheet) {
  let current = 0;
  const rows = sheet.rows || {};
  const cols = sheet.cols || {};
  for (let i = 0; i < sheet.rowNumber; i++) {
    const size = rows[i] ? rows[i].size || DEFAULT_CELL_HEIGHT : DEFAULT_CELL_HEIGHT;
    const row = {
      top: current,
      bottom: current + size,
      size: size,
      name: String(i + 1),
      cells: {}
    };
    state.rows.push(row);
    current = row.bottom;
  }
  state.height = state.rows[state.rows.length - 1].bottom + 20; // 10 to have some space at the end

  current = 0;
  for (let i = 0; i < sheet.colNumber; i++) {
    const size = cols[i] ? cols[i].size || DEFAULT_CELL_WIDTH : DEFAULT_CELL_WIDTH;
    const col = {
      left: current,
      right: current + size,
      size: size,
      name: numberToLetters(i)
    };
    state.cols.push(col);
    current = col.right;
  }
  state.width = state.cols[state.cols.length - 1].right + 10;
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export function exportData(state: GridState): GridData {
  throw new Error("not implemented yet");
}
