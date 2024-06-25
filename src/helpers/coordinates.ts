//------------------------------------------------------------------------------
// Coordinate
//------------------------------------------------------------------------------

import { HeaderIndex, Position, RangePart } from "../types";

/**
 * Convert a (col) number to the corresponding letter.
 *
 * Examples:
 *     0 => 'A'
 *     25 => 'Z'
 *     26 => 'AA'
 *     27 => 'AB'
 */
export function numberToLetters(n: number): string {
  if (n < 0) {
    throw new Error(`number must be positive. Got ${n}`);
  }
  if (n < 26) {
    return String.fromCharCode(65 + n);
  } else {
    return numberToLetters(Math.floor(n / 26) - 1) + numberToLetters(n % 26);
  }
}

export function lettersToNumber(letters: string): number {
  let result = 0;
  const l = letters.length;
  for (let i = 0; i < l; i++) {
    const charCode = letters.charCodeAt(i);
    const colIndex = charCode >= 65 && charCode <= 90 ? charCode - 64 : charCode - 96;
    result = result * 26 + colIndex;
  }
  return result - 1;
}

function isCharALetter(char: string) {
  return (char >= "A" && char <= "Z") || (char >= "a" && char <= "z");
}

function isCharADigit(char: string) {
  return char >= "0" && char <= "9";
}

/**
 * Convert a "XC" coordinate to cartesian coordinates.
 *
 * Examples:
 *   A1 => [0,0]
 *   B3 => [1,2]
 *
 * Note: it also accepts lowercase coordinates, but not fixed references
 */
export function toCartesian(xc: string): Position {
  xc = xc.trim();

  let letterPart = "";
  let numberPart = "";
  let i = 0;

  // Process letter part
  if (xc[i] === "$") i++;
  while (i < xc.length && isCharALetter(xc[i])) {
    letterPart += xc[i++];
  }

  if (letterPart.length === 0 || letterPart.length > 3) {
    // limit to max 3 letters for performance reasons
    throw new Error(`Invalid cell description: ${xc}`);
  }

  // Process number part
  if (xc[i] === "$") i++;
  while (i < xc.length && isCharADigit(xc[i])) {
    numberPart += xc[i++];
  }

  if (i !== xc.length || numberPart.length === 0 || numberPart.length > 7) {
    // limit to max 7 numbers for performance reasons
    throw new Error(`Invalid cell description: ${xc}`);
  }

  const col = lettersToNumber(letterPart);
  const row = Number(numberPart) - 1;
  if (isNaN(row)) {
    throw new Error(`Invalid cell description: ${xc}`);
  }
  return { col, row };
}

/**
 * Convert from cartesian coordinate to the "XC" coordinate system.
 *
 * Examples:
 *   - 0,0 => A1
 *   - 1,2 => B3
 *   - 0,0, {colFixed: false, rowFixed: true} => A$1
 *   - 1,2, {colFixed: true, rowFixed: false} => $B3
 */
export function toXC(
  col: HeaderIndex,
  row: HeaderIndex,
  rangePart: RangePart = { colFixed: false, rowFixed: false }
): string {
  return (
    (rangePart.colFixed ? "$" : "") +
    numberToLetters(col) +
    (rangePart.rowFixed ? "$" : "") +
    String(row + 1)
  );
}
