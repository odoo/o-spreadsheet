import { toNumber } from "../../functions/helpers";
import { _t } from "../../translation";
import {
  CellValue,
  Currency,
  Format,
  FormattedValue,
  FunctionResultObject,
  Locale,
  LocaleFormat,
  Maybe,
} from "../../types";
import { EvaluationError } from "../../types/errors";
import { DateTime, INITIAL_1900_DAY, isDateTime, numberToJsDate, parseDateTime } from "../dates";
import {
  escapeRegExp,
  insertItemsAtIndex,
  memoize,
  range,
  removeIndexesFromArray,
  replaceItemAtIndex,
} from "../misc";
import {
  DateInternalFormat,
  InternalFormat,
  MAX_DECIMAL_PLACES,
  NumberInternalFormat,
  TextInternalFormat,
  convertInternalFormatToFormat,
  parseFormat,
} from "./format_parser";
import { FormatToken } from "./format_tokenizer";

/**
 * Number of digits for the default number format. This number of digit make a number fit well in a cell
 * with default size and default font size.
 */
const DEFAULT_FORMAT_NUMBER_OF_DIGITS = 11;

// TODO in the future : remove these constants MONTHS/DAYS, and use a library such as luxon to handle it
// + possibly handle automatic translation of day/month
export const MONTHS: Readonly<Record<number, string>> = {
  0: _t("January"),
  1: _t("February"),
  2: _t("March"),
  3: _t("April"),
  4: _t("May"),
  5: _t("June"),
  6: _t("July"),
  7: _t("August"),
  8: _t("September"),
  9: _t("October"),
  10: _t("November"),
  11: _t("December"),
};

const DAYS: Readonly<Record<number, string>> = {
  0: _t("Sunday"),
  1: _t("Monday"),
  2: _t("Tuesday"),
  3: _t("Wednesday"),
  4: _t("Thursday"),
  5: _t("Friday"),
  6: _t("Saturday"),
};

/**
 * Formats a cell value with its format.
 */
