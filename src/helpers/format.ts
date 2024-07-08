import { toNumber, toString } from "../functions/helpers";
import { _t } from "../translation";
import {
  CellValue,
  Currency,
  Format,
  FormattedValue,
  FunctionResultObject,
  Locale,
  LocaleFormat,
  Maybe,
  PLAIN_TEXT_FORMAT,
} from "../types";
import { EvaluationError } from "../types/errors";
import { DateTime, INITIAL_1900_DAY, isDateTime, numberToJsDate, parseDateTime } from "./dates";
import { escapeRegExp, memoize } from "./misc";

/**
 *  Constant used to indicate the maximum of digits that is possible to display
 *  in a cell with standard size.
 */
const MAX_DECIMAL_PLACES = 20;

/**
 * Number of digits for the default number format. This number of digit make a number fit well in a cell
 * with default size and default font size.
 */
const DEFAULT_FORMAT_NUMBER_OF_DIGITS = 11;

//from https://stackoverflow.com/questions/721304/insert-commas-into-number-string @Thomas/Alan Moore
const thousandsGroupsRegexp = /(\d+?)(?=(\d{3})+(?!\d)|$)/g;

const zeroRegexp = /0/g;

/**
 * This internal format allows to represent a string format into subparts.
 * This division simplifies:
 * - the interpretation of the format when apply it to a value
 * - its modification (ex: easier to change the number of decimals)
 *
 * The internal format was introduced with the custom currency. The challenge was
 * to separate the custom currency from the rest of the format to not interfere
 * during analysis.
 *
 * This internal format and functions related to its application or modification
 * are not perfect ! Unlike implementation of custom currencies, implementation
 * of custom formats will ask to completely revisit internal format. The custom
 * formats request a customization character by character.
 *
 * For mor information, see:
 * - ECMA 376 standard:
 *  - Part 1 “Fundamentals And Markup Language Reference”, 5th edition, December 2016:
 *   - 18.8.30 numFmt (Number Format)
 *   - 18.8.31 numFmts (Number Formats)
 */
type InternalFormat = (
  | { type: "NUMBER"; format: InternalNumberFormat }
  | { type: "STRING"; format: string }
  | { type: "DATE"; format: string }
)[];

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

interface InternalNumberFormat {
  readonly integerPart: string;
  readonly isPercent: boolean;
  readonly thousandsSeparator: boolean;
  readonly magnitude: number;
  /**
   * optional because we need to differentiate a number
   * with a dot but no decimals with a number without any decimals.
   * i.e. '5.'  !=== '5' !=== '5.0'
   */
  readonly decimalPart?: string;
}

// -----------------------------------------------------------------------------
// FORMAT REPRESENTATION CACHE
// -----------------------------------------------------------------------------

const internalFormatByFormatString: { [format: string]: InternalFormat } = {};

function parseFormat(formatString: Format): InternalFormat {
  let internalFormat = internalFormatByFormatString[formatString];
  if (internalFormat === undefined) {
    internalFormat = convertFormatToInternalFormat(formatString);
    internalFormatByFormatString[formatString] = internalFormat;
  }
  return internalFormat;
}

// -----------------------------------------------------------------------------
// APPLY FORMAT
// -----------------------------------------------------------------------------

/**
 * Formats a cell value with its format.
 */
