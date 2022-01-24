/**
 *  Constant used to indicate the maximum of digits that is possible to display
 *  in a cell with standard size.
 */
const STANDARD_MAX_SIGNIFICANT_DIGITS = 10;

/**
 *  Constant used to indicate the maximum of digits that is possible to
 *  display in a cell with standard size when number has scientific format.
 */
const STANDARD_EXPONENTIAL_MAX_SIGNIFICANT_DIGITS = 5;

/**
 * This regexp is supposed to be as close as possible as the numberRegexp, but
 * its purpose is to be used by the tokenizer.
 *
 * - it tolerates extra characters at the end. This is useful because the tokenizer
 *   only needs to find the number at the start of a string
 * - it does not accept "," as thousand separator, because when we tokenize a
 *   formula, commas are used to separate arguments
 * - it does not accept currencies symbols
 */
export const formulaNumberRegexp = /^(-\s*)?((\d+(\.\d*)?)|(\.\d+))(e(\+|-)?\d+)?(\s*%)?/i;

const decimalRegexp = /0/g;

const pIntegerAndDecimals = "(\\d+(,\\d{3,})*(\\.\\d*)?)"; // pattern that match integer number with or without decimal digits
const pOnlyDecimals = "(\\.\\d+)"; // pattern that match only expression with decimal digits
const pScientificFormat = "(e(\\+|-)?\\d+)?"; // pattern that match scientific format between zero and one time
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

export function isNumber(value: string): boolean {
  return numberRegexp.test(value.trim());
}

/**
 * Convert a string into a number. It assumes that the string actually represents
 * a number (as determined by the isNumber function)
 *
 * Note that it accepts "" (empty string), even though it does not count as a
 * number from the point of view of the isNumber function.
 */
export function parseNumber(str: string): number {
  // remove invaluable characters
  str = str.split(/[,\$€]+/).join("");
  let n = Number(str);
  if (isNaN(n) && str.includes("%")) {
    n = Number(str.split("%")[0]);
    if (!isNaN(n)) {
      return n / 100;
    }
  }
  return n;
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

  // IF 10 000 000 000 > value >= 0.000 000 001
  if (
    10 ** STANDARD_MAX_SIGNIFICANT_DIGITS > n &&
    n >= 1 / 10 ** (STANDARD_MAX_SIGNIFICANT_DIGITS - 1)
  ) {
    // for numbers value smaller than '0.000001' --> javascript will display number
    // with a scientific language without displaying all digits on the number.
    // return n.toString() isn't enough to manage smaller numbers.

    // we use the "toExponential" function to extract all significant digits on the value.
    const [exponentialRepresentation, magnitudeOrder] = n.toExponential().split("e");
    const significantDigits = exponentialRepresentation.replace(".", "");
    const significantMagnitudeOrder = Number(magnitudeOrder) + 1;

    // exponentialRepresentation: 1.234, magnitudeOrder: E+3
    // --> significantDigits 1234, significantMagnitudeOrder: 4

    if (significantMagnitudeOrder <= 0) {
      // ex: significantDigits "1234", significantMagnitudeOrder: 0 --> "0.1234"
      // ex: significantDigits "1234", significantMagnitudeOrder: -2 --> "0.001234"
      return "0." + Array(-significantMagnitudeOrder + 1).join("0") + significantDigits;
    }

    const significantDigitsLength = significantDigits.length;
    if (significantDigitsLength > significantMagnitudeOrder) {
      // significantDigits 123456, significantMagnitudeOrder: 3 --> "123.456"
      // significantDigits 123456, significantMagnitudeOrder: 1 --> "1.23456"
      return (
        significantDigits.slice(0, significantMagnitudeOrder) +
        "." +
        significantDigits.slice(significantMagnitudeOrder)
      );
    }

    // significantDigitsLength <= significantMagnitudeOrder)
    // significantDigits 123456, significantMagnitudeOrder: 6 --> "123456"
    // significantDigits 123456, significantMagnitudeOrder: 8 --> "12345600"
    return (
      significantDigits + Array(significantMagnitudeOrder - significantDigitsLength + 1).join("0")
    );
  }

  // to change exponential
  return n.toExponential().toUpperCase();
}

/**
 * This function aims to give a default format for number to display in the grid.
 * Like the 'formatComposerNumber' function, huge numbers will be displayed in scientific
 * format. However displayed decimals are limited to the cell standard width.
 */
export function formatStandardNumber(n: number): string {
  return formatNumber(n, defaultNumberFormat(n));
}

/**
 * The function return a string that represent a number on which a format has been
 * applied.
 */
export function formatNumber(value: number, format: string): string {
  const parts = format.split(";");
  const l = parts.length;
  if (value < 0) {
    if (l > 1) {
      return formatAbsNumber(-value, parts[1]);
    } else {
      return "-" + formatAbsNumber(-value, parts[0]);
    }
  }
  const index = l === 3 && value === 0 ? 2 : 0;
  return formatAbsNumber(value, parts[index]);
}