export function formatValue(value: CellValue, { format, locale }: LocaleFormat): FormattedValue {
  if (typeof value === "boolean") {
    value = value ? "TRUE" : "FALSE";
  }
  switch (typeof value) {
    case "string": {
      if (value.includes('\\"')) {
        value = value.replaceAll(/\\"/g, '"');
      }
      if (!format) {
        return value;
      }
      const internalFormat = parseFormat(format);
      let formatToApply = internalFormat.text || internalFormat.positive;
      if (!formatToApply || formatToApply.type !== "text") {
        return value;
      }
      return applyTextInternalFormat(value, formatToApply);
    }
    case "number":
      if (!format) {
        format = createDefaultFormat(value);
      }

      const internalFormat = parseFormat(format);
      if (internalFormat.positive.type === "text") {
        return applyTextInternalFormat(value.toString(), internalFormat.positive);
      }

      let formatToApply: InternalFormat = internalFormat.positive;
      if (value < 0 && internalFormat.negative) {
        formatToApply = internalFormat.negative;
        value = -value;
      } else if (value === 0 && internalFormat.zero) {
        formatToApply = internalFormat.zero;
      }

      if (formatToApply.type === "date") {
        return applyDateTimeFormat(value, formatToApply);
      }

      const isNegative = value < 0;
      const formatted = applyInternalNumberFormat(Math.abs(value), formatToApply, locale);
      return isNegative ? "-" + formatted : formatted;
    case "object": // case value === null
      return "";
  }
}

function applyTextInternalFormat(
  value: string,
  internalFormat: TextInternalFormat
): FormattedValue {
  let formattedValue = "";
  for (const token of internalFormat.tokens) {
    switch (token.type) {
      case "TEXT_PLACEHOLDER":
        formattedValue += value;
        break;
      case "CHAR":
      case "STRING":
        formattedValue += token.value;
        break;
    }
  }
  return formattedValue;
}

function applyInternalNumberFormat(value: number, format: NumberInternalFormat, locale: Locale) {
  if (value === Infinity) {
    return "∞" + (format.percentSymbols ? "%" : "");
  }

  const multiplier = format.percentSymbols * 2 - format.magnitude * 3;
  value = value * 10 ** multiplier;

  let maxDecimals = 0;
  if (format.decimalPart !== undefined) {
    maxDecimals = format.decimalPart.filter((token) => token.type === "DIGIT").length;
  }
  const { integerDigits, decimalDigits } = splitNumber(Math.abs(value), maxDecimals);

  let formattedValue = applyIntegerFormat(
    integerDigits,
    format,
    format.thousandsSeparator ? locale.thousandsSeparator : undefined
  );

  if (format.decimalPart !== undefined) {
    formattedValue += locale.decimalSeparator + applyDecimalFormat(decimalDigits || "", format);
  }

  return formattedValue;
}

function applyIntegerFormat(
  integerDigits: string,
  internalFormat: NumberInternalFormat,
  thousandsSeparator: string | undefined
): string {
  let tokens = internalFormat.integerPart;
  if (!tokens.some((token) => token.type === "DIGIT")) {
    tokens = [...tokens, { type: "DIGIT", value: "#" }];
  }
  if (integerDigits === "0") {
    integerDigits = "";
  }
  let formattedInteger = "";

  const firstDigitIndex = tokens.findIndex((token) => token.type === "DIGIT");
  let indexInIntegerString = integerDigits.length - 1;

  function appendDigitToFormattedValue(digit: string | undefined, digitType: "0" | "#") {
    if (digitType === "0") {
      digit = digit || "0";
    }
    if (!digit) return;

    const digitIndex = integerDigits.length - 1 - indexInIntegerString;
    if (thousandsSeparator && digitIndex > 0 && digitIndex % 3 === 0) {
      formattedInteger = digit + thousandsSeparator + formattedInteger;
    } else {
      formattedInteger = digit + formattedInteger;
    }
  }

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    switch (token.type) {
      case "DIGIT":
        let digit = integerDigits[indexInIntegerString];
        appendDigitToFormattedValue(digit, token.value);

        indexInIntegerString--;

        // Apply the rest of the integer digits at the first digit character
        if (firstDigitIndex === i) {
          while (indexInIntegerString >= 0) {
            appendDigitToFormattedValue(integerDigits[indexInIntegerString], "0");
            indexInIntegerString--;
          }
        }
        break;
      case "THOUSANDS_SEPARATOR":
        break;
      default:
        formattedInteger = token.value + formattedInteger;
        break;
    }
  }

  return formattedInteger;
}

function applyDecimalFormat(decimalDigits: string, internalFormat: NumberInternalFormat): string {
  if (!internalFormat.decimalPart) {
    return "";
  }

  let formattedDecimals = "";

  let indexInDecimalString = 0;

  for (const token of internalFormat.decimalPart) {
    switch (token.type) {
      case "DIGIT":
        const digit =
          token.value === "#"
            ? decimalDigits[indexInDecimalString] || ""
            : decimalDigits[indexInDecimalString] || "0";
        formattedDecimals += digit;
        indexInDecimalString++;
        break;
      case "THOUSANDS_SEPARATOR":
        break;
      default:
        formattedDecimals += token.value;
        break;
    }
  }

  return formattedDecimals;
}

/**
 * this is a cache that can contains number representation formats
 * from 0 (minimum) to 20 (maximum) digits after the decimal point
 */
const numberRepresentation: Intl.NumberFormat[] = [];

/** split a number into two strings that contain respectively:
 * - all digit stored in the integer part of the number
 * - all digit stored in the decimal part of the number
 *
 * The 'maxDecimal' parameter allows to indicate the number of digits to not
 * exceed in the decimal part, in which case digits are rounded.
 *
 **/