export function formatValue(value: CellValue, { format, locale }: LocaleFormat): FormattedValue {
  if (format === PLAIN_TEXT_FORMAT) {
    return toString(value) || "";
  }
  switch (typeof value) {
    case "string":
      if (value.includes('\\"')) {
        return value.replace(/\\"/g, '"');
      }
      return value;
    case "boolean":
      return value ? "TRUE" : "FALSE";
    case "number":
      // transform to internalNumberFormat
      if (!format) {
        format = createDefaultFormat(value);
      }
      const internalFormat = parseFormat(format);
      return applyInternalFormat(value, internalFormat, locale);
    case "object": // case value === null
      return "";
  }
}

function applyInternalFormat(
  value: number,
  internalFormat: InternalFormat,
  locale: Locale
): FormattedValue {
  if (internalFormat[0].type === "DATE") {
    return applyDateTimeFormat(value, internalFormat[0].format);
  }

  let formattedValue: FormattedValue = value < 0 ? "-" : "";
  for (let part of internalFormat) {
    switch (part.type) {
      case "NUMBER":
        formattedValue += applyInternalNumberFormat(Math.abs(value), part.format, locale);
        break;
      case "STRING":
        formattedValue += part.format;
        break;
    }
  }
  return formattedValue;
}

function applyInternalNumberFormat(value: number, format: InternalNumberFormat, locale: Locale) {
  if (value === Infinity) {
    return "∞" + (format.isPercent ? "%" : "");
  }
  if (format.isPercent) {
    value = value * 100;
  }
  value = value / format.magnitude;
  let maxDecimals = 0;
  if (format.decimalPart !== undefined) {
    maxDecimals = format.decimalPart.length;
  }
  const { integerDigits, decimalDigits } = splitNumber(value, maxDecimals);

  let formattedValue = applyIntegerFormat(
    integerDigits,
    format.integerPart,
    format.thousandsSeparator ? locale.thousandsSeparator : undefined
  );

  if (format.decimalPart !== undefined) {
    formattedValue +=
      locale.decimalSeparator + applyDecimalFormat(decimalDigits || "", format.decimalPart);
  }

  if (format.isPercent) {
    formattedValue += "%";
  }
  return formattedValue;
}

function applyIntegerFormat(
  integerDigits: string,
  integerFormat: string,
  thousandsSeparator: string | undefined
): string {
  const _integerDigits = integerDigits === "0" ? "" : integerDigits;

  let formattedInteger = _integerDigits;
  const delta = integerFormat.length - _integerDigits.length;
  if (delta > 0) {
    // ex: format = "0#000000" and integerDigit: "123"
    const restIntegerFormat = integerFormat.substring(0, delta); // restIntegerFormat = "0#00"
    const countZero = (restIntegerFormat.match(zeroRegexp) || []).length; // countZero = 3
    formattedInteger = "0".repeat(countZero) + formattedInteger; // return "000123"
  }

  if (thousandsSeparator) {
    formattedInteger =
      formattedInteger.match(thousandsGroupsRegexp)?.join(thousandsSeparator) || formattedInteger;
  }

  return formattedInteger;
}

function applyDecimalFormat(decimalDigits: string, decimalFormat: string): string {
  // assume the format is valid (no commas)
  let formattedDecimals = decimalDigits;
  if (decimalFormat.length - decimalDigits.length > 0) {
    const restDecimalFormat = decimalFormat.substring(
      decimalDigits.length,
      decimalFormat.length + 1
    );
    const countZero = (restDecimalFormat.match(zeroRegexp) || []).length;
    formattedDecimals = formattedDecimals + "0".repeat(countZero);
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
 * Check if the given format is a time, date or date time format.
 */
export function isDateTimeFormat(format: Format) {
  if (!allowedDateTimeFormatFirstChar.has(format[0])) {
    // first check for performance reason
    return false;
  }
  try {
    applyDateTimeFormat(1, format);
    return true;
  } catch (error) {
    return false;
  }
}
const allowedDateTimeFormatFirstChar = new Set(["h", "m", "y", "d", "q"]);

export function applyDateTimeFormat(value: number, format: Format): FormattedValue {
  // TODO: unify the format functions for date and datetime
  // This requires some code to 'parse' or 'tokenize' the format, keep it in a
  // cache, and use it in a single mapping, that recognizes the special list
  // of tokens dd,d,m,y,h, ... and preserves the rest

  const jsDate = numberToJsDate(value);
  const indexH = format.indexOf("h");
  let strDate: FormattedValue = "";
  let strTime: FormattedValue = "";
  if (indexH > 0) {
    strDate = formatJSDate(jsDate, format.substring(0, indexH - 1));
    strTime = formatJSTime(jsDate, format.substring(indexH));
  } else if (indexH === 0) {
    strTime = formatJSTime(jsDate, format);
  } else if (indexH < 0) {
    strDate = formatJSDate(jsDate, format);
  }
  return strDate + (strDate && strTime ? " " : "") + strTime;
}

function formatJSDate(jsDate: DateTime, format: Format): FormattedValue {
  const sep = format.match(/\/|-|\s/)?.[0];
  const parts = sep ? format.split(sep) : [format];
  return parts
    .map((p) => {
      switch (p) {
        case "d":
          return jsDate.getDate();
        case "dd":
          return jsDate.getDate().toString().padStart(2, "0");
        case "ddd":
          return DAYS[jsDate.getDay()].slice(0, 3);
        case "dddd":
          return DAYS[jsDate.getDay()];
        case "m":
          return jsDate.getMonth() + 1;
        case "mm":
          return String(jsDate.getMonth() + 1).padStart(2, "0");
        case "mmm":
          return MONTHS[jsDate.getMonth()].slice(0, 3);
        case "mmmm":
          return MONTHS[jsDate.getMonth()];
        case "mmmmm":
          return MONTHS[jsDate.getMonth()].slice(0, 1);
        case "qq":
          return _t("Q%(quarter)s", { quarter: jsDate.getQuarter() });
        case "qqqq":
          return _t("Quarter %(quarter)s", { quarter: jsDate.getQuarter() });
        case "yy":
          const fullYear = String(jsDate.getFullYear()).replace("-", "").padStart(2, "0");
          return fullYear.slice(fullYear.length - 2);
        case "yyyy":
          return jsDate.getFullYear();
        default:
          throw new Error(`invalid format: ${format}`);
      }
    })
    .join(sep);
}

function formatJSTime(jsDate: DateTime, format: Format): FormattedValue {
  let parts = format.split(/:|\s/);

  const dateHours = jsDate.getHours();
  const isMeridian = parts[parts.length - 1] === "a";
  let hours = dateHours;
  let meridian = "";
  if (isMeridian) {
    hours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    meridian = dateHours >= 12 ? " PM" : " AM";
    parts.pop();
  }

  return (
    parts
      .map((p) => {
        switch (p) {
          case "hhhh":
            const helapsedHours = Math.floor(
              (jsDate.getTime() - INITIAL_1900_DAY.getTime()) / (60 * 60 * 1000)
            );
            return helapsedHours.toString();
          case "hh":
            return hours.toString().padStart(2, "0");
          case "mm":
            return jsDate.getMinutes().toString().padStart(2, "0");
          case "ss":
            return jsDate.getSeconds().toString().padStart(2, "0");
          default:
            throw new Error(`invalid format: ${format}`);
        }
      })
      .join(":") + meridian
  );
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

function insertTextInFormat(text: string, position: "before" | "after", format: Format): Format {
  const textExpression = `[$${text}]`;
  return position === "before" ? textExpression + format : format + textExpression;
}

export function roundFormat(format: Format): Format {
  const internalFormat = parseFormat(format);
  const roundedFormat = internalFormat.map((formatPart) => {
    if (formatPart.type === "NUMBER") {
      return {
        type: formatPart.type,
        format: {
          ...formatPart.format,
          decimalPart: undefined,
        },
      };
    }
    return formatPart;
  });
  return convertInternalFormatToFormat(roundedFormat);
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
        return createLargeNumberFormat(format, 1e3, "k", locale);
      case "m":
        return createLargeNumberFormat(format, 1e6, "m", locale);
      case "b":
        return createLargeNumberFormat(format, 1e9, "b", locale);
      default:
        throw new EvaluationError(_t("The formatting unit should be 'k', 'm' or 'b'."));
    }
  }
  if (value < 1e5) {
    return createLargeNumberFormat(format, 0, "", locale);
  } else if (value < 1e8) {
    return createLargeNumberFormat(format, 1e3, "k", locale);
  } else if (value < 1e11) {
    return createLargeNumberFormat(format, 1e6, "m", locale);
  }
  return createLargeNumberFormat(format, 1e9, "b", locale);
}

export function createLargeNumberFormat(
  format: Format | undefined,
  magnitude: number,
  postFix: string,
  locale: Locale
): Format {
  const internalFormat = parseFormat(format || "#,##0");
  const largeNumberFormat: InternalFormat = [];
  for (let i = 0; i < internalFormat.length; i++) {
    const formatPart = internalFormat[i];
    if (formatPart.type !== "NUMBER") {
      largeNumberFormat.push(formatPart);
      continue;
    }

    largeNumberFormat.push({
      ...formatPart,
      format: {
        ...formatPart.format,
        magnitude,
        decimalPart: undefined,
      },
    });
    largeNumberFormat.push({
      type: "STRING" as const,
      format: postFix,
    });

    const nextFormatPart = internalFormat[i + 1];
    if (nextFormatPart?.type === "STRING" && ["k", "m", "b"].includes(nextFormatPart.format)) {
      i++;
    }
  }
  return convertInternalFormatToFormat(largeNumberFormat);
}

export function changeDecimalPlaces(format: Format, step: number, locale: Locale) {
  const internalFormat = parseFormat(format);
  const newInternalFormat = internalFormat.map((intFmt) => {
    if (intFmt.type === "NUMBER") {
      return { ...intFmt, format: changeInternalNumberFormatDecimalPlaces(intFmt.format, step) };
    } else {
      return intFmt;
    }
  });
  const newFormat = convertInternalFormatToFormat(newInternalFormat);
  internalFormatByFormatString[newFormat] = newInternalFormat;
  return newFormat;
}

export function isExcelCompatible(format: Format): boolean {
  const internalFormat = parseFormat(format);
  for (let part of internalFormat) {
    if (part.type === "DATE" && part.format.includes("q")) {
      return false;
    }
  }
  return true;
}

function changeInternalNumberFormatDecimalPlaces(
  format: Readonly<InternalNumberFormat>,
  step: number
): InternalNumberFormat {
  const _format = { ...format };
  const sign = Math.sign(step);
  const decimalLength = _format.decimalPart?.length || 0;
  const countZero = Math.min(Math.max(0, decimalLength + sign), MAX_DECIMAL_PLACES);
  _format.decimalPart = "0".repeat(countZero);
  if (_format.decimalPart === "") {
    delete _format.decimalPart;
  }
  return _format;
}

// -----------------------------------------------------------------------------
// MANAGING FORMAT
// -----------------------------------------------------------------------------

/**
 * Validates the provided format string and returns an InternalFormat Object.
 */
function convertFormatToInternalFormat(format: Format): InternalFormat {
  if (format === "") {
    throw new Error("A format cannot be empty");
  }
  let currentIndex = 0;
  let result: InternalFormat = [];
  while (currentIndex < format.length) {
    let closingIndex: number;
    if (format.charAt(currentIndex) === "[") {
      if (format.charAt(currentIndex + 1) !== "$") {
        throw new Error(`Currency formats have to be prefixed by a $: ${format}`);
      }
      // manage brackets/customStrings
      closingIndex = format.substring(currentIndex + 1).indexOf("]") + currentIndex + 2;
      if (closingIndex === 0) {
        throw new Error(`Invalid currency brackets format: ${format}`);
      }
      // remove leading "[$"" and ending "]".
      const str = format.substring(currentIndex + 2, closingIndex - 1);
      if (str.includes("[")) {
        throw new Error(`Invalid currency format: ${format}`);
      }
      result.push({
        type: "STRING",
        format: str,
      });
    } else {
      // rest of the time
      const nextPartIndex = format.substring(currentIndex).indexOf("[");
      closingIndex = nextPartIndex > -1 ? nextPartIndex + currentIndex : format.length;
      const subFormat = format.substring(currentIndex, closingIndex);
      if (isDateTimeFormat(subFormat)) {
        result.push({ type: "DATE", format: subFormat });
      } else {
        result.push({
          type: "NUMBER",
          format: convertToInternalNumberFormat(subFormat),
        });
      }
    }
    currentIndex = closingIndex;
  }
  return result;
}

const magnitudeRegex = /,*?$/;

/**
 * @param format a formatString that is only applicable to numbers. I.e. composed of characters 0 # , . %
 */
function convertToInternalNumberFormat(format: Format): InternalNumberFormat {
  format = format.trim();
  if (containsInvalidNumberChars(format)) {
    throw new Error(`Invalid number format: ${format}`);
  }
  const isPercent = format.includes("%");
  const magnitudeCommas = format.match(magnitudeRegex)?.[0] || "";
  const magnitude = !magnitudeCommas ? 1 : 1000 ** magnitudeCommas.length;
  let _format = format.slice(0, format.length - (magnitudeCommas.length || 0));
  const thousandsSeparator = _format.includes(",");
  if (/\..*,/.test(_format)) {
    throw new Error("A format can't contain ',' symbol in the decimal part");
  }
  _format = _format.replace("%", "").replace(",", "");

  const extraSigns = _format.match(/[\%|,]/);
  if (extraSigns) {
    throw new Error(`A format can only contain a single '${extraSigns[0]}' symbol`);
  }
  const [integerPart, decimalPart] = _format.split(".");
  if (decimalPart && decimalPart.length > 20) {
    throw new Error("A format can't contain more than 20 decimal places");
  }
  if (decimalPart !== undefined) {
    return {
      integerPart,
      isPercent,
      thousandsSeparator,
      decimalPart,
      magnitude,
    };
  } else {
    return {
      integerPart,
      isPercent,
      thousandsSeparator,
      magnitude,
    };
  }
}

const validNumberChars = /[,#0.%@]/g;

function containsInvalidNumberChars(format: Format): boolean {
  return Boolean(format.replace(validNumberChars, ""));
}

function convertInternalFormatToFormat(internalFormat: InternalFormat): Format {
  let format: Format = "";
  for (let part of internalFormat) {
    let currentFormat: string;
    switch (part.type) {
      case "NUMBER":
        const fmt = part.format;
        currentFormat = fmt.integerPart;
        if (fmt.thousandsSeparator) {
          currentFormat = currentFormat.slice(0, -3) + "," + currentFormat.slice(-3);
        }
        if (fmt.decimalPart !== undefined) {
          currentFormat += "." + fmt.decimalPart;
        }
        if (fmt.isPercent) {
          currentFormat += "%";
        }
        if (fmt.magnitude) {
          currentFormat += ",".repeat(Math.log10(fmt.magnitude) / 3);
        }
        break;
      case "STRING":
        currentFormat = `[$${part.format}]`;
        break;
      case "DATE":
        currentFormat = part.format;
        break;
    }
    format += currentFormat;
  }
  return format;
}
