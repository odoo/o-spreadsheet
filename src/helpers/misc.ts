//------------------------------------------------------------------------------
// Miscellaneous
//------------------------------------------------------------------------------

/**
 * Stringify an object, like JSON.stringify, except that the first level of keys
 * is ordered.
 */
export function stringify(obj: any): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Sanitize the name of a sheet, by eventually removing quotes
 * @param sheet name of the sheet
 */
export function sanitizeSheet(sheet: string): string {
  if (sheet && sheet.startsWith("'")) {
    sheet = sheet.slice(1, -1).replace(/''/g, "'");
  }
  return sheet;
}

export function clip(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

export const DEBUG: { [key: string]: any } = {};