function splitNumber(
  value: number,
  maxDecimals: number = MAX_DECIMAL_PLACES
): { integerDigits: string; decimalDigits: string | undefined } {
  const asString = value.toString();
  if (asString.includes("e")) return splitNumberIntl(value, maxDecimals);

  if (Number.isInteger(value)) {
    return { integerDigits: asString, decimalDigits: undefined };
  }

  const indexOfDot = asString.indexOf(".");
  let integerDigits = asString.substring(0, indexOfDot);
  let decimalDigits: string | undefined = asString.substring(indexOfDot + 1);

  if (maxDecimals === 0) {
    if (Number(decimalDigits[0]) >= 5) {
      integerDigits = (Number(integerDigits) + 1).toString();
    }
    return { integerDigits, decimalDigits: undefined };
  }

  if (decimalDigits.length > maxDecimals) {
    const { integerDigits: roundedIntegerDigits, decimalDigits: roundedDecimalDigits } =
      limitDecimalDigits(decimalDigits, maxDecimals);

    decimalDigits = roundedDecimalDigits;
    if (roundedIntegerDigits !== "0") {
      integerDigits = (Number(integerDigits) + Number(roundedIntegerDigits)).toString();
    }
  }

  return { integerDigits, decimalDigits: removeTrailingZeroes(decimalDigits || "") };
}

/**
 *  Return the given string minus the trailing "0" characters.
 *
 * @param numberString : a string of integers
 * @returns the numberString, minus the eventual zeroes at the end
 */
function removeTrailingZeroes(numberString: string): string | undefined {
  let i = numberString.length - 1;
  while (i >= 0 && numberString[i] === "0") {
    i--;
  }
  return numberString.slice(0, i + 1) || undefined;
}

const leadingZeroesRegexp = /^0+/;

/**
 * Limit the size of the decimal part of a number to the given number of digits.
 */
function limitDecimalDigits(
  decimalDigits: string,
  maxDecimals: number
): {
  integerDigits: string;
  decimalDigits: string | undefined;
} {
  let integerDigits = "0";
  let resultDecimalDigits: string | undefined = decimalDigits;

  // Note : we'd want to simply use number.toFixed() to handle the max digits & rounding,
  // but it has very strange behaviour. Ex: 12.345.toFixed(2) => "12.35", but 1.345.toFixed(2) => "1.34"
  let slicedDecimalDigits = decimalDigits.slice(0, maxDecimals);
  const i = maxDecimals;

  if (Number(decimalDigits[i]) < 5) {
    return { integerDigits, decimalDigits: slicedDecimalDigits };
  }

  // round up
  const leadingZeroes = slicedDecimalDigits.match(leadingZeroesRegexp)?.[0] || "";
  const slicedRoundedUp = (Number(slicedDecimalDigits) + 1).toString();
  const withoutLeadingZeroes = slicedDecimalDigits.slice(leadingZeroes.length);
  // e.g. carry over from 99 to 100
  const carryOver = slicedRoundedUp.length > withoutLeadingZeroes.length;
  if (carryOver && !leadingZeroes) {
    integerDigits = "1";
    resultDecimalDigits = undefined;
  } else if (carryOver) {
    resultDecimalDigits = leadingZeroes.slice(0, -1) + slicedRoundedUp;
  } else {
    resultDecimalDigits = leadingZeroes + slicedRoundedUp;
  }

  return { integerDigits, decimalDigits: resultDecimalDigits };
}

/**
 * Split numbers into decimal/integer digits using Intl.NumberFormat.
 * Supports numbers with a lot of digits that are transformed to scientific notation by
 * number.toString(), but is slow.
 */
function splitNumberIntl(
  value: number,
  maxDecimals: number = MAX_DECIMAL_PLACES
): { integerDigits: string; decimalDigits: string | undefined } {
  let formatter = numberRepresentation[maxDecimals];
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: maxDecimals,
      useGrouping: false,
    });
    numberRepresentation[maxDecimals] = formatter;
  }

  const [integerDigits, decimalDigits] = formatter.format(value).split(".");
  return { integerDigits, decimalDigits };
}