function formatAbsNumber(absValue: number, format: string): string {
  // 1 - looking for currency format expression
  // currencies format could be :
  // - simple char between quotes, '"$"' or '"€"'
  // - text between hooks started by dollar symbol "[$ £ GB]"

  let currencyFormat = "";
  let currencyFormatIndex: undefined | number = undefined;

  const leftHookIndex = format.indexOf("[$");
  if (leftHookIndex >= 0) {
    currencyFormatIndex = leftHookIndex;
    const rightHookIndex = format.lastIndexOf("]");
    currencyFormat = format.substring(leftHookIndex + 2, rightHookIndex);

    // we remove the currency part from the initial format. This is to avoid
    // disturbing the analysis of the format in the rest of the code
    format = format.substr(0, leftHookIndex) + format.substr(rightHookIndex + 1);
  }

  let quoteIndex = format.indexOf('"');
  if (quoteIndex >= 0) {
    currencyFormatIndex = quoteIndex;
    currencyFormat = format.charAt(quoteIndex + 1);

    // we remove the currency part from the initial format. This is to avoid
    // disturbing the analysis of the format in the rest of the code
    format = format.substr(0, quoteIndex) + format.substr(quoteIndex + 3);
  }

  // 2 - looking for decimal part length
  // we looking for here the number of "0" between:
  // - the decimal separator "." (if exist)
  // - the exponent "E" (if exist)

  let decimalPartLength = 0;
  let [, decimalPart] = format.split(".");
  if (decimalPart) {
    [decimalPart] = decimalPart.split("E");
    decimalPartLength = decimalPart.match(decimalRegexp)!.length;
  }

  // 3 - looking for integer separator
  const integerSeparator = format.includes(",") ? "," : "";

  // 4 - looking for percent format
  const isPercentFormat = format.includes("%");
  if (isPercentFormat) {
    absValue = absValue * 100;
  }

  // 5 - looking for exponent format
  const isExponentialFormat = format.includes("E");
  const [exponentialDigitsValue, magnitudeOrder] = absValue.toExponential().split("e");
  if (isExponentialFormat) {
    absValue = Number(exponentialDigitsValue);
  }

  // Apply format on digits
  let formattedNumber = formatDecimal(absValue, decimalPartLength, integerSeparator);

  // inv 5 - apply exponent format
  if (isExponentialFormat) {
    formattedNumber += formatMagnitudeOrder(magnitudeOrder, format);
  }

  // inv 4 - apply percent format
  if (isPercentFormat) {
    formattedNumber += "%";
  }

  // inv 1 - apply currency format
  if (currencyFormat) {
    const firstDigitIndex = format.indexOf("0");
    if (currencyFormatIndex! < firstDigitIndex) {
      formattedNumber = currencyFormat + formattedNumber;
    } else {
      formattedNumber = formattedNumber + currencyFormat;
    }
  }

  return formattedNumber;
}

export const maximumDecimalPlaces = 20;
export function formatDecimal(n: number, decimals: number, sep: string = ""): string {
  if (n < 0) {
    return "-" + formatDecimal(-n, decimals);
  }
  const maxDecimals = decimals >= maximumDecimalPlaces ? maximumDecimalPlaces : decimals;
  let formatter = getDecimalRepresentationFormatter(maxDecimals, true);
  let result = formatter.format(n);
  if (sep) {
    let p: number = result.indexOf(".")!;
    result = result.replace(/\d(?=(?:\d{3})+(?:\.|$))/g, (m, i) =>
      p < 0 || i < p ? `${m}${sep}` : m
    );
  }
  return result;
}

function formatMagnitudeOrder(magnitudeOrder: string, format: string) {
  // ex: format: 00.0E00 --> 2 is the minimum of digits for the magnitude oder
  // ex: format: 0E0000 --> 4 is the minimum of digits for the magnitude oder
  const minimumMagnitudeOrderDigits = format.split("E")[1].match(/0/g)!.length;
  const magnitudeOrderDigits = magnitudeOrder.substr(1);
  const missingZero = minimumMagnitudeOrderDigits - magnitudeOrderDigits.length;
  const magnitudeOrderSign = magnitudeOrder[0];
  return (
    "E" +
    magnitudeOrderSign +
    (missingZero > 0 ? Array(missingZero + 1).join("0") : "") +
    magnitudeOrderDigits
  );
}

// this next two variable are caches that can contains decimal representation formats
// from 0 (minimum) to 20 (maximum) digits after the decimal point.
let decimalRepresentations: Intl.NumberFormat[] = [];
let forcedDecimalRepresentations: Intl.NumberFormat[] = [];

