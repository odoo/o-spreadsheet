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

export function getNextSheetName(names: string[], baseName: string = "Sheet"): string {
  let i = 1;
  let name = `${baseName}${i}`;
  while (names.includes(name)) {
    name = `${baseName}${i}`;
    i++;
  }
  return name;
}
