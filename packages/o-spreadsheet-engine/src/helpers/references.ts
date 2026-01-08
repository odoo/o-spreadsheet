import { Token } from "../formulas/tokenizer";
import { getCanonicalSymbolName, getUnquotedSheetName } from "./misc";

export const cellReference = new RegExp(/\$?([A-Z]{1,3})\$?([0-9]{1,7})/, "i");
const singleCellReference = new RegExp(/^\$?([A-Z]{1,3})\$?([0-9]{1,7})$/, "i");
const colHeader = new RegExp(/^\$?([A-Z]{1,3})+$/, "i");
const rowHeader = new RegExp(/^\$?([0-9]{1,7})+$/, "i");
const colReference = new RegExp(/^\s*('.+'!|[^']+!)?\$?([A-Z]{1,3})$/, "i");
const rowReference = new RegExp(/^\s*('.+'!|[^']+!)?\$?([0-9]{1,7})$/, "i");
const fullRowXc = /(\$?[A-Z]{1,3})?\$?[0-9]{1,7}\s*:\s*(\$?[A-Z]{1,3})?\$?[0-9]{1,7}\s*/i;
const fullColXc = /\$?[A-Z]{1,3}(\$?[0-9]{1,7})?\s*:\s*\$?[A-Z]{1,3}(\$?[0-9]{1,7})?\s*/i;

export const rangeReference = new RegExp(
  /^\s*('.+'!|[^']+!)?/.source +
    "(" +
    [cellReference.source, fullRowXc.source, fullColXc.source].join("|") +
    ")" +
    /$/.source,
  "i"
);

export function isColReference(xc: string): boolean {
  return colReference.test(xc);
}

export function isRowReference(xc: string): boolean {
  return rowReference.test(xc);
}

export function isColHeader(str: string): boolean {
  return colHeader.test(str);
}

export function isRowHeader(str: string): boolean {
  return rowHeader.test(str);
}

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

export function getFullReference(sheetName: string | undefined, xc: string): string {
  return sheetName !== undefined ? `${getCanonicalSymbolName(sheetName)}!${xc}` : xc;
}
type FixedReferenceType = "col" | "row" | "colrow" | "none";

/**
 * Change the reference types inside the given token, if the token represent a range or a cell
 *
 * Eg. :
 *   A1 => $A$1 => A$1 => $A1 => A1
 *   A1:$B$1 => $A$1:B$1 => A$1:$B1 => $A1:B1 => A1:$B$1
 */
export function loopThroughReferenceType(token: Readonly<Token>): Token {
  if (token.type !== "REFERENCE") {
    return token;
  }
  const { xc, sheetName } = splitReference(token.value);
  const [left, right] = xc.split(":") as [string, string | undefined];

  const updatedLeft = getTokenNextReferenceType(left);
  const updatedRight = right ? `:${getTokenNextReferenceType(right)}` : "";
  return { ...token, value: getFullReference(sheetName, updatedLeft + updatedRight) };
}

/**
 * Get a new token with a changed type of reference from the given cell token symbol.
 * Undefined behavior if given a token other than a cell or if the Xc contains a sheet reference
 *
 * A1 => $A$1 => A$1 => $A1 => A1
 */
function getTokenNextReferenceType(xc: string): string {
  switch (getReferenceType(xc)) {
    case "none":
      xc = setXcToFixedReferenceType(xc, "colrow");
      break;
    case "colrow":
      xc = setXcToFixedReferenceType(xc, "row");
      break;
    case "row":
      xc = setXcToFixedReferenceType(xc, "col");
      break;
    case "col":
      xc = setXcToFixedReferenceType(xc, "none");
      break;
  }
  return xc;
}

/**
 * Returns the given XC with the given reference type.
 */
export function setXcToFixedReferenceType(xc: string, referenceType: FixedReferenceType): string {
  let sheetName;
  ({ sheetName, xc } = splitReference(xc));
  sheetName = sheetName ? getCanonicalSymbolName(sheetName) + "!" : "";

  xc = xc.replace(/\$/g, "");
  const splitIndex = xc.indexOf(":");
  if (splitIndex >= 0) {
    return `${sheetName}${_setXcToFixedReferenceType(
      xc.slice(0, splitIndex),
      referenceType
    )}:${_setXcToFixedReferenceType(xc.slice(splitIndex + 1), referenceType)}`;
  } else {
    return sheetName + _setXcToFixedReferenceType(xc, referenceType);
  }
}

function _setXcToFixedReferenceType(xc: string, referenceType: FixedReferenceType): string {
  const indexOfNumber = xc.search(/[0-9]/);
  const hasCol = indexOfNumber !== 0;
  const hasRow = indexOfNumber >= 0;
  switch (referenceType) {
    case "col":
      if (!hasCol) {
        return xc;
      }
      return "$" + xc;
    case "row":
      if (!hasRow) {
        return xc;
      }
      return xc.slice(0, indexOfNumber) + "$" + xc.slice(indexOfNumber);
    case "colrow":
      if (!hasRow || !hasCol) {
        return "$" + xc;
      }
      return "$" + xc.slice(0, indexOfNumber) + "$" + xc.slice(indexOfNumber);
    case "none":
      return xc;
  }
}

/**
 * Return the type of reference used in the given XC of a cell.
 * Undefined behavior if the XC have a sheet reference
 */
function getReferenceType(xcCell: string): FixedReferenceType {
  if (isColAndRowFixed(xcCell)) {
    return "colrow";
  } else if (isColFixed(xcCell)) {
    return "col";
  } else if (isRowFixed(xcCell)) {
    return "row";
  }
  return "none";
}

function isColFixed(xc: string) {
  return xc.startsWith("$");
}

function isRowFixed(xc: string) {
  return xc.includes("$", 1);
}

function isColAndRowFixed(xc: string) {
  return xc.startsWith("$") && xc.length > 1 && xc.slice(1).includes("$");
}
