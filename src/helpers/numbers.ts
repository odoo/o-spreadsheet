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

export function formatStandardNumber(n: number): string {
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return decimalStandardRepresentation.format(n);
}

// this is a cache than can contains decimal representation formats
// from 0 (minimum) to 20 (maximum) digits after the decimal point
let decimalRepresentations: Intl.NumberFormat[] = [];

export const maximumDecimalPlaces = 20;

export function formatDecimal(n: number, decimals: number, sep: string = ""): string {
  if (n < 0) {
    return "-" + formatDecimal(-n, decimals);
  }
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
  let result = formatter.format(n);
  if (sep) {
    let p: number = result.indexOf(".")!;
    result = result.replace(/\d(?=(?:\d{3})+(?:\.|$))/g, (m, i) =>
      p < 0 || i < p ? `${m}${sep}` : m
    );
  }
  return result;
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
