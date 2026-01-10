import { isEvaluationError, transposeMatrix } from "../functions/helpers";
import { Locale } from "../types/locale";
import { FunctionResultObject, isMatrix, Matrix } from "../types/misc";
import { formatValue } from "./format/format";

export function evaluationResultToDisplayString(
  result: Matrix<FunctionResultObject> | FunctionResultObject,
  emptyCell: string,
  locale: Locale
): string {
  if (isMatrix(result)) {
    const rowSeparator = locale.decimalSeparator === "," ? "/" : ",";
    const arrayStr = transposeMatrix(result)
      .map((row) =>
        row.map((val) => cellValueToDisplayString(val, emptyCell, locale)).join(rowSeparator)
      )
      .join(";");
    return `{${arrayStr}}`;
  }
  return cellValueToDisplayString(result, emptyCell, locale);
}

function cellValueToDisplayString(
  result: FunctionResultObject,
  emptyCell: string,
  locale: Locale
): string {
  const value = result.value;
  switch (typeof value) {
    case "number":
      return formatValue(result, locale);
    case "string":
      if (isEvaluationError(value)) {
        return value;
      }
      return `"${value}"`;
    case "boolean":
      return value ? "TRUE" : "FALSE";
  }
  return emptyCell;
}
