//------------------------------------------------------------------------------
// Coordinate
//------------------------------------------------------------------------------

import type { HeaderIndex, Position, RangePart } from "../types";

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

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" as const;
const LETTERS_NUMBER_MAPPING = {};
for (const letter of LETTERS) {
  const colIndex = letter.charCodeAt(0) - 64;
  LETTERS_NUMBER_MAPPING[letter] = colIndex;
  LETTERS_NUMBER_MAPPING[letter.toLowerCase()] = colIndex;
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
    const charCode = LETTERS_NUMBER_MAPPING[letters[i]];
    result += charCode * pow;
    pow *= 26;
  }
  return result;
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
  let numberPartStart: number | undefined = undefined;

  // Note: looping by hand is uglier but ~2x faster than using a regex to match number/letter parts
  for (let i = 0; i < xc.length; i++) {
    const char = xc[i];

    // as long as we haven't found the number part, keep advancing
    if (!numberPartStart) {
      if ((char === "$" && i === 0) || isCharALetter(char)) {
        continue;
      }
      numberPartStart = i;
    }

    // Number part
    if (!isCharADigit(char)) {
      if (char === "$" && i === numberPartStart) {
        continue;
      }
      throw new Error(`Invalid cell description: ${xc}`);
    }
  }

  if (!numberPartStart || numberPartStart === xc.length) {
    throw new Error(`Invalid cell description: ${xc}`);
  }

  const letterPart = xc[0] === "$" ? xc.slice(1, numberPartStart) : xc.slice(0, numberPartStart);
  const numberPart =
    xc[numberPartStart] === "$" ? xc.slice(numberPartStart + 1) : xc.slice(numberPartStart);

  // limit to max 3 letters and 7 numbers to avoid
  // gigantic numbers that would be a performance killer
  // down the road
  if (
    letterPart.length < 1 ||
    letterPart.length > 3 ||
    numberPart.length < 1 ||
    numberPart.length > 7
  ) {
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
