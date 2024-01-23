import { isBoolean, isDateTime, isNumber, parseDateTime, parseNumber } from "..";
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
      if (value.includes('\\"')) {
        return value.replace(/\\"/g, '"');
      }
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
 * Parse a string representing a primitive cell value
 */
export function parsePrimitiveContent(content: string): CellValue {
  if (content === "") {
    return "";
  } else if (isNumber(content)) {
    return parseNumber(content);
  } else if (isBoolean(content)) {
    return content.toUpperCase() === "TRUE" ? true : false;
  } else if (isDateTime(content)) {
    return parseDateTime(content)!.value;
  } else {
    return content;
  }
}
