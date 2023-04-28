//------------------------------------------------------------------------------
// Coordinate
//------------------------------------------------------------------------------

import { HeaderIndex, Position, RangePart } from "../types";
import { cellReference } from "./references";

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

/**
 * Convert a string (describing a column) to its number value.
 *
 * Examples:
 *     'A' => 0
 *     'Z' => 25
 *     'AA' => 26
 */
export function lettersToNumber(letters: string): number {
  let result = -1;
  const l = letters.length;
  let pow = 1;
  for (let i = l - 1; i >= 0; i--) {
    const charCode = letters[i].charCodeAt(0) - 64;
    result += charCode * pow;
    pow *= 26;
  }
  return result;
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
  xc = xc.toUpperCase().trim();
  const match = xc.match(cellReference);
  if (match !== null) {
    const [m, letters, numbers] = match;
    if (m === xc) {
      const col = lettersToNumber(letters);
      const row = parseInt(numbers, 10) - 1;
      return { col, row };
    }
  }
  throw new Error(`Invalid cell description: ${xc}`);
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
