import { DEFAULT_ERROR_MESSAGE } from "../../constants";
import { toNumber } from "../../functions/helpers";
import {
  BooleanCell,
  CellValue,
  CellValueType,
  EmptyCell,
  ErrorCell,
  EvaluatedCell,
  Format,
  NumberCell,
} from "../../types";
import { CellErrorType, EvaluationError } from "../../types/errors";
import { detectFormat, formatValue, isDateTimeFormat } from "../format";
import { detectLink } from "../links";
import { isBoolean, isDateTime } from "../misc";
import { isNumber } from "../numbers";

export function evaluateLiteral(content: string | undefined, format?: Format): EvaluatedCell {
  return createEvaluatedCell(parseLiteral(content || ""), format);
}

export function parseLiteral(content: string): CellValue {
  if (content.startsWith("=")) {
    throw new Error(`Cannot parse "${content}" because it's not a literal value. It's a formula`);
  }
  if (isNumber(content) || isDateTime(content)) {
    return toNumber(content);
  } else if (isBoolean(content)) {
    return content.toUpperCase() === "TRUE" ? true : false;
  }
  return content;
}

export function createEvaluatedCell(value: CellValue | null, format?: Format): EvaluatedCell {
  const link = detectLink(value);
  if (link) {
    return {
      ..._createEvaluatedCell(parseLiteral(link.label), format || detectFormat(link.label)),
      link,
    };
  }
  return _createEvaluatedCell(value, format);
}

function _createEvaluatedCell(value: CellValue | null, format?: Format): EvaluatedCell {
  try {
    for (const builder of builders) {
      const evaluateCell = builder(value, format);
      if (evaluateCell) {
        return evaluateCell;
      }
    }
    return textCell((value || "").toString(), format);
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
  format: Format | undefined
) => EvaluatedCell | undefined;

function textCell(value: string, format?: Format): EvaluatedCell {
  return {
    type: CellValueType.text,
    value,
    format,
    isAutoSummable: true,
    defaultAlign: "left",
    formattedValue: formatValue(value, format),
  };
}

function numberCell(value: number, format?: Format): NumberCell {
  return {
    type: CellValueType.number,
    value: value || 0, // necessary to avoid "-0" and NaN values,
    format,
    isAutoSummable: true,
    defaultAlign: "right",
    formattedValue: formatValue(value, format),
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

function emptyCell(format?: Format): EmptyCell {
  if (format === undefined) {
    // share the same object to save memory
    return EMPTY_EVALUATED_CELL;
  }
  return {
    type: CellValueType.empty,
    value: "",
    format,
    isAutoSummable: true,
    defaultAlign: "left",
    formattedValue: "",
  };
}

function dateTimeCell(value: number, format: Format): NumberCell {
  const formattedValue = formatValue(value, format);
  return {
    type: CellValueType.number,
    value,
    format,
    isAutoSummable: false,
    defaultAlign: "right",
    formattedValue,
  };
}

function booleanCell(value: boolean, format?: Format): BooleanCell {
  const formattedValue = value ? "TRUE" : "FALSE";
  return {
    type: CellValueType.boolean,
    value,
    format,
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
  function createEmpty(value, format) {
    if (value === "") {
      return emptyCell(format);
    }
    return undefined;
  },
  function createDateTime(value, format) {
    if (!!format && typeof value === "number" && isDateTimeFormat(format)) {
      return dateTimeCell(value, format);
    }
    return undefined;
  },
  function createNumber(value, format) {
    if (typeof value === "number") {
      return numberCell(value, format);
    } else if (value === null) {
      return numberCell(0, format);
    }
    return undefined;
  },
  function createBoolean(value, format) {
    if (typeof value === "boolean") {
      return booleanCell(value, format);
    }
    return undefined;
  },
];
