import { Row } from "../types";

export function createDefaultRows(rowNumber: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < rowNumber; i++) {
    const row = {
      cells: {},
    };
    rows.push(row);
  }
  return rows;
}

export function isSheetNameEqual(name1: string | undefined, name2: string | undefined): boolean {
  if (name1 === undefined || name2 === undefined) {
    return false;
  }
  return name1.trim().toUpperCase() === name2.trim().toUpperCase();
}
