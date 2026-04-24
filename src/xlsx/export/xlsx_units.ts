import { HEIGHT_FACTOR, WIDTH_FACTOR } from "../constants";

/**
 * Export-direction unit conversions (o-spreadsheet px → Excel units).
 * The inverse conversions used by import live in
 * `src/xlsx/helpers/content_helpers.ts` alongside other import helpers.
 */

export function convertHeightToExcel(height: number): number {
  return Math.round(HEIGHT_FACTOR * height * 100) / 100;
}

export function convertWidthToExcel(width: number): number {
  return Math.round(WIDTH_FACTOR * width * 100) / 100;
}

/**
 * Convert a value expressed in dot to EMU.
 * EMU = English Metrical Unit
 * There are 914400 EMU per inch.
 *
 * /!\ A value expressed in EMU cannot be fractional.
 * See https://docs.microsoft.com/en-us/windows/win32/vml/msdn-online-vml-units#other-units-of-measurement
 */
export function convertDotValueToEMU(value: number) {
  const DPI = 96;
  return Math.round((value * 914400) / DPI);
}