function getDecimalRepresentationFormatter(
  decimalPlaces: number,
  forced: boolean = false
): Intl.NumberFormat {
  let formatter = forced
    ? forcedDecimalRepresentations[decimalPlaces]
    : decimalRepresentations[decimalPlaces];
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: forced ? decimalPlaces : 0,
      maximumFractionDigits: decimalPlaces,
      useGrouping: false,
    });
    if (forced) {
      forcedDecimalRepresentations[decimalPlaces] = formatter;
    } else {
      decimalRepresentations[decimalPlaces] = formatter;
    }
  }
  return formatter;
}

/**
 * Function used to determine which format should be applied to a number that hasn't
 * format. It assumes that the returned string format must be interpreted by the
 * 'formatNumber' function.
 *
 * This function is mainly useful to determine a format from the value of the number.
 * This means that the function completely ignores the context linked to the value
 * and will try to make any number intelligible, regardless of :
 * - the magnitude order of the number
 * - the number of digits that composed the number
 */
export function defaultNumberFormat(value: number): string {
  if (value === 0) {
    return "0";
  }

  const absValue = Math.abs(value);
  // IF 10 000 000 000 > value >= 0.000 000 001
  if (
    10 ** STANDARD_MAX_SIGNIFICANT_DIGITS > absValue &&
    absValue >= 1 / 10 ** (STANDARD_MAX_SIGNIFICANT_DIGITS - 1)
  ) {
    // in this case the only problem we have is that number can have plenty of digits.
    // We need to round the value to respect the STANDARD_MAX_DIGITS_SIGNIFICAND
    return _defaultNumberFormat(absValue, STANDARD_MAX_SIGNIFICANT_DIGITS);
  }
  // in this case, number is such big or such small that we need a scientific
  // format to make it intelligible. The scientific format will express the order
  // of magnitude of the number.
  const exponentialDigitsValue = absValue.toExponential().split("e")[0];
  return (
    _defaultNumberFormat(
      Number(exponentialDigitsValue),
      STANDARD_EXPONENTIAL_MAX_SIGNIFICANT_DIGITS
    ) + "E+0"
  );
}

/**
 * Function used to determine a string format from a number value. It assumes that
 * the returned string format must be interpreted by the 'formatNumber' function.
 *
 * It is considered that the returned string format is "0" followed by a point
 * "." and as many "0" as there are digit decimals.
 *
 * The function offer the possibility to limited the format to a maximum of significant
 * digits. Thereby, the number of decimal digit taking into account ensure that
 * ["the number of integer digit" + "the number of decimal digit] not exceed the
 * 'maximumSignificantDigits'.
 *
 * Example with 10 as maximumSignificantDigits:
 * - 1 --> '0'
 * - 123 --> '0'
 * - 12345 --> '0'
 * - 42.1 --> '0.0'
 * - 456.0001 --> '0.0000'
 * - 12345.678912345 --> '0.00000'
 * - 0.000000001 --> '0.000000000'
 * - 0.0000000001 --> '0'
 * - 12345678901234567890 --> '0'
 * - 12345678901234567890.1 --> '0'
 * - 1234567.00012345 --> '0'
 */
function _defaultNumberFormat(absValue: number, maximumSignificantDigits: number): string {
  const strValue = absValue.toString();
  // important to know to understand or modify this function:
  // javascript number representation uses exponential format to display numbers
  // below 0.0000001 and to display integer number composed of 22 digits

  let integerPartLength = 1;
  if (strValue.includes("e")) {
    // In this case Value has exponential format (ex: 1.2345e33 or 4.8e-7).
    // The magnitude order in the exponential format can give us the length of
    // the integer part:
    // - If positive or null, the length of the integers is equal to [the magnitude
    // order + 1]
    // - If negative, number value necessarily smaller than the value 1 (ex: 0.9999)
    // --> the integer part is 0 --> the length is 1
    const magnitudeOrder = Number(strValue.split("e")[1]);
    if (magnitudeOrder >= 0) {
      integerPartLength += magnitudeOrder;
    }
  } else {
    // In this case value has 'normal' format, it could be a simple integer or
    // an integer with decimal digits separated by "." (ex: 123 or 123.456)
    integerPartLength = strValue.split(".")[0].length;
  }

  const remainingDecimalPlaces = Math.max(maximumSignificantDigits - integerPartLength, 0);

  // At this step, suppose the absValue 12345.6789012 and maximumSignificantDigits 10:
  // --> integerPartLength = 5
  // --> remainingDecimalPlaces = 10 -5 = 5
  // --> decimalPlaces should be "67890"
  // --> with "67890" as decimal digit, the format returned by the function should
  // be "0.00000". With this format, the value returned once interpreted will be
  // "12345.67890" except that we don't want to display 0 at the last position.
  // We must therefore remove "0" from the format when there are useless 0 digits
  // in the representation of the value.

  // A best way to do this, is to use the result of a decimal formatter.

  const formatter = getDecimalRepresentationFormatter(remainingDecimalPlaces);
  const decimalPart = formatter.format(absValue).split(".")[1];

  if (!decimalPart) {
    return "0";
  }
  return "0." + Array(decimalPart.length + 1).join("0");
}
