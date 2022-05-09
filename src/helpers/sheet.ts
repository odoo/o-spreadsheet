import { Col, HeaderData, Row } from "../types";
import { numberToLetters } from "./coordinates";

export function createDefaultCols(colNumber: number): Col[] {
  const cols: Col[] = [];
  for (let i = 0; i < colNumber; i++) {
    const col = {
      name: numberToLetters(i),
    };
    cols.push(col);
  }
  return cols;
}

export function createDefaultRows(rowNumber: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < rowNumber; i++) {
    const row = {
      name: String(i + 1),
      cells: {},
    };
    rows.push(row);
  }
  return rows;
}

export function createCols(savedCols: { [key: number]: HeaderData }, colNumber: number): Col[] {
  const cols: Col[] = [];
  for (let i = 0; i < colNumber; i++) {
    const hidden = savedCols[i]?.isHidden || false;
    const col: Col = {
      name: numberToLetters(i),
    };
    if (hidden) {
      col.isHidden = hidden;
    }
    cols.push(col);
  }
  return cols;
}

export function createRows(savedRows: { [key: number]: HeaderData }, rowNumber: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < rowNumber; i++) {
    const hidden = savedRows[i]?.isHidden || false;
    const row: Row = {
      name: String(i + 1),
      cells: {},
    };
    if (hidden) {
      row.isHidden = hidden;
    }
    rows.push(row);
  }
  return rows;
}

export function exportCols(cols: Col[]): { [key: number]: HeaderData } {
  const exportedCols: { [key: number]: HeaderData } = {};
  for (let i in cols) {
    const col = cols[i];
    if (col.isHidden) {
      exportedCols[i] = exportedCols[i] || {};
      exportedCols[i]["isHidden"] = col.isHidden;
    }
  }
  return exportedCols;
}

export function exportRows(rows: Row[]): { [key: number]: HeaderData } {
  const exportedRows: { [key: number]: HeaderData } = {};
  for (let i in rows) {
    const row = rows[i];
    if (row.isHidden) {
      exportedRows[i] = exportedRows[i] || {};
      exportedRows[i]["isHidden"] = row.isHidden;
    }
  }
  return exportedRows;
}
