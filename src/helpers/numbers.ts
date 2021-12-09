/**
 * This regexp is supposed to be as close as possible as the numberRegexp, but
 * its purpose is to be used by the tokenizer.
 *
 * - it tolerates extra characters at the end. This is useful because the tokenizer
 *   only needs to find the number at the start of a string
 * - it does not accept "," as thousand separator, because when we tokenize a
 *   formula, commas are used to separate arguments
 */
export const formulaNumberRegexp = /^(-\s*)?((\d+(\.\d*)?)|(\.\d+))(e(\+|-)?\d+)?(\s*%)?/i;

// (-\s*)?                match negative symbol between zero and one time
// (
// (\d+(,\d+)*(\.\d*)?)   match integer number with or without decimal digits
// |                      or
// (\.\d+)                match only expression with decimal digits
// )
// (e(\+|-)?\d+)?         match scientific format between zero and one time
// (s*%)?                 match percent symbol between zero and one time
export const numberRegexp = /^(-\s*)?((\d+(,\d+)*(\.\d*)?)|(\.\d+))(e(\+|-)?\d+)?(\s*%)?$/i;

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

/** This function aims to give a format for number to display in the composer.
 * - the number will be displayed with all the digits stored on it
 * - the number will be displayed in scientific language if 10 digits isn't enough
 * to represent its magnitude order (mean if it is greater or equal than
 * 10 000 000 000 or less than 0.000 000 001)
 */
export function formatComposerNumber(n: number): string {
  if (n < 0) {
    return "-" + formatComposerNumber(-n);
  }

  if (n === 0) {
    return "0";
  }

  if (10000000000 > Math.abs(n) && Math.abs(n) >= 0.000000001) {
    // for numbers value smaller  than '0.000001' --> javascript will display number
    // with a scientific language without displaying all digits on the number.
    // return n.toString() isn't enough to manage smaller numbers.

    // we use the "toExponential" function to extract all digits on the value.
    const [exponentialRepresentation, magnitudeOrder] = n.toExponential().split("e");
    const decimalDigits = exponentialRepresentation.replace(".", "");
    const decimalMagnitudeOrder = Number(magnitudeOrder) + 1;

    // exponentialRepresentation: 1.234, magnitudeOrder: E+3
    // --> decimalDigits 1234, decimalMagnitudeOrder: 4

    if (decimalMagnitudeOrder <= 0) {
      // ex: decimalDigits "1234", decimalMagnitudeOrder: 0 --> "0.1234"
      // ex: decimalDigits "1234", decimalMagnitudeOrder: -2 --> "0.001234"
      return "0." + Array(-decimalMagnitudeOrder + 1).join("0") + decimalDigits;
    }

    const decimalDigitsLength = decimalDigits.length;
    if (decimalDigitsLength > decimalMagnitudeOrder) {
      // decimalDigits 123456, decimalMagnitudeOrder: E+3 --> 123.456
      // decimalDigits 123456, decimalMagnitudeOrder: E+1 --> 1.23456
      return (
        decimalDigits.slice(0, decimalMagnitudeOrder) +
        "." +
        decimalDigits.slice(decimalMagnitudeOrder)
      );
    }

    // decimalDigitsLength <= decimalMagnitudeOrder)
    // decimalDigits 123456, decimalMagnitudeOrder: E+6 --> 123456
    // decimalDigits 123456, decimalMagnitudeOrder: E+8 --> 12345600
    return decimalDigits + Array(decimalMagnitudeOrder - decimalDigitsLength + 1).join("0");
  }
  return n.toExponential().toUpperCase();
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
