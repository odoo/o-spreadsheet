const numberRegexp = /^-?\d+(,\d+)*(\.?\d*(e\d+)?)?%?$|^-?\.\d+%?$/;

/**
 * Return true if the argument is a "number string".
 *
 * Note that "" (empty string) does not count as a number string
 */
export function isNumber(value: string): boolean {
  // TO DO: add regexp for DATE string format (ex match: "28 02 2020")
  // TO DO: add regexp for exp format (ex match: "42E10")
  if (!value.trim().match(numberRegexp)) {
    return false;
  }
  return true;
}

/**
 * Convert a string into a number.
 *
 * Note that it accepts "" (empty string), even though it does not count as a
 * number from the point of view of the isNumber function.
 */
export function parseNumber(str: string): number {
  let n = Number(str);
  if (isNaN(n) && str.includes("%")) {
    n = Number(str.split("%")[0]);
    if (!isNaN(n)) {
      return n / 100;
    }
  }
  return n;
}
