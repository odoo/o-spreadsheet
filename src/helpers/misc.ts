//------------------------------------------------------------------------------
// Miscellaneous
//------------------------------------------------------------------------------

import { formatNumber, formatStandardNumber } from "./numbers";
import { formatDateTime, InternalDate } from "../functions/dates";
import { Cell } from "../types/misc";

/**
 * Stringify an object, like JSON.stringify, except that the first level of keys
 * is ordered.
 */
export function stringify(obj: any): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Sanitize the name of a sheet, by eventually removing quotes
 * @param sheetName name of the sheet, potentially quoted with single quotes
 */
export function getUnquotedSheetName(sheetName: string): string {
  if (sheetName.startsWith("'")) {
    sheetName = sheetName.slice(1, -1).replace(/''/g, "'");
  }
  return sheetName;
}

/**
 * Add quotes around the sheet name if it contains a space
 * @param sheetName Name of the sheet
 */
export function getComposerSheetName(sheetName: string): string {
  if (sheetName.includes(" ")) {
    sheetName = `'${sheetName}'`;
  }
  return sheetName;
}

export function clip(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

/**
 * This helper function can be used as a type guard when filtering arrays.
 * const foo: number[] = [1, 2, undefined, 4].filter(isDefined)
 */
export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}

export const DEBUG: { [key: string]: any } = {};

export function getCellText(cell: Cell, showFormula: boolean = false): string {
  const value = showFormula ? cell.content : cell.value;
  const shouldFormat = (value || value === 0) && cell.format && !cell.error && !cell.pending;
  const dateTimeFormat = shouldFormat && cell.format!.match(/[ymd:]/);
  const numberFormat = shouldFormat && !dateTimeFormat;
  switch (typeof value) {
    case "string":
      return value;
    case "boolean":
      return value ? "TRUE" : "FALSE";
    case "number":
      if (dateTimeFormat) {
        return formatDateTime({ value } as InternalDate, cell.format);
      }
      if (numberFormat) {
        return formatNumber(value, cell.format!);
      }
      return formatStandardNumber(value);
    case "object":
      if (dateTimeFormat) {
        return formatDateTime(value as InternalDate, cell.format);
      }
      if (numberFormat) {
        return formatNumber(value.value, cell.format!);
      }
      if (value && value.format!.match(/[ymd:]/)) {
        return formatDateTime(value);
      }
      return "0";
  }
  return value.toString();
}
