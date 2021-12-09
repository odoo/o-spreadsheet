import { Dimension, Sheet, Zone } from "../types";
import { range } from "./misc";
import { isZoneValid } from "./zones";

export function getNextVisibleCellCoords(sheet: Sheet, col: number, row: number): [number, number] {
  return [
    findVisibleHeader(sheet, "cols", range(col, sheet.cols.length))!,
    findVisibleHeader(sheet, "rows", range(row, sheet.rows.length))!,
  ];
}

/**
 * Get a new zone, reduced to match visible headers.
 * ex: zone(A1:A4) with row 1 hidden: A2:A4
 * @param sheet Sheet on which the zone is used
 * @param zone The zone to reduce
 * @returns Zone or undefined if the reduced zone is not valid
 */
export function reduceZoneToVisibleHeaders(sheet: Sheet, zone: Zone): Zone | undefined {
  const reducedZone = {
    top: findFirstVisibleHeader(sheet, zone.top, "ROW"),
    bottom: findLastVisibleHeader(sheet, zone.bottom, "ROW"),
    left: findFirstVisibleHeader(sheet, zone.left, "COL"),
    right: findLastVisibleHeader(sheet, zone.right, "COL"),
  };
  return isZoneValid(reducedZone) ? reducedZone : undefined;
}

/**
 * Get the next visible header from the base element to the end of the sheet.
 */
function findFirstVisibleHeader(sheet: Sheet, base: number, dimension: Dimension): number {
  const headers = dimension === "COL" ? sheet.cols : sheet.rows;
  for (let i = base; i < headers.length; i++) {
    if (!headers[i].isHidden) {
      return i;
    }
  }
  return NaN;
}

/**
 * Get the next visible header from the base element to the start of the sheet
 * @param sheet
 * @param base
 * @param dimension
 * @returns
 */
function findLastVisibleHeader(sheet: Sheet, base: number, dimension: Dimension): number {
  const headers = dimension === "COL" ? sheet.cols : sheet.rows;
  for (let i = base; i >= 0; i--) {
    if (!headers[i].isHidden) {
      return i;
    }
  }
  return NaN;
}

export function findVisibleHeader(
  sheet: Sheet,
  dimension: "cols" | "rows",
  indexes: number[]
): number | undefined {
  const headers = sheet[dimension];
  return indexes.find((index) => !headers[index].isHidden);
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
