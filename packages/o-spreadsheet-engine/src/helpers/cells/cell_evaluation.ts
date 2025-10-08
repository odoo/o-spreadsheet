import { isEvaluationError, toString } from "../../functions/helpers";
import {
  BooleanCell,
  Cell,
  CellValue,
  CellValueType,
  EmptyCell,
  ErrorCell,
  EvaluatedCell,
  LiteralCell,
  NumberCell,
} from "../../types/cells";
import { LocaleFormat } from "../../types/format";
import { DEFAULT_LOCALE, Locale } from "../../types/locale";
import { CellPosition, FunctionResultObject } from "../../types/misc";
import { parseDateTime } from "../dates";
import {
  detectDateFormat,
  detectNumberFormat,
  formatValue,
  isDateTimeFormat,
  isTextFormat,
} from "../format/format";
import { detectLink } from "../links";
import { isBoolean, memoize } from "../misc2";
import { isNumber, parseNumber } from "../numbers";

export function evaluateLiteral(
  literalCell: LiteralCell,
  localeFormat: LocaleFormat,
  position?: CellPosition
): EvaluatedCell {
  const value =
    isTextFormat(localeFormat.format) && literalCell.parsedValue !== null
      ? literalCell.content
      : literalCell.parsedValue;
  const functionResult = { value, format: localeFormat.format, origin: position };
  return createEvaluatedCell(functionResult, localeFormat.locale);
}

export function parseLiteral(content: string, locale: Locale): CellValue {
  if (content.startsWith("=")) {
    throw new Error(`Cannot parse "${content}" because it's not a literal value. It's a formula`);
  }
  if (content === "") {
    return null;
  }
  if (content.includes("\n")) {
    return content;
  }
  if (isNumber(content, DEFAULT_LOCALE)) {
    return parseNumber(content, DEFAULT_LOCALE);
  }
  const internalDate = parseDateTime(content, locale);
  if (internalDate) {
    return internalDate.value;
  }
  if (isBoolean(content)) {
    return content.toUpperCase() === "TRUE";
  }
  return content;
}

export function createEvaluatedCell(
  functionResult: FunctionResultObject,
  locale: Locale = DEFAULT_LOCALE,
  cell?: Cell,
  origin?: CellPosition
): EvaluatedCell {
  const link = detectLink(functionResult.value);
  if (!link) {
    const evaluateCell = _createEvaluatedCell(functionResult, locale, cell);
    return addOrigin(evaluateCell, functionResult.origin ?? origin);
  }
  const value = parseLiteral(link.label, locale);
  const format =
    functionResult.format ||
    (typeof value === "number"
      ? detectDateFormat(link.label, locale) || detectNumberFormat(link.label)
      : undefined);
  const linkPayload = {
    value,
    format,
  };
  return addOrigin(
    {
      ..._createEvaluatedCell(linkPayload, locale, cell),
      link,
    },
    functionResult.origin ?? origin
  );
}

function _createEvaluatedCell(
  functionResult: FunctionResultObject,
  locale: Locale,
  cell?: Cell
): EvaluatedCell {
  let { value, format, message } = functionResult;
  format = cell?.format || format;

  const formattedValue = formatValue(value, { format, locale });
  if (isEvaluationError(value)) {
    return errorCell(value, message);
  }
  if (value === null) {
    return emptyCell(format);
  }
  if (isTextFormat(format)) {
    // TO DO:
    // with the next line, the value of the cell is transformed depending on the format.
    // This shouldn't happen, by doing this, the formulas handling numbers are not able
    // to interpret the value as a number.
    return textCell(toString(value), format, formattedValue);
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

function addOrigin(cell: EvaluatedCell, origin: CellPosition | undefined): EvaluatedCell {
  if (cell.value === null) {
    // ignore empty cells to allow sharing the same object instance
    return cell;
  }
  if ("origin" in cell) {
    return cell;
  }
  cell.origin = origin;
  return cell;
}