/** Convert a number into a string, without scientific notation */
export function numberToString(number: number, decimalSeparator: string): string {
  const { integerDigits, decimalDigits } = splitNumber(number, 20);
  return decimalDigits ? integerDigits + decimalSeparator + decimalDigits : integerDigits;
}

/**
 * Check if the given format is a time, date or date time format. Only check the first part of a multi-part format.
 */
export const isDateTimeFormat = memoize(function isDateTimeFormat(format: Format) {
  if (!format) {
    return false;
  }
  try {
    const internalFormat = parseFormat(format);
    return internalFormat.positive.type === "date";
  } catch (error) {
    return false;
  }
});

function applyDateTimeFormat(value: number, internalFormat: DateInternalFormat): FormattedValue {
  const jsDate = numberToJsDate(value);

  const isMeridian = internalFormat.tokens.some(
    (token) => token.type === "DATE_PART" && token.value === "a"
  );

  let currentValue = "";
  for (const token of internalFormat.tokens) {
    switch (token.type) {
      case "DATE_PART":
        currentValue += formatJSDatePart(jsDate, token.value, isMeridian);
        break;
      default:
        currentValue += token.value;
        break;
    }
  }

  return currentValue;
}

function formatJSDatePart(jsDate: DateTime, tokenValue: string, isMeridian: boolean) {
  switch (tokenValue) {
    case "d":
      return jsDate.getDate();
    case "dd":
      return jsDate.getDate().toString().padStart(2, "0");
    case "ddd":
      return DAYS[jsDate.getDay()].slice(0, 3);
    case "dddd":
      // force translation because somehow node 22 doesn't call LazyTranslatedString.toString() whe concatenating it to a string
      return DAYS[jsDate.getDay()].toString();
    case "m":
      return jsDate.getMonth() + 1;
    case "mm":
      return String(jsDate.getMonth() + 1).padStart(2, "0");
    case "mmm":
      return MONTHS[jsDate.getMonth()].slice(0, 3);
    case "mmmm":
      return MONTHS[jsDate.getMonth()].toString();
    case "mmmmm":
      return MONTHS[jsDate.getMonth()].slice(0, 1);
    case "qq":
      return _t("Q%(quarter)s", { quarter: jsDate.getQuarter() }).toString();
    case "qqqq":
      return _t("Quarter %(quarter)s", { quarter: jsDate.getQuarter() }).toString();
    case "yy":
      const fullYear = String(jsDate.getFullYear()).replace("-", "").padStart(2, "0");
      return fullYear.slice(fullYear.length - 2);
    case "yyyy":
      return jsDate.getFullYear();
    case "hhhh":
      const elapsedHours = Math.floor(
        (jsDate.getTime() - INITIAL_1900_DAY.getTime()) / (60 * 60 * 1000)
      );
      return elapsedHours.toString();
    case "hh":
      const dateHours = jsDate.getHours();
      let hours = dateHours;
      if (isMeridian) {
        hours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      }
      return hours.toString().padStart(2, "0");
    case "MM": // "MM" replaces "mm" for minutes during format parsing
      return jsDate.getMinutes().toString().padStart(2, "0");
    case "ss":
      return jsDate.getSeconds().toString().padStart(2, "0");
    case "a":
      return jsDate.getHours() >= 12 ? "PM" : "AM";
    default:
      throw new Error(`invalid date format token: ${tokenValue}`);
  }
}

/**
 * Get a regex matching decimal number based on the locale's thousand separator
 *
 * eg. if the locale's thousand separator is a comma, this will return a regex /[0-9]+,[0-9]/
 */
export const getDecimalNumberRegex = memoize(function getDecimalNumberRegex(locale: Locale) {
  return new RegExp(`[0-9]+${escapeRegExp(locale.decimalSeparator)}[0-9]`);
});

// -----------------------------------------------------------------------------
// CREATE / MODIFY FORMAT
// -----------------------------------------------------------------------------

