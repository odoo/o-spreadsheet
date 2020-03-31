const numberRegexp = /^-?\d+(,\d+)*(\.\d*(e\d+)?)?%?$|^-?\.\d+%?$/;

export function isNumber(value: any): boolean {
  // TO DO: add regexp for DATE string format (ex match: "28 02 2020")
  // TO DO: add regexp for exp format (ex match: "42E10")
  if (typeof value === "string" && !value.trim().match(numberRegexp)) {
    return false;
  }
  return true;
}

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
