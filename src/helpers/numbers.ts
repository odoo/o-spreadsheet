import { Format, FormattedValue } from "../types";

/**
 * This regexp is supposed to be as close as possible as the numberRegexp, but
 * its purpose is to be used by the tokenizer.
 *
 * - it tolerates extra characters at the end. This is useful because the tokenizer
 *   only needs to find the number at the start of a string
 * - it does not accept "," as thousand separator, because when we tokenize a
 *   formula, commas are used to separate arguments
 */
export const formulaNumberRegexp = /^-?\d+(\.?\d*(e\d+)?)?(\s*%)?|^-?\.\d+(\s*%)?/;

export const numberRegexp = /^-?\d+(,\d+)*(\.?\d*(e\d+)?)?(\s*%)?$|^-?\.\d+(\s*%)?$/;

/**
 * Return true if the argument is a "number string".
 *
 * Note that "" (empty string) does not count as a number string
 */
export function isNumber(value: string): boolean {
  // TO DO: add regexp for DATE string format (ex match: "28 02 2020")
  return numberRegexp.test(value.trim());
}

const commaRegexp = /,/g;
/**
 * Convert a string into a number. It assumes that the string actually represents
 * a number (as determined by the isNumber function)
 *
 * Note that it accepts "" (empty string), even though it does not count as a
 * number from the point of view of the isNumber function.
 */
export function parseNumber(str: string): number {
  let n = Number(str.replace(commaRegexp, ""));
  if (isNaN(n) && str.includes("%")) {
    n = Number(str.split("%")[0]);
    if (!isNaN(n)) {
      return n / 100;
    }
  }
  return n;
}

const decimalStandardRepresentation = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  maximumFractionDigits: 10,
});

export function formatStandardNumber(n: number): FormattedValue {
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return decimalStandardRepresentation.format(n) as FormattedValue;
}

// this is a cache than can contains decimal representation formats
// from 0 (minimum) to 20 (maximum) digits after the decimal point
let decimalRepresentations: Intl.NumberFormat[] = [];

export const maximumDecimalPlaces = 20;

export function formatDecimal(
  absValue: number,
  decimals: number,
  sep: string = ""
): FormattedValue {
  const maxDecimals = decimals >= maximumDecimalPlaces ? maximumDecimalPlaces : decimals;

  let formatter = decimalRepresentations[maxDecimals];
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: maxDecimals,
      maximumFractionDigits: maxDecimals,
      useGrouping: false,
    });
    decimalRepresentations[maxDecimals] = formatter;
  }
  let result = formatter.format(absValue);
  if (sep) {
    let p: number = result.indexOf(".")!;
    result = result.replace(/\d(?=(?:\d{3})+(?:\.|$))/g, (m, i) =>
      p < 0 || i < p ? `${m}${sep}` : m
    );
  }
  return result;
}
export function formatNumber(value: number, format: Format): FormattedValue {
  if (value < 0) {
    return "-" + _formatNumber(-value, format);
  }
  return _formatNumber(value, format);
}

function _formatNumber(absValue: number, format: Format): FormattedValue {
  const parts = format.split(".");
  const decimals = parts.length === 1 ? 0 : parts[1].match(/0/g)!.length;
  const separator = parts[0].includes(",") ? "," : "";
  const isPercent = format.includes("%");
  if (isPercent) {
    absValue = absValue * 100;
  }
  const rawNumber = formatDecimal(absValue, decimals, separator);
  if (isPercent) {
    return rawNumber + "%";
  }
  return rawNumber;
}