/**
 * Create a default format for a number.
 *
 * If possible this will try round the number to have less than DEFAULT_FORMAT_NUMBER_OF_DIGITS characters
 * in the number. This is obviously only possible for number with a big decimal part. For number with a lot
 * of digits in the integer part, keep the number as it is.
 */
export function createDefaultFormat(value: number): Format {
  let { integerDigits, decimalDigits } = splitNumber(value);
  if (!decimalDigits) return "0";

  const digitsInIntegerPart = integerDigits.replace("-", "").length;

  // If there's no space for at least the decimal separator + a decimal digit, don't display decimals
  if (digitsInIntegerPart + 2 > DEFAULT_FORMAT_NUMBER_OF_DIGITS) {
    return "0";
  }

  // -1 for the decimal separator character
  const spaceForDecimalsDigits = DEFAULT_FORMAT_NUMBER_OF_DIGITS - digitsInIntegerPart - 1;
  ({ decimalDigits } = splitNumber(value, Math.min(spaceForDecimalsDigits, decimalDigits.length)));
  return decimalDigits ? "0." + "0".repeat(decimalDigits.length) : "0";
}

export function detectDateFormat(content: string, locale: Locale): Format | undefined {
  if (!isDateTime(content, locale)) {
    return undefined;
  }
  const internalDate = parseDateTime(content, locale)!;
  return internalDate.format;
}

/** use this function only if the content corresponds to a number (means that isNumber(content) return true */
export function detectNumberFormat(content: string): Format | undefined {
  const digitBase = content.includes(".") ? "0.00" : "0";
  const matchedCurrencies = content.match(/[\$€]/);
  if (matchedCurrencies) {
    const matchedFirstDigit = content.match(/[\d]/);
    const currency = "[$" + matchedCurrencies.values().next().value + "]";
    if (matchedFirstDigit!.index! < matchedCurrencies.index!) {
      return "#,##" + digitBase + currency;
    }
    return currency + "#,##" + digitBase;
  }
  if (content.includes("%")) {
    return digitBase + "%";
  }
  return undefined;
}

export function createCurrencyFormat(currency: Partial<Currency>): Format {
  const decimalPlaces = currency.decimalPlaces ?? 2;
  const position = currency.position ?? "before";
  const code = currency.code ?? "";
  const symbol = currency.symbol ?? "";
  const decimalRepresentation = decimalPlaces ? "." + "0".repeat(decimalPlaces) : "";
  const numberFormat = "#,##0" + decimalRepresentation;
  let textExpression = `${code} ${symbol}`.trim();
  if (position === "after" && code) {
    textExpression = " " + textExpression;
  }
  return insertTextInFormat(textExpression, position, numberFormat);
}

export function createAccountingFormat(currency: Partial<Currency>): Format {
  const decimalPlaces = currency.decimalPlaces ?? 2;
  const position = currency.position ?? "before";
  const code = currency.code ?? "";
  const symbol = currency.symbol ?? "";
  const decimalRepresentation = decimalPlaces ? "." + "0".repeat(decimalPlaces) : "";
  const numberFormat = "#,##0" + decimalRepresentation;

  let textExpression = `${code} ${symbol}`.trim();
  if (position === "after" && code) {
    textExpression = " " + textExpression;
  }
  const positivePart = insertTextInFormat(textExpression, position, `${numberFormat}`);
  const negativePart = insertTextInFormat(textExpression, position, `(${numberFormat})`);
  const zeroPart = insertTextInFormat(textExpression, position, "- ");
  return [positivePart, negativePart, zeroPart].join(";");
}

function insertTextInFormat(text: string, position: "before" | "after", format: Format): Format {
  const textExpression = `[$${text}]`;
  return position === "before" ? textExpression + format : format + textExpression;
}

