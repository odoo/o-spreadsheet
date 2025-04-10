import { Row } from "../types";
import { getUnquotedSheetName } from "./misc";

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
  return (
    getUnquotedSheetName(name1.trim().toUpperCase()) ===
    getUnquotedSheetName(name2.trim().toUpperCase())
  );
}
