import { DATETIME_FORMAT, NULL_FORMAT } from "../../constants";
import { CellValue, CompiledFormula, Range, Sheet, UID } from "../../types";
import { formatDateTime } from "../dates";
import { formatNumber, formatStandardNumber } from "../numbers";

/**
 * Format a cell value with its format.
 */
export function formatValue(value: CellValue, format?: string): string {
  switch (typeof value) {
    case "string":
      return value;
    case "boolean":
      return value ? "TRUE" : "FALSE";
    case "number":
      if (format?.match(DATETIME_FORMAT)) {
        return formatDateTime({ value, format: format });
      }
      return format ? formatNumber(value, format) : formatStandardNumber(value);
    case "object":
      return "0";
  }
}

/**
 * Try to infer the cell format based on the formula dependencies.
 * e.g. if the formula is `=A1` and A1 has a given format, the
 * same format will be used.
 */
export function computeFormulaFormat(
  sheets: Record<UID, Sheet | undefined>,
  compiledFormula: CompiledFormula,
  dependencies: Range[]
): string | undefined {
  const dependenciesFormat = compiledFormula.dependenciesFormat;
  for (let dependencyFormat of dependenciesFormat) {
    switch (typeof dependencyFormat) {
      case "string":
        // dependencyFormat corresponds to a literal format which can be applied
        // directly.
        return dependencyFormat;
      case "number":
        // dependencyFormat corresponds to a dependency cell from which we must
        // find the cell and extract the associated format
        const ref = dependencies[dependencyFormat];
        const s = sheets[ref.sheetId];
        if (s) {
          // if the reference is a range --> the first cell in the range
          // determines the format
          const cellRef = s.rows[ref.zone.top]?.cells[ref.zone.left];
          if (cellRef && cellRef.format) {
            return cellRef.format;
          }
        }
        break;
    }
  }
  return NULL_FORMAT;
}