export function roundFormat(format: Format): Format {
  const multiPartFormat = parseFormat(format);
  const roundedInternalFormat = {
    positive: _roundFormat(multiPartFormat.positive),
    negative: multiPartFormat.negative ? _roundFormat(multiPartFormat.negative) : undefined,
    zero: multiPartFormat.zero ? _roundFormat(multiPartFormat.zero) : undefined,
    text: multiPartFormat.text,
  };
  return convertInternalFormatToFormat(roundedInternalFormat);
}

function _roundFormat<T extends InternalFormat>(internalFormat: T): T {
  if (internalFormat.type !== "number" || !internalFormat.decimalPart) {
    return internalFormat;
  }
  const nonDigitDecimalPart = internalFormat.decimalPart.filter((token) => token.type !== "DIGIT");
  return {
    ...internalFormat,
    decimalPart: undefined,
    integerPart: [...internalFormat.integerPart, ...nonDigitDecimalPart],
  };
}

export function humanizeNumber({ value, format }: FunctionResultObject, locale: Locale): string {
  const numberFormat = formatLargeNumber(
    {
      value,
      format,
    },
    undefined,
    locale
  );
  return formatValue(value, { format: numberFormat, locale });
}

export function formatLargeNumber(
  arg: Maybe<FunctionResultObject>,
  unit: Maybe<FunctionResultObject>,
  locale: Locale
): string {
  let value = 0;
  try {
    value = Math.abs(toNumber(arg?.value, locale));
  } catch (e) {
    return "";
  }
  const format = arg?.format;
  if (unit !== undefined) {
    const postFix = unit?.value;
    switch (postFix) {
      case "k":
        return createLargeNumberFormat(format, 1, "k", locale);
      case "m":
        return createLargeNumberFormat(format, 2, "m", locale);
      case "b":
        return createLargeNumberFormat(format, 3, "b", locale);
      default:
        throw new EvaluationError(_t("The formatting unit should be 'k', 'm' or 'b'."));
    }
  }
  if (value < 1e5) {
    return createLargeNumberFormat(format, 0, "", locale);
  } else if (value < 1e8) {
    return createLargeNumberFormat(format, 1, "k", locale);
  } else if (value < 1e11) {
    return createLargeNumberFormat(format, 2, "m", locale);
  }
  return createLargeNumberFormat(format, 3, "b", locale);
}

function createLargeNumberFormat(
  format: Format | undefined,
  magnitude: number,
  postFix: string,
  locale: Locale
): Format {
  const multiPartFormat = parseFormat(format || "#,##0");
  const roundedInternalFormat = {
    positive: _createLargeNumberFormat(multiPartFormat.positive, magnitude, postFix),
    negative: multiPartFormat.negative
      ? _createLargeNumberFormat(multiPartFormat.negative, magnitude, postFix)
      : undefined,
    zero: multiPartFormat.zero
      ? _createLargeNumberFormat(multiPartFormat.zero, magnitude, postFix)
      : undefined,
    text: multiPartFormat.text,
  };
  return convertInternalFormatToFormat(roundedInternalFormat);
}

function _createLargeNumberFormat<T extends InternalFormat>(
  format: T,
  magnitude: number,
  postFix: string
): T {
  if (format.type !== "number") {
    return format;
  }

  const postFixToken: FormatToken = { type: "STRING", value: postFix };
  let newIntegerPart = [...format.integerPart];

  const lastDigitIndex = newIntegerPart.findLastIndex((token) => token.type === "DIGIT");
  if (lastDigitIndex === -1) {
    throw new Error("Cannot create a large number format from a format with no digit.");
  }
  while (newIntegerPart[lastDigitIndex + 1]?.type === "THOUSANDS_SEPARATOR") {
    newIntegerPart = removeIndexesFromArray(newIntegerPart, [lastDigitIndex + 1]);
  }

  const tokenAfterDigits = newIntegerPart[lastDigitIndex + 1];
  if (tokenAfterDigits?.type === "STRING" && ["m", "k", "b"].includes(tokenAfterDigits.value)) {
    newIntegerPart = replaceItemAtIndex(newIntegerPart, postFixToken, lastDigitIndex + 1);
  } else {
    newIntegerPart = insertItemsAtIndex(newIntegerPart, [postFixToken], lastDigitIndex + 1);
  }

  if (magnitude > 0) {
    newIntegerPart = insertItemsAtIndex(
      newIntegerPart,
      Array(magnitude).fill({ type: "THOUSANDS_SEPARATOR", value: "," }),
      lastDigitIndex + 1
    );
  }
  return { ...format, integerPart: newIntegerPart, decimalPart: undefined, magnitude };
}

