import { DATETIME_FORMAT } from "../constants";
import { CellValue, Format, FormattedValue } from "../types";
import { INITIAL_1900_DAY, numberToJsDate } from "./dates";

/**
 *  Constant used to indicate the maximum of digits that is possible to display
 *  in a cell with standard size.
 */
const MAX_DECIMAL_PLACES = 20;

//from https://stackoverflow.com/questions/721304/insert-commas-into-number-string @Thomas/Alan Moore
const thousandsGroupsRegexp = /(\d+?)(?=(\d{3})+(?!\d)|$)/g;

const zeroRegexp = /0/g;

export interface InternalNumberFormat {
  readonly integerPart: string;
  readonly isPercent: boolean;
  readonly thousandsSeparator: boolean;
  /**
   * optional because we need to differentiate a number
   * with a dot but no decimals with a number without any decimals.
   * i.e. '5.'  !=== '5' !=== '5.0'
   */
  readonly decimalPart?: string;
}

export type InternalFormat = InternalNumberFormat;

// -----------------------------------------------------------------------------
// FORMAT REPRESENTATION CACHE
// -----------------------------------------------------------------------------

const internalFormatByFormatString: { [format: string]: InternalNumberFormat } = {};

function parseFormat(formatString: Format): InternalFormat {
  let internalFormat = internalFormatByFormatString[formatString];
  if (internalFormat === undefined) {
    validateFormat(formatString);
    internalFormat = convertToInternalNumberFormat(formatString);
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
export function formatValue(value: CellValue, format?: Format): FormattedValue {
  switch (typeof value) {
    case "string":
      return value;
    case "boolean":
      return value ? "TRUE" : "FALSE";
    case "number":
      if (format?.match(DATETIME_FORMAT)) {
        return applyDateTimeFormat(value, format);
      }
      // transform to internalNumberFormat
      if (format === undefined) {
        format = createDefaultFormat(value);
      }
      const internalFormat = parseFormat(format);
      return applyNumberFormat(value, internalFormat);
    case "object":
      return "0";
  }
}

function applyNumberFormat(value: number, numberFormat: InternalNumberFormat): FormattedValue {
  if (value < 0) {
    return "-" + applyNumberFormat(-value, numberFormat);
  }

  if (numberFormat.isPercent) {
    value = value * 100;
  }

  let maxDecimals = 0;
  if (numberFormat.decimalPart !== undefined) {
    maxDecimals = numberFormat.decimalPart.length;
  }
  const { integerDigits, decimalDigits } = splitNumber(value, maxDecimals);

  let formattedValue = applyIntegerFormat(
    integerDigits,
    numberFormat.integerPart,
    numberFormat.thousandsSeparator
  );

  if (numberFormat.decimalPart !== undefined) {
    formattedValue += "." + applyDecimalFormat(decimalDigits || "", numberFormat.decimalPart);
  }

  if (numberFormat.isPercent) {
    formattedValue += "%";
  }

  return formattedValue;
}

function applyIntegerFormat(
  integerDigits: string,
  integerFormat: string,
  hasSeparator: boolean
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

  if (hasSeparator) {
    formattedInteger = formattedInteger.match(thousandsGroupsRegexp)?.join(",") || formattedInteger;
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
 * exceed in the decimal part, in which case digits are rounded
 *
 * Intl.Numberformat is used to properly handle all the roundings.
 * e.g. 1234.7  with format ### (<> maxDecimals=0) should become 1235, not 1234
 **/
function splitNumber(
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

export function applyDateTimeFormat(value: number, format: string): FormattedValue {
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

function formatJSDate(jsDate: Date, format: Format): FormattedValue {
  const sep = format.match(/\/|-|\s/)![0];
  const parts = format.split(sep);
  return parts
    .map((p) => {
      switch (p) {
        case "d":
          return jsDate.getDate();
        case "dd":
          return jsDate.getDate().toString().padStart(2, "0");
        case "m":
          return jsDate.getMonth() + 1;
        case "mm":
          return String(jsDate.getMonth() + 1).padStart(2, "0");
        case "yyyy":
          return jsDate.getFullYear();
        default:
          throw new Error(`invalid format: ${format}`);
      }
    })
    .join(sep);
}

function formatJSTime(jsDate: Date, format: Format): FormattedValue {
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
              (jsDate.getTime() - INITIAL_1900_DAY) / (60 * 60 * 1000)
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

// -----------------------------------------------------------------------------
// CREATE / MODIFY FORMAT
// -----------------------------------------------------------------------------

export function createDefaultFormat(value: number): Format {
  let { decimalDigits } = splitNumber(value, 10);
  return decimalDigits ? "0." + "0".repeat(decimalDigits.length) : "0";
}

export function changeDecimalPlaces(format: Format, step: number) {
  const internalNumberFormat = parseFormat(format);
  const newInternalNumberFormat = changeInternalNumberFormatDecimalPlaces(
    internalNumberFormat,
    step
  );
  const newFormat = convertToFormat(newInternalNumberFormat);
  internalFormatByFormatString[newFormat] = newInternalNumberFormat;
  return newFormat;
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

function validateFormat(format: Format) {
  const [, decimalPart] = format.split(".");
  if (decimalPart) {
    if (decimalPart.includes(",")) {
      throw new Error("A format can't contain ',' sign in the decimal part");
    }
    if (decimalPart.replace("%", "").length > 20) {
      throw new Error("A format can't contain more than 20 decimal places");
    }
  }
  if (format.replace("%", "").includes("%")) {
    throw new Error("A format can only contain a single '%' sign");
  }
  if (format.replace(",", "").includes(",")) {
    throw new Error("A format can only contain a single ',' sign");
  }
}

function convertToInternalNumberFormat(format: Format): InternalNumberFormat {
  const isPercent = format.includes("%");
  const thousandsSeparator = format.includes(",");
  const _format = format.replace("%", "").replace(",", "");
  const [integerPart, decimalPart] = _format.split(".");
  if (decimalPart !== undefined) {
    return {
      integerPart,
      isPercent,
      thousandsSeparator,
      decimalPart,
    };
  } else {
    return {
      integerPart,
      isPercent,
      thousandsSeparator,
    };
  }
}

function convertToFormat(internalNumberFormat: InternalNumberFormat): Format {
  let format = internalNumberFormat.integerPart;
  if (internalNumberFormat.thousandsSeparator) {
    format = format.slice(0, -3) + "," + format.slice(-3);
  }
  if (internalNumberFormat.decimalPart !== undefined) {
    format += "." + internalNumberFormat.decimalPart;
  }
  if (internalNumberFormat.isPercent) {
    format += "%";
  }
  return format;
}
