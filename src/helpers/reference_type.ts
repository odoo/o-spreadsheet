// Helper file for the reference types in Xcs (the $ symbol, eg. A$1)
import { Token } from "../formulas";
import { EnrichedToken, composerTokenize } from "../formulas/composer_tokenizer";
import { Locale } from "../types";
import { getCanonicalSymbolName } from "./misc";
import { getFullReference, splitReference } from "./references";

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
      if (!hasCol) return xc;
      return "$" + xc;
    case "row":
      if (!hasRow) return xc;
      return xc.slice(0, indexOfNumber) + "$" + xc.slice(indexOfNumber);
    case "colrow":
      if (!hasRow || !hasCol) return "$" + xc;
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

/**
 * Return the cycled reference if any (A1 -> $A$1 -> A$1 -> $A1 -> A1)
 */
export function cycleFixedReference(
  selection: { start: number; end: number },
  content: string,
  locale: Locale
) {
  const currentTokens: EnrichedToken[] = content.startsWith("=")
    ? composerTokenize(content, locale)
    : [];

  const tokens = currentTokens.filter(
    (t) =>
      (t.start <= selection.start && t.end >= selection.start) ||
      (t.start >= selection.start && t.start < selection.end)
  );

  const refTokens = tokens.filter((token) => token.type === "REFERENCE");
  if (refTokens.length === 0) {
    return;
  }

  const updatedReferences = tokens
    .map(loopThroughReferenceType)
    .map((token) => token.value)
    .join("");

  const start = tokens[0].start;
  const end = tokens[tokens.length - 1].end;
  const newContent = content.slice(0, start) + updatedReferences + content.slice(end);
  const lengthDiff = newContent.length - content.length;
  const startOfTokens = refTokens[0].start;
  const endOfTokens = refTokens[refTokens.length - 1].end + lengthDiff;
  const newSelection = { start: startOfTokens, end: endOfTokens };
  if (refTokens.length === 1 && selection.start === selection.end) {
    newSelection.start = newSelection.end;
  }
  return { content: newContent, selection: newSelection };
}
