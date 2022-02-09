import { isBoolean, isDateTime, isNumber, parseDateTime, parseNumber } from "..";
import { CellValue } from "../../types";

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
