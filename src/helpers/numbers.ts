import { Locale } from "../types";
import { escapeRegExp, memoize } from "./misc";

/**
 * This function returns a regexp that is supposed to be as close as possible as the numberRegexp,
 * but its purpose is to be used by the tokenizer.
 *
 * - it tolerates extra characters at the end. This is useful because the tokenizer
 *   only needs to find the number at the start of a string
 * - it does not support % symbol, in formulas % is an operator
 */
export const getFormulaNumberRegex = memoize(function getFormulaNumberRegex(
  decimalSeparator: string
) {
  decimalSeparator = escapeRegExp(decimalSeparator);
  return new RegExp(
    `(?:^-?\\d+(?:${decimalSeparator}?\\d*(?:e\\d+)?)?|^-?${decimalSeparator}\\d+)(?!\\w|!)`
  );
});

const getNumberRegex = memoize(function getNumberRegex(locale: Locale) {
  const decimalSeparator = escapeRegExp(locale.decimalSeparator);
  const thousandsSeparator = escapeRegExp(locale.thousandsSeparator);

  const pIntegerAndDecimals = `(?:\\d+(?:${thousandsSeparator}\\d{3,})*(?:${decimalSeparator}\\d*)?)`; // pattern that match integer number with or without decimal digits
  const pOnlyDecimals = `(?:${decimalSeparator}\\d+)`; // pattern that match only expression with decimal digits
  const pScientificFormat = "(?:e(?:\\+|-)?\\d+)?"; // pattern that match scientific format between zero and one time (should be placed before pPercentFormat)
  const pPercentFormat = "(?:\\s*%)?"; // pattern that match percent symbol between zero and one time
  const pNumber =
    "(?:\\s*" +
    pIntegerAndDecimals +
    "|" +
    pOnlyDecimals +
    ")" +
    pScientificFormat +
    pPercentFormat;
  const pMinus = "(?:\\s*-)?"; // pattern that match negative symbol between zero and one time
  const pCurrencyFormat = "(?:\\s*[\\$€])?";

  const p1 = pMinus + pCurrencyFormat + pNumber;
  const p2 = pMinus + pNumber + pCurrencyFormat;
  const p3 = pCurrencyFormat + pMinus + pNumber;

  const pNumberExp = "^(?:(?:" + [p1, p2, p3].join(")|(?:") + "))$";

  const numberRegexp = new RegExp(pNumberExp, "i");

  return numberRegexp;
});

/**
 * Return true if the argument is a "number string".
 *
 * Note that "" (empty string) does not count as a number string
 */
export function isNumber(value: string | undefined, locale: Locale): boolean {
  if (!value) return false;
  // TO DO: add regexp for DATE string format (ex match: "28 02 2020")
  return getNumberRegex(locale).test(value.trim());
}

const getInvaluableSymbolsRegexp = memoize(function getInvaluableSymbolsRegexp(locale: Locale) {
  return new RegExp(`[\$€${escapeRegExp(locale.thousandsSeparator)}]`, "g");
});
/**
 * Convert a string into a number. It assumes that the string actually represents
 * a number (as determined by the isNumber function)
 *
 * Note that it accepts "" (empty string), even though it does not count as a
 * number from the point of view of the isNumber function.
 */
export function parseNumber(str: string, locale: Locale): number {
  if (locale.decimalSeparator !== ".") {
    str = str.replace(locale.decimalSeparator, ".");
  }
  // remove invaluable characters
  str = str.replace(getInvaluableSymbolsRegexp(locale), "");
  let n = Number(str);
  if (isNaN(n) && str.includes("%")) {
    n = Number(str.split("%")[0]);
    if (!isNaN(n)) {
      return n / 100;
    }
  }
  return n;
}

export function percentile(values: number[], percent: number, isInclusive: boolean) {
  const sortedValues = [...values].sort((a, b) => a - b);

  let percentIndex = (sortedValues.length + (isInclusive ? -1 : 1)) * percent;
  if (!isInclusive) {
    percentIndex--;
  }
  if (Number.isInteger(percentIndex)) {
    return sortedValues[percentIndex];
  }
  const indexSup = Math.ceil(percentIndex);
  const indexLow = Math.floor(percentIndex);
  return (
    sortedValues[indexSup] * (percentIndex - indexLow) +
    sortedValues[indexLow] * (indexSup - percentIndex)
  );
}
