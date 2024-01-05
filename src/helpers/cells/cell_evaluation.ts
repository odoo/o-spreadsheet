import { isEvaluationError, toNumber, toString } from "../../functions/helpers";
import {
  BooleanCell,
  Cell,
  CellValue,
  CellValueType,
  DEFAULT_LOCALE,
  EmptyCell,
  ErrorCell,
  EvaluatedCell,
  FPayload,
  Locale,
  LocaleFormat,
  NumberCell,
  PLAIN_TEXT_FORMAT,
} from "../../types";
import { isDateTime } from "../dates";
import { detectDateFormat, detectNumberFormat, formatValue, isDateTimeFormat } from "../format";
import { detectLink } from "../links";
import { isBoolean, memoize } from "../misc";
import { isNumber } from "../numbers";

export function evaluateLiteral(content: string = "", localeFormat: LocaleFormat): EvaluatedCell {
  const value =
    localeFormat.format === PLAIN_TEXT_FORMAT
      ? content
      : parseLiteral(content, localeFormat.locale);
  const fPayload = { value, format: localeFormat.format };
  return createEvaluatedCell(fPayload, localeFormat.locale);
}

export function parseLiteral(content: string, locale: Locale): CellValue {
  if (content.startsWith("=")) {
    throw new Error(`Cannot parse "${content}" because it's not a literal value. It's a formula`);
  }
  if (content === "") {
    return null;
  }
  if (isNumber(content, DEFAULT_LOCALE)) {
    return toNumber(content, DEFAULT_LOCALE);
  }
  if (isDateTime(content, locale)) {
    return toNumber(content, locale);
  }
  if (isBoolean(content)) {
    return content.toUpperCase() === "TRUE" ? true : false;
  }
  return content;
}

export function createEvaluatedCell(
  fPayload: FPayload,
  locale: Locale = DEFAULT_LOCALE,
  cell?: Cell
): EvaluatedCell {
  const link = detectLink(fPayload.value);
  if (!link) {
    return _createEvaluatedCell(fPayload, locale, cell);
  }
  const linkPayload = {
    value: parseLiteral(link.label, locale),
    format:
      fPayload.format || detectDateFormat(link.label, locale) || detectNumberFormat(link.label),
  };
  return {
    ..._createEvaluatedCell(linkPayload, locale, cell),
    link,
  };
}

function _createEvaluatedCell(fPayload: FPayload, locale: Locale, cell?: Cell): EvaluatedCell {
  let { value, format, message } = fPayload;
  format = cell?.format || format;

  const formattedValue = formatValue(value, { format, locale });
  if (isEvaluationError(value)) {
    return errorCell(value, message);
  }
  if (format === PLAIN_TEXT_FORMAT) {
    // TO DO:
    // with the next line, the value of the cell is transformed depending on the format.
    // This shouldn't happen, by doing this, the formulas handling numbers are not able
    // to interpret the value as a number.
    return textCell(toString(value), format, formattedValue);
  }
  if (value === null) {
    return emptyCell(format);
  }
  if (typeof value === "number") {
    if (isDateTimeFormat(format || "")) {
      return dateTimeCell(value, format, formattedValue);
    }
    return numberCell(value, format, formattedValue);
  }
  if (typeof value === "boolean") {
    return booleanCell(value, format, formattedValue);
  }
  return textCell(value, format, formattedValue);
}

function textCell(
  value: string,
  format: string | undefined,
  formattedValue: string
): EvaluatedCell {
  return {
    value,
    format,
    formattedValue,
    type: CellValueType.text,
    isAutoSummable: true,
    defaultAlign: "left",
  };
}

function numberCell(value: number, format: string | undefined, formattedValue: string): NumberCell {
  return {
    value: value || 0, // necessary to avoid "-0" and NaN values,
    format,
    formattedValue,
    type: CellValueType.number,
    isAutoSummable: true,
    defaultAlign: "right",
  };
}

const emptyCell = memoize(function emptyCell(format: string | undefined): EmptyCell {
  return {
    value: null,
    format,
    formattedValue: "",
    type: CellValueType.empty,
    isAutoSummable: true,
    defaultAlign: "left",
  };
});

function dateTimeCell(
  value: number,
  format: string | undefined,
  formattedValue: string
): NumberCell {
  return {
    value,
    format,
    formattedValue,
    type: CellValueType.number,
    isAutoSummable: false,
    defaultAlign: "right",
  };
}

function booleanCell(
  value: boolean,
  format: string | undefined,
  formattedValue: string
): BooleanCell {
  return {
    value,
    format,
    formattedValue,
    type: CellValueType.boolean,
    isAutoSummable: false,
    defaultAlign: "center",
  };
}

function errorCell(value: string, message?: string): ErrorCell {
  return {
    value,
    formattedValue: value,
    message,
    type: CellValueType.error,
    isAutoSummable: false,
    defaultAlign: "center",
  };
}
