/**
 * This regexp is supposed to be as close as possible as the numberRegexp, but
 * its purpose is to be used by the tokenizer.
 *
 * - it tolerates extra characters at the end. This is useful because the tokenizer
 *   only needs to find the number at the start of a string
 * - it does not accept "," as thousand separator, because when we tokenize a
 *   formula, commas are used to separate arguments
 * - it does not support % symbol, in formulas % is an operator
 */
export const formulaNumberRegexp = /^-?\d+(\.?\d*(e\d+)?)?|^-?\.\d+/;

const pIntegerAndDecimals = "(\\d+(,\\d{3,})*(\\.\\d*)?)"; // pattern that match integer number with or without decimal digits
const pOnlyDecimals = "(\\.\\d+)"; // pattern that match only expression with decimal digits
const pScientificFormat = "(e(\\+|-)?\\d+)?"; // pattern that match scientific format between zero and one time (should be placed before pPercentFormat)
const pPercentFormat = "(\\s*%)?"; // pattern that match percent symbol between zero and one time
const pNumber =
  "(\\s*" + pIntegerAndDecimals + "|" + pOnlyDecimals + ")" + pScientificFormat + pPercentFormat;
const pMinus = "(\\s*-)?"; // pattern that match negative symbol between zero and one time
const pCurrencyFormat = "(\\s*[\\$€])?";

const p1 = pMinus + pCurrencyFormat + pNumber;
const p2 = pMinus + pNumber + pCurrencyFormat;
const p3 = pCurrencyFormat + pMinus + pNumber;

const pNumberExp = "^((" + [p1, p2, p3].join(")|(") + "))$";

const numberRegexp = new RegExp(pNumberExp, "i");

/**
 * Return true if the argument is a "number string".
 *
 * Note that "" (empty string) does not count as a number string
 */
export function isNumber(value: string | undefined): boolean {
  if (!value) return false;
  // TO DO: add regexp for DATE string format (ex match: "28 02 2020")
  return numberRegexp.test(value.trim());
}

const invaluableSymbolsRegexp = /[,\$€]+/g;
/**
 * Convert a string into a number. It assumes that the string actually represents
 * a number (as determined by the isNumber function)
 *
 * Note that it accepts "" (empty string), even though it does not count as a
 * number from the point of view of the isNumber function.
 */
export function parseNumber(str: string): number {
  // remove invaluable characters
  str = str.replace(invaluableSymbolsRegexp, "");
  let n = Number(str);
  if (isNaN(n) && str.includes("%")) {
    n = Number(str.split("%")[0]);
    if (!isNaN(n)) {
      return n / 100;
    }
  }
  return n;
}
