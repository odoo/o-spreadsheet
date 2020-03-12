import { Workbook, Sheet, Col, Row } from ".";
import { updateState } from "./history";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { evaluateCells } from "./evaluation";
import { selectCell } from "./core";
import { numberToLetters } from "../helpers";

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

export function createSheet(state: Workbook) {
  const sheet: Sheet = {
    name: `Sheet${state.sheets.length + 1}`,
    cells: {},
    colNumber: 26,
    rowNumber: 100,
    cols: createDefaultCols(26),
    rows: createDefaultRows(100),
    merges: {},
    mergeCellMap: {}
  };
  addSheet(state, sheet);
  activateSheet(state, sheet.name);
}

export function addSheet(state: Workbook, sheet: Sheet) {
  const sheets = state.sheets.slice();
  sheets.push(sheet);
  updateState(state, ["sheets"], sheets);
}

export function activateSheet(state: Workbook, name: string) {
  const sheet = state.sheets.find(s => s.name === name)!;
  updateState(state, ["activeSheet"], name);

  // setting up rows and columns
  updateState(state, ["rows"], sheet.rows);
  updateState(
    state,
    ["height"],
    state.rows[state.rows.length - 1].bottom + DEFAULT_CELL_HEIGHT + 5
  );
  updateState(state, ["cols"], sheet.cols);
  updateState(state, ["width"], state.cols[state.cols.length - 1].right + DEFAULT_CELL_WIDTH);

  // merges
  updateState(state, ["merges"], sheet.merges);
  updateState(state, ["mergeCellMap"], sheet.mergeCellMap);

  // cells
  updateState(state, ["cells"], sheet.cells);
  evaluateCells(state);
  selectCell(state, 0, 0);
}
