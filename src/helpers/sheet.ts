import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { Col, HeaderData, Row } from "../types";
import { numberToLetters } from "./coordinates";

export function createDefaultCols(colNumber: number): Col[] {
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

export function createDefaultRows(rowNumber: number): Row[] {
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

export function createCols(savedCols: { [key: number]: HeaderData }, colNumber: number): Col[] {
  const cols: Col[] = [];
  let current = 0;
  for (let i = 0; i < colNumber; i++) {
    const size = savedCols[i] ? savedCols[i].size || DEFAULT_CELL_WIDTH : DEFAULT_CELL_WIDTH;
    const hidden = savedCols[i]?.isHidden || false;
    const end = hidden ? current : current + size;
    const col: Col = {
      start: current,
      end: end,
      size: size,
      name: numberToLetters(i),
    };
    if (hidden) {
      col.isHidden = hidden;
    }
    cols.push(col);
    current = col.end;
  }
  return cols;
}

export function createRows(savedRows: { [key: number]: HeaderData }, rowNumber: number): Row[] {
  const rows: Row[] = [];
  let current = 0;
  for (let i = 0; i < rowNumber; i++) {
    const size = savedRows[i] ? savedRows[i].size || DEFAULT_CELL_HEIGHT : DEFAULT_CELL_HEIGHT;
    const hidden = savedRows[i]?.isHidden || false;
    const end = hidden ? current : current + size;
    const row: Row = {
      start: current,
      end: end,
      size: size,
      name: String(i + 1),
      cells: {},
    };
    if (hidden) {
      row.isHidden = hidden;
    }
    rows.push(row);
    current = row.end;
  }
  return rows;
}
export function exportCols(
  cols: Col[],
  exportDefaults: boolean = false
): { [key: number]: HeaderData } {
  const exportedCols: { [key: number]: HeaderData } = {};
  for (let i in cols) {
    const col = cols[i];
    if (col.size !== DEFAULT_CELL_WIDTH || exportDefaults) {
      exportedCols[i] = { size: col.size };
    }
    if (col.isHidden) {
      exportedCols[i] = exportedCols[i] || {};
      exportedCols[i]["isHidden"] = col.isHidden;
    }
  }
  return exportedCols;
}

export function exportRows(
  rows: Row[],
  exportDefaults: boolean = false
): { [key: number]: HeaderData } {
  const exportedRows: { [key: number]: HeaderData } = {};
  for (let i in rows) {
    const row = rows[i];
    if (row.size !== DEFAULT_CELL_HEIGHT || exportDefaults) {
      exportedRows[i] = { size: row.size };
    }
    if (row.isHidden) {
      exportedRows[i] = exportedRows[i] || {};
      exportedRows[i]["isHidden"] = row.isHidden;
    }
  }
  return exportedRows;
}
