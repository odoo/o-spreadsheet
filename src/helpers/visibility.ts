import { Sheet } from "../types";
import { range } from "./misc";

export function getNextVisibleCellCoords(sheet: Sheet, col: number, row: number): [number, number] {
  return [
    findVisibleHeader(sheet, "cols", range(col, sheet.cols.length))!,
    findVisibleHeader(sheet, "rows", range(row, sheet.rows.length))!,
  ];
}

export function findVisibleHeader(
  sheet: Sheet,
  dimension: "cols" | "rows",
  indexes: number[]
): number | undefined {
  const headers = sheet[dimension];
  return indexes.find((index) => headers[index] && !headers[index].isHidden);
}

export function findLastVisibleColRow(sheet: Sheet, dimension: "cols" | "rows") {
  let lastIndex = sheet[dimension].length - 1;
  while (lastIndex >= 0 && sheet[dimension][lastIndex].isHidden === true) {
    lastIndex--;
  }
  return sheet[dimension][lastIndex];
}

export function findFirstVisibleColRow(sheet: Sheet, dimension: "cols" | "rows") {
  return sheet[dimension].find((header) => !header.isHidden);
}
