import { DEFAULT_ERROR_MESSAGE } from "../../constants";
import { toNumber } from "../../functions/helpers";
import type {
  BooleanCell,
  CellValue,
  EmptyCell,
  ErrorCell,
  EvaluatedCell,
  Locale,
  LocaleFormat,
  NumberCell,
} from "../../types";
import { CellValueType, DEFAULT_LOCALE } from "../../types";
import { CellErrorType, EvaluationError } from "../../types/errors";
import { isDateTime } from "../dates";
import { detectDateFormat, detectNumberFormat, formatValue, isDateTimeFormat } from "../format";
import { detectLink } from "../links";
import { isBoolean } from "../misc";
import { isNumber } from "../numbers";

export function evaluateLiteral(
  content: string | undefined,
  localeFormat: LocaleFormat
): EvaluatedCell {
  return createEvaluatedCell(parseLiteral(content || "", localeFormat.locale), localeFormat);
}

export function parseLiteral(content: string, locale: Locale): Exclude<CellValue, null> {
  if (content.startsWith("=")) {
    throw new Error(`Cannot parse "${content}" because it's not a literal value. It's a formula`);
  }
  if (isNumber(content, DEFAULT_LOCALE)) {
    return toNumber(content, DEFAULT_LOCALE);
  } else if (isDateTime(content, locale)) {
    return toNumber(content, locale);
  } else if (isBoolean(content)) {
    return content.toUpperCase() === "TRUE" ? true : false;
  }
  return content;
}

export function createEvaluatedCell(
  value: CellValue | null,
  localeFormat: LocaleFormat
): EvaluatedCell {
  const link = detectLink(value);
  if (link) {
    return {
      ..._createEvaluatedCell(parseLiteral(link.label, localeFormat.locale), {
        format:
          localeFormat.format ||
          detectDateFormat(link.label, localeFormat.locale) ||
          detectNumberFormat(link.label),
        locale: localeFormat.locale,
      }),
      link,
    };
  }
  return _createEvaluatedCell(value, localeFormat);
}

function _createEvaluatedCell(value: CellValue | null, localeFormat: LocaleFormat): EvaluatedCell {
  try {
    for (const builder of builders) {
      const evaluateCell = builder(value, localeFormat);
      if (evaluateCell) {
        return evaluateCell;
      }
    }
    return textCell((value || "").toString(), localeFormat);
  } catch (error) {
    return errorCell(
      new EvaluationError(CellErrorType.GenericError, error.message || DEFAULT_ERROR_MESSAGE)
    );
  }
}

/**
 * Instantiate an evaluated cell object based on its value
 * and format.
 */
type EvaluatedCellBuilder = (
  value: CellValue | null,
  localeFormat: LocaleFormat
) => EvaluatedCell | undefined;

function textCell(value: string, localeFormat: LocaleFormat): EvaluatedCell {
  return {
    type: CellValueType.text,
    value,
    format: localeFormat.format,
    isAutoSummable: true,
    defaultAlign: "left",
    formattedValue: formatValue(value, localeFormat),
  };
}

function numberCell(value: number, localeFormat: LocaleFormat): NumberCell {
  return {
    type: CellValueType.number,
    value: value || 0, // necessary to avoid "-0" and NaN values,
    format: localeFormat.format,
    isAutoSummable: true,
    defaultAlign: "right",
    formattedValue: formatValue(value, localeFormat),
  };
}

const EMPTY_EVALUATED_CELL: EmptyCell = {
  type: CellValueType.empty,
  value: "",
  format: undefined,
  isAutoSummable: true,
  defaultAlign: "left",
  formattedValue: "",
};

function emptyCell(localeFormat: LocaleFormat): EmptyCell {
  if (localeFormat.format === undefined) {
    // share the same object to save memory
    return EMPTY_EVALUATED_CELL;
  }
  return {
    type: CellValueType.empty,
    value: "",
    format: localeFormat.format,
    isAutoSummable: true,
    defaultAlign: "left",
    formattedValue: "",
  };
}

function dateTimeCell(value: number, localeFormat: LocaleFormat): NumberCell {
  const formattedValue = formatValue(value, localeFormat);
  return {
    type: CellValueType.number,
    value,
    format: localeFormat.format,
    isAutoSummable: false,
    defaultAlign: "right",
    formattedValue,
  };
}

function booleanCell(value: boolean, localeFormat: LocaleFormat): BooleanCell {
  const formattedValue = value ? "TRUE" : "FALSE";
  return {
    type: CellValueType.boolean,
    value,
    format: localeFormat.format,
    isAutoSummable: false,
    defaultAlign: "center",
    formattedValue,
  };
}

export function errorCell(error: EvaluationError): ErrorCell {
  return {
    type: CellValueType.error,
    value: error.errorType,
    error,
    isAutoSummable: false,
    defaultAlign: "center",
    formattedValue: error.errorType,
  };
}

const builders: EvaluatedCellBuilder[] = [
  function createEmpty(value, localeFormat) {
    if (value === "") {
      return emptyCell(localeFormat);
    }
    return undefined;
  },
  function createDateTime(value, localeFormat) {
    if (
      !!localeFormat.format &&
      typeof value === "number" &&
      isDateTimeFormat(localeFormat.format)
    ) {
      return dateTimeCell(value, localeFormat);
    }
    return undefined;
  },
  function createNumber(value, localeFormat) {
    if (typeof value === "number") {
      return numberCell(value, localeFormat);
    } else if (value === null) {
      return numberCell(0, localeFormat);
    }
    return undefined;
  },
  function createBoolean(value, localeFormat) {
    if (typeof value === "boolean") {
      return booleanCell(value, localeFormat);
    }
    return undefined;
  },
];
