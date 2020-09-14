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

const defaultMaximumDecimalPlaces = 10;
/**
 * Function used to give the default format of a cell with a number for value.
 * It is considered that the default format of a number is "0" followed by as
 * many "0" as there are decimal places. Three rules define the number of decimal
 * places:
 *
 * - number of decimal places limited to 10 for values ​​below 1 and composed only
 * of decimals.
 *
 * - if the length of the integer part is equal to 1 there will be 9 maximum
 * places for the decimals, if equal to 2 => 8 places maximum, if equal 3 ...
 * if equal 9 => 1 place.
 *
 * - for all integer parts whose length is greater than or equal to 10, the
 * number of decimal places is 0
 *
 * Exemple:
 * - 1 --> '0'
 * - 123 --> '0'
 * - 12345 --> '0'
 * - 42.1 --> '0.0'
 * - 456.0001 --> '0.0000'
 * - 12345.678912345 --> '0.00000'
 * - 1234567.00012345 --> '0'
 */
export function getDefaultNumberFormat(cellValue: number): string {
  const strValue = cellValue.toString();
  const parts = strValue.split(".");
  if (parts.length === 1) {
    return "0";
  }
  const integers = parts[0].length;
  const decimals = parts[1].length;
  const remainingDecimalPlaces =
    parts[0] === "0"
      ? defaultMaximumDecimalPlaces
      : Math.max(defaultMaximumDecimalPlaces - integers, 0);
  const decimalPlaces = Math.min(remainingDecimalPlaces, decimals);

  // Suppose the cell value 12345.678901, at this point decimalPlaces = 5 and
  // the format returned by the function will be "0.00000". With this format,
  // the value returned by formatDecimal will be "12345.67890" except that we
  // don't want to display 0 as the last position. We must therefore remove "0"
  // from the format when there are useless 0 in the value.

  const zeros = /0+$/.exec(parts[1].substring(0, decimalPlaces));
  const uselessZeros = zeros ? zeros[0].length : 0;
  const netZeros = decimalPlaces - uselessZeros;
  return "0" + (netZeros === 0 ? "" : ".") + Array(netZeros + 1).join("0");
}

const decimalStandardRepresentation = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  maximumFractionDigits: 10,
});
export function formatStandardNumber(n: number): string {
  if (n < 0) {
    return "-" + formatStandardNumber(-n);
  }
  const str = n.toString();
  if (str.includes("e")) {
    return decimalStandardRepresentation.format(n);
  }
  return _formatValue(n, getDefaultNumberFormat(n));
}

export const maximumDecimalPlaces = 20;
export function formatDecimal(n: number, decimals: number, sep: string = ""): string {
  if (n < 0) {
    return "-" + formatDecimal(-n, decimals);
  }
  const decimalPlaces = decimals >= maximumDecimalPlaces ? maximumDecimalPlaces : decimals;
  const formatter = getFormatter(decimalPlaces);
  let result = formatter.format(n);
  if (sep) {
    let p: number = result.indexOf(".")!;
    result = result.replace(/\d(?=(?:\d{3})+(?:\.|$))/g, (m, i) =>
      p < 0 || i < p ? `${m}${sep}` : m
    );
  }
  return result;
}

// this is a cache than can contains decimal representation formats
// from 0 (minimum) to 20 (maximum) digits after the decimal point
let decimalRepresentations: Intl.NumberFormat[] = [];

function getFormatter(decimalPlaces: number): Intl.NumberFormat {
  let formatter = decimalRepresentations[decimalPlaces];
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      useGrouping: false,
    });
    decimalRepresentations[decimalPlaces] = formatter;
  }
  return formatter;
}

export function formatPercent(n: number): string {
  return formatDecimal(100 * n, 2) + "%";
}

export function formatNumber(value: any, format: string): string {
  const parts = format.split(";");
  const l = parts.length;
  if (value < 0) {
    if (l > 1) {
      return _formatValue(-value, parts[1]);
    } else {
      return "-" + _formatValue(-value, parts[0]);
    }
  }
  const index = l === 3 && value === 0 ? 2 : 0;
  return _formatValue(value, parts[index]);
}

function _formatValue(value: any, format: string): string {
  const parts = format.split(".");
  const decimals = parts.length === 1 ? 0 : parts[1].match(/0/g)!.length;
  const separator = parts[0].includes(",") ? "," : "";
  const isPercent = format.includes("%");
  if (isPercent) {
    value = value * 100;
  }
  const rawNumber = formatDecimal(value, decimals, separator);
  if (isPercent) {
    return rawNumber + "%";
  }
  return rawNumber;
}
