import { DATETIME_FORMAT } from "../../constants";
import { CellValue } from "../../types";
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
