import { HeaderIndex } from "../types";
import { InvalidReferenceError } from "../types/errors";
import { numberToLetters } from "./coordinates";
import { getCanonicalSheetName, getUnquotedSheetName } from "./misc";

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

/** Reference of a cell in relative RC notation */
const relativeReference = new RegExp(/\[(\-?[0-9]{1,7})\]/, "i");
const RcRowReference = new RegExp(/R(\[?\-?[0-9]{1,7}\]?)/, "i");
const RcColReference = new RegExp(/C(\[?\-?[0-9]{1,7}\]?)/, "i");

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
  return sheetName !== undefined ? `${getCanonicalSheetName(sheetName)}!${xc}` : xc;
}

/** Converts an RC notation to an A1 notation
 *  An RC notation is a notation where the column and row are specified by their index
 *  instead of by the column letter and row number. There are two types of RC notations:
 * - Absolute RC notation: RnCm where n is the row index and m is the column index
 * - Relative RC notation: R[n]C[m] where n is the row offset relative to a base position
 *   and m is the column offset relative to this same base position.
 * The relative RC notation will then need to know the initial position to use as a starting
 * point, which is why it is passed as an optional argument.
 * In both notation, the row and column index start at 1, ie R1C1 is A1, R1C2 is B1, R2C1 is A2,
 * etc.
 * As in the A1 notation, an unbounded range can be specified by omitting the row or column index :
 * - R1: all the cells in the first row (similar to 1:1)
 * - C1: all the cells in the first column (similar to A:A)
 */
export function toA1(
  reference: string,
  basePosition?: { col: HeaderIndex; row: HeaderIndex }
): string {
  const { xc, sheetName } = splitReference(reference);
  const singleCellReference = !xc.includes(":");
  const range = xc
    .split(":")
    .map((xc) => {
      let rowPart = RcRowReference.exec(xc)?.[1] ?? "";
      if (rowPart) {
        const relativeRow = relativeReference.test(rowPart);
        if (relativeRow) {
          rowPart = rowPart.substring(1, rowPart.length - 1);
        }
        let rowIndex = parseInt(rowPart);
        if (isNaN(rowIndex)) {
          throw new InvalidReferenceError();
        }
        if (relativeRow) {
          if (!basePosition) {
            throw new InvalidReferenceError();
          }
          rowIndex += basePosition.row + 1;
        }
        if (rowIndex <= 0) {
          throw new InvalidReferenceError();
        }
        rowPart = rowIndex.toString();
      }
      let colPart = RcColReference.exec(xc)?.[1] ?? "";
      if (colPart) {
        const relativeCol = relativeReference.test(colPart);
        if (relativeCol) {
          colPart = colPart.substring(1, colPart.length - 1);
        }
        let colIndex = parseInt(colPart);
        if (isNaN(colIndex)) {
          throw new InvalidReferenceError();
        }
        if (relativeCol) {
          if (!basePosition) {
            throw new InvalidReferenceError();
          }
          colIndex += basePosition.col;
        } else {
          colIndex -= 1;
        }
        if (colIndex < 0) {
          throw new InvalidReferenceError();
        }
        colPart = numberToLetters(colIndex);
      }
      const address = colPart + rowPart;
      return (colPart && rowPart) || !singleCellReference ? address : `${address}:${address}`;
    })
    .join(":");
  return getFullReference(sheetName, range);
}
