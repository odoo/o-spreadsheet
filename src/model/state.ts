import { addMerge } from "./merges";
import { addCell, selectCell } from "./core";
import { evaluateCells } from "./evaluation";
import { numberToLetters } from "../helpers";
import { updateState } from "./history";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, HEADER_WIDTH, HEADER_HEIGHT } from "../constants";

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
  objects: { [key: string]: { [key: string]: Object } };
  merges: { [key: number]: Merge };
  mergeCellMap: { [key: string]: number };

  // width and height of the sheet zone (not just the visible part, and excluding
  // the row and col headers)
  width: number;
  height: number;
  // actual size of the visible grid, in pixel
  clientWidth: number;
  clientHeight: number;

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

  isEditing: boolean;
  currentContent: string;

  clipboard: ClipBoard;
  trackChanges: boolean;
  undoStack: HistoryStep[];
  redoStack: HistoryStep[];
  nextId: number;
  highlights: Highlight[];
  isSelectingRange: boolean;
  isCopyingFormat: boolean;

  asyncComputations: Promise<any>[];

  // sheets
  sheets: Sheet[];
  activeSheet: number; // index
  activeSheetName: string;
}

export interface HistoryChange {
  root: any;
  path: (string | number)[];
  before: any;
  after: any;
}

export interface HistoryStep {
  batch: HistoryChange[];
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

export interface SheetData {
  name?: string;
  colNumber: number;
  rowNumber: number;
  cells?: { [key: string]: CellData };
  merges?: string[];
  cols?: { [key: number]: HeaderData };
  rows?: { [key: number]: HeaderData };
}

export interface Sheet {
  name: string;
  cells: { [key: string]: Cell };
  colNumber: number;
  rowNumber: number;
  merges: string[];
  cols: { [key: number]: HeaderData };
  rows: { [key: number]: HeaderData };
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
  version: number;
  sheets?: SheetData[];
  styles?: { [key: number]: Style };
  borders?: { [key: number]: Border };
  objects?: { [key: string]: { [key: string]: Object } };
}

export interface PartialGridDataWithVersion extends Partial<GridData> {
  version: GridData["version"];
}

export interface Cell extends CellData {
  col: number;
  row: number;
  xc: string;
  error?: boolean;
  value: any;
  formula?: any;
  async?: boolean;
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
  status: "empty" | "visible" | "invisible";
  shouldCut?: boolean;
  zones: Zone[];
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

/**
 * This is the current state version number. It should be incremented each time
 * a breaking change is made in the way the state is handled, and an upgrade
 * function should be defined
 */
export const CURRENT_VERSION = 1;

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

export function importData(
  data: PartialGridDataWithVersion = { version: CURRENT_VERSION }
): GridState {
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

function importSheet(state: GridState, data: SheetData): number {
  const sheet: Sheet = {
    name: data.name || `Sheet${state.sheets.length + 1}`,
    cells: {},
    colNumber: data.colNumber,
    rowNumber: data.rowNumber,
    cols: data.cols || {},
    rows: data.rows || {},
    merges: data.merges || []
  };
  const sheets = state.sheets.slice();
  const index = sheets.push(sheet) - 1;
  updateState(state, ["sheets"], sheets);
  // cells
  for (let xc in data.cells) {
    addCell(state, xc, data.cells[xc], { sheet });
  }
  return index;
}

export function addSheet(state: GridState) {
  const sheet: SheetData = {
    name: `Sheet${state.sheets.length + 1}`,
    colNumber: 26,
    rowNumber: 100
  };

  const index = importSheet(state, sheet);
  activateSheet(state, index);
}

export function activateSheet(state: GridState, index: number) {
  const sheet = state.sheets[index];
  updateState(state, ["activeSheet"], index);
  updateState(state, ["activeSheetName"], sheet.name);

  // setting up rows and columns
  addRowsCols(state, sheet);

  // merges
  updateState(state, ["merges"], {});
  updateState(state, ["mergeCellMap"], {});
  if (sheet.merges) {
    for (let m of sheet.merges) {
      addMerge(state, m);
    }
  }

  // cells
  updateState(state, ["cells"], sheet.cells);
  state.cells = sheet.cells;
  for (let xc in state.cells) {
    const cell = state.cells[xc];
    updateState(state, ["rows", cell.row, "cells", cell.col], cell);
  }
  evaluateCells(state);
  selectCell(state, 0, 0);
}

function addRowsCols(state: GridState, sheet: Sheet) {
  let current = 0;
  updateState(state, ["rows"], []);
  updateState(state, ["cols"], []);
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
  updateState(
    state,
    ["height"],
    state.rows[state.rows.length - 1].bottom + DEFAULT_CELL_HEIGHT + 5
  );

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
  updateState(state, ["width"], state.cols[state.cols.length - 1].right + DEFAULT_CELL_WIDTH);
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export function exportData(state: GridState): GridData {
  throw new Error("not implemented yet");
}
