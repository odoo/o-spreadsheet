//------------------------------------------------------------------------------
// Miscellaneous
//------------------------------------------------------------------------------

import { DEFAULT_FONT, DEFAULT_FONT_SIZE, DEFAULT_FONT_WEIGHT } from "../constants";
import { fontSizeMap } from "../fonts";
import { Style } from "../types";

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

export function computeTextWidth(context: CanvasRenderingContext2D, text: string, style: Style) {
  const italic = style.italic ? "italic " : "";
  const weight = style.bold ? "bold" : DEFAULT_FONT_WEIGHT;
  const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
  const size = fontSizeMap[sizeInPt];
  context.font = `${italic}${weight} ${size}px ${DEFAULT_FONT}`;
  return context.measureText(text).width;
}

/**
 * Create a range from start (included) to end (excluded)
 * range(10, 13) => [10, 11, 12]
 */
export function range(start: number, end: number) {
  if (end <= start) {
    return [];
  }
  const array: number[] = Array(end - start);
  for (let i = 0; i < end - start; i++) {
    array[i] = start + i;
  }
  return array;
}

/**
 * Groups consecutive numbers.
 * The input array is assumed to be sorted
 * @param numbers
 */
export function groupConsecutive(numbers: number[]): number[][] {
  return numbers.reduce((groups, currentRow, index, rows) => {
    if (Math.abs(currentRow - rows[index - 1]) === 1) {
      const lastGroup = groups[groups.length - 1];
      lastGroup.push(currentRow);
    } else {
      groups.push([currentRow]);
    }
    return groups;
  }, [] as number[][]);
}

/**
 * This helper function can be used as a type guard when filtering arrays.
 * const foo: number[] = [1, 2, undefined, 4].filter(isDefined)
 */
export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}

export const DEBUG: { [key: string]: any } = {};
