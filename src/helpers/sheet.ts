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
