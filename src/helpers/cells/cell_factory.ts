import { isDateTimeFormat } from "..";
import { DEFAULT_ERROR_MESSAGE } from "../../constants";
import {
  BooleanEvaluation,
  CellValue,
  CellValueType,
  EmptyEvaluation,
  EvaluationResult,
  Format,
  InvalidEvaluation,
  NumberEvaluation,
} from "../../types";
import { BadExpressionError, EvaluationError } from "../../types/errors";
import { formatValue } from "../format";

/**
 * Instantiate a cell object based on a raw string content.
 * TODO update
 */
type EvaluationResultBuilder = (
  value: CellValue | null,
  format: Format | undefined
) => EvaluationResult | undefined;

function textEvaluation(value: string, format?: Format): EvaluationResult {
  return {
    type: CellValueType.text,
    value,
    format,
    isAutoSummable: true,
    defaultAlign: "left",
    composerContent: value,
    formattedValue: formatValue(value, format),
  };
}

function numberComposerContent(value: number, format?: Format): string {
  if (format?.includes("%")) {
    return `${value * 100}%`;
  }
  return formatValue(value);
}

function numberEvaluation(value: number, format?: Format): NumberEvaluation {
  return {
    type: CellValueType.number,
    value,
    format,
    isAutoSummable: true,
    defaultAlign: "right",
    composerContent: numberComposerContent(value, format),
    formattedValue: formatValue(value, format),
  };
}

function emptyEvaluation(format?: Format): EmptyEvaluation {
  return {
    type: CellValueType.empty,
    value: "",
    format,
    isAutoSummable: true,
    defaultAlign: "right",
    composerContent: "",
    formattedValue: "",
  };
}

function dateTimeEvaluation(value: number, format: Format): NumberEvaluation {
  const formattedValue = formatValue(value, format);
  return {
    type: CellValueType.number,
    value,
    format,
    isAutoSummable: false,
    defaultAlign: "right",
    composerContent: formattedValue,
    formattedValue,
  };
}

function booleanEvaluation(value: boolean, format?: Format): BooleanEvaluation {
  const formattedValue = value ? "TRUE" : "FALSE";
  return {
    type: CellValueType.boolean,
    value,
    format,
    isAutoSummable: false,
    defaultAlign: "center",
    composerContent: formattedValue,
    formattedValue,
  };
}

export function errorEvaluation(badExpression: string, error: EvaluationError): InvalidEvaluation {
  return {
    type: CellValueType.error,
    value: error.errorType,
    error,
    isAutoSummable: false,
    defaultAlign: "center",
    composerContent: badExpression,
    formattedValue: error.errorType,
  };
}

const builders: EvaluationResultBuilder[] = [
  function createEmpty(value, format) {
    if (value === "") {
      return emptyEvaluation(format);
    }
    return undefined;
  },
  function createDateTime(value, format) {
    if (!!format && typeof value === "number" && isDateTimeFormat(format)) {
      return dateTimeEvaluation(value, format);
    }
    return undefined;
  },
  function createNumber(value, format) {
    if (typeof value === "number") {
      return numberEvaluation(value, format);
    } else if (value === null) {
      return numberEvaluation(0, format);
    }
    return undefined;
  },
  function createBoolean(value, format) {
    if (typeof value === "boolean") {
      return booleanEvaluation(value, format);
    }
    return undefined;
  },
];
/**
 * TODO
 */
export function createEvaluationResult(value: CellValue | null, format?: Format): EvaluationResult {
  try {
    for (let builder of builders) {
      const evaluateCell = builder(value, format);
      if (evaluateCell) {
        return evaluateCell;
      }
    }
    return textEvaluation((value || 0).toString(), format);
  } catch (error) {
    return errorEvaluation(
      (value || 0).toString(),
      new BadExpressionError(error.message || DEFAULT_ERROR_MESSAGE)
    );
  }
}
