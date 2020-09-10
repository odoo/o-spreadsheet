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

export const DEBUG: { [key: string]: any } = {};
