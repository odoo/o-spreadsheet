import { HeaderIndex, Position } from "../types/misc";
import { RangePart } from "../types/range";

import { TokenizingChars } from "./misc";

//------------------------------------------------------------------------------
// Coordinate
//------------------------------------------------------------------------------
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
    const colIndex = charToNumber(letters[i]);
    result = result * 26 + colIndex;
  }
  return result - 1;
}

function charToNumber(char: string) {
  const charCode = char.charCodeAt(0);
  return charCode >= 65 && charCode <= 90 ? charCode - 64 : charCode - 96;
}

function isCharALetter(char: string) {
  return (char >= "A" && char <= "Z") || (char >= "a" && char <= "z");
}

function isCharADigit(char: string) {
  return char >= "0" && char <= "9";
}

// we limit the max column to 3 letters and max row to 7 digits for performance reasons
export const MAX_COL = lettersToNumber("ZZZ");
export const MAX_ROW = 9999998;

export function consumeSpaces(chars: TokenizingChars) {
  while (chars.current === " ") {
    chars.advanceBy(1);
  }
}

export function consumeLetters(chars: TokenizingChars): number {
  if (chars.current === "$") {
    chars.advanceBy(1);
  }
  if (!chars.current || !isCharALetter(chars.current)) {
    return -1;
  }
  let colCoordinate = 0;
  while (chars.current && isCharALetter(chars.current)) {
    colCoordinate = colCoordinate * 26 + charToNumber(chars.shift());
  }
  return colCoordinate;
}

export function consumeDigits(chars: TokenizingChars): number {
  if (chars.current === "$") {
    chars.advanceBy(1);
  }
  if (!chars.current || !isCharADigit(chars.current)) {
    return -1;
  }
  let num = 0;
  while (chars.current && isCharADigit(chars.current)) {
    num = num * 10 + Number(chars.shift());
  }
  return num;
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
  const chars = new TokenizingChars(xc);

  consumeSpaces(chars);
  const letterPart = consumeLetters(chars);

  if (letterPart === -1 || !chars.current) {
    throw new Error(`Invalid cell description: ${xc}`);
  }

  const num = consumeDigits(chars);
  consumeSpaces(chars);

  const col = letterPart - 1;
  const row = num - 1;
  if (!chars.isOver() || col > MAX_COL || row > MAX_ROW) {
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