export function changeDecimalPlaces(format: Format, step: number) {
  const multiPartFormat = parseFormat(format);
  const newInternalFormat = {
    positive: _changeDecimalPlace(multiPartFormat.positive, step),
    negative: multiPartFormat.negative
      ? _changeDecimalPlace(multiPartFormat.negative, step)
      : undefined,
    zero: multiPartFormat.zero ? _changeDecimalPlace(multiPartFormat.zero, step) : undefined,
    text: multiPartFormat.text,
  };
  // Re-parse the format to make sure we don't break the number of digit limit
  return convertInternalFormatToFormat(
    parseFormat(convertInternalFormatToFormat(newInternalFormat))
  );
}

function _changeDecimalPlace<T extends InternalFormat>(format: T, step: number): T {
  if (format.type !== "number") {
    return format;
  }
  return (
    step > 0 ? addDecimalPlaces(format, step) : removeDecimalPlaces(format, Math.abs(step))
  ) as T;
}

function removeDecimalPlaces(format: NumberInternalFormat, step: number): NumberInternalFormat {
  let decimalPart = format.decimalPart;
  if (!decimalPart) {
    return format;
  }

  const indexesToRemove: number[] = [];
  let digitCount = 0;
  for (let i = decimalPart.length - 1; i >= 0; i--) {
    if (digitCount >= Math.abs(step)) {
      break;
    }
    if (decimalPart[i].type === "DIGIT") {
      digitCount++;
      indexesToRemove.push(i);
    }
  }
  decimalPart = removeIndexesFromArray(decimalPart, indexesToRemove);

  if (decimalPart.some((token) => token.type === "DIGIT")) {
    return { ...format, decimalPart };
  }

  return {
    ...format,
    decimalPart: undefined,
    integerPart: [...format.integerPart, ...decimalPart],
  };
}

function addDecimalPlaces(format: NumberInternalFormat, step: number): NumberInternalFormat {
  let integerPart = format.integerPart;
  let decimalPart = format.decimalPart;

  if (!decimalPart) {
    const lastDigitIndex = integerPart.findLastIndex((token) => token.type === "DIGIT");
    decimalPart = integerPart.slice(lastDigitIndex + 1);
    integerPart = integerPart.slice(0, lastDigitIndex + 1);
  }

  const digitsToAdd = range(0, step).map(() => ({ type: "DIGIT", value: "0" } as const));
  const lastDigitIndex = decimalPart.findLastIndex((token) => token.type === "DIGIT");

  if (lastDigitIndex === -1) {
    decimalPart = [...digitsToAdd, ...decimalPart];
  } else {
    decimalPart = insertItemsAtIndex(decimalPart, digitsToAdd, lastDigitIndex + 1);
  }

  return { ...format, decimalPart, integerPart };
}

export function isExcelCompatible(format: Format): boolean {
  const internalFormat = parseFormat(format);
  for (const part of [internalFormat.positive, internalFormat.negative, internalFormat.zero]) {
    if (
      part &&
      part.type === "date" &&
      part.tokens.some((token) => token.type === "DATE_PART" && token.value.includes("q"))
    ) {
      return false;
    }
  }
  return true;
}

export function isTextFormat(format: Format | undefined): boolean {
  if (!format) return false;
  try {
    const internalFormat = parseFormat(format);
    return internalFormat.positive.type === "text";
  } catch {
    return false;
  }
}
