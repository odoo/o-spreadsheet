import { getCanonicalSymbolName, getUnquotedSheetName } from "./misc";

/** Reference of a cell (eg. A1, $B$5) */
export const cellReference = new RegExp(/\$?([A-Z]{1,3})\$?([0-9]{1,7})/, "i");

// Same as above, but matches the exact string (nothing before or after)
const singleCellReference = new RegExp(/^\$?([A-Z]{1,3})\$?([0-9]{1,7})$/, "i");

/** Reference of a column header (eg. A, AB, $A) */
const colHeader = new RegExp(/^\$?([A-Z]{1,3})+$/, "i");

/** Reference of a row header (eg. 1, $1) */
const rowHeader = new RegExp(/^\$?([0-9]{1,7})+$/, "i");

/** Reference of a column (eg. A, $CA, Sheet1!B) */
const colReference = new RegExp(/^\s*('.+'!|[^']+!)?\$?([A-Z]{1,3})$/, "i");

/** Reference of a row (eg. 1, 59, Sheet1!9) */
const rowReference = new RegExp(/^\s*('.+'!|[^']+!)?\$?([0-9]{1,7})$/, "i");

/** Reference of a normal range or a full row range (eg. A1:B1, 1:$5, $A2:5) */
const fullRowXc = /(\$?[A-Z]{1,3})?\$?[0-9]{1,7}\s*:\s*(\$?[A-Z]{1,3})?\$?[0-9]{1,7}\s*/i;

/** Reference of a normal range or a column row range (eg. A1:B1, A:$B, $A1:C) */
const fullColXc = /\$?[A-Z]{1,3}(\$?[0-9]{1,7})?\s*:\s*\$?[A-Z]{1,3}(\$?[0-9]{1,7})?\s*/i;

/** Reference of a cell or a range, it can be a bounded range, a full row or a full column */
export const rangeReference = new RegExp(
  /^\s*('.+'!|[^']+!)?/.source +
    "(" +
    [cellReference.source, fullRowXc.source, fullColXc.source].join("|") +
    ")" +
    /$/.source,
  "i"
);

/**
 * Return true if the given xc is the reference of a column (e.g. A or AC or Sheet1!A)
 */
export function isColReference(xc: string): boolean {
  return colReference.test(xc);
}

/**
 * Return true if the given xc is the reference of a column (e.g. 1 or Sheet1!1)
 */
export function isRowReference(xc: string): boolean {
  return rowReference.test(xc);
}

export function isColHeader(str: string): boolean {
  return colHeader.test(str);
}

export function isRowHeader(str: string): boolean {
  return rowHeader.test(str);
}

/**
 * Return true if the given xc is the reference of a single cell,
 * without any specified sheet (e.g. A1)
 */
export function isSingleCellReference(xc: string): boolean {
  return singleCellReference.test(xc);
}

export function splitReference(ref: string): { sheetName?: string; xc: string } {
  if (!ref.includes("!")) {
    return { xc: ref };
  }
  const parts = ref.split("!");
  const xc = parts.pop()!;
  const sheetName = getUnquotedSheetName(parts.join("!")) || undefined;
  return { sheetName, xc };
}

/** Return a reference SheetName!xc from the given arguments */
export function getFullReference(sheetName: string | undefined, xc: string): string {
  return sheetName !== undefined ? `${getCanonicalSymbolName(sheetName)}!${xc}` : xc;
}
