// Helper file for the reference types in Xcs (the $ symbol, eg. A$1)
import type { Token } from "../formulas";
import { getCanonicalSheetName } from "./misc";
import { splitReference } from "./references";

type FixedReferenceType = "col" | "row" | "colrow" | "none";

/**
 * Change the reference types inside the given token, if the token represent a range or a cell
 *
 * Eg. :
 *   A1 => $A$1 => A$1 => $A1 => A1
 *   A1:$B$1 => $A$1:B$1 => A$1:$B1 => $A1:B1 => A1:$B$1
 */
export function loopThroughReferenceType(token: Readonly<Token>): Token {
  if (token.type !== "REFERENCE") return token;
  const { xc, sheetName } = splitReference(token.value);
  const [left, right] = xc.split(":") as [string, string | undefined];

  const sheetRef = sheetName ? `${getCanonicalSheetName(sheetName)}!` : "";
  const updatedLeft = getTokenNextReferenceType(left);
  const updatedRight = right ? `:${getTokenNextReferenceType(right)}` : "";
  return { ...token, value: sheetRef + updatedLeft + updatedRight };
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
      xc = setXcToReferenceType(xc, "colrow");
      break;
    case "colrow":
      xc = setXcToReferenceType(xc, "row");
      break;
    case "row":
      xc = setXcToReferenceType(xc, "col");
      break;
    case "col":
      xc = setXcToReferenceType(xc, "none");
      break;
  }
  return xc;
}

/**
 * Returns the given XC with the given reference type.
 */
function setXcToReferenceType(xc: string, referenceType: FixedReferenceType): string {
  xc = xc.replace(/\$/g, "");
  let indexOfNumber: number;
  switch (referenceType) {
    case "col":
      return "$" + xc;
    case "row":
      indexOfNumber = xc.search(/[0-9]/);
      return xc.slice(0, indexOfNumber) + "$" + xc.slice(indexOfNumber);
    case "colrow":
      indexOfNumber = xc.search(/[0-9]/);
      if (indexOfNumber === -1 || indexOfNumber === 0) {
        // no row number (eg. A) or no column (eg. 1)
        return "$" + xc;
      }
      xc = xc.slice(0, indexOfNumber) + "$" + xc.slice(indexOfNumber);
      return "$" + xc;
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
