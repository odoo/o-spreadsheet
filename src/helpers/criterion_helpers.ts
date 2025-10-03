import {
  DateTime,
  jsDateToNumber,
  valueToDateNumber,
} from "@odoo/o-spreadsheet-engine/helpers/dates";
import { DateCriterionValue, EvaluatedDateCriterion, Locale } from "../types";
import { parseLiteral } from "./cells";
import { formatValue } from "./format/format";

function toCriterionDateNumber(dateValue: Exclude<DateCriterionValue, "exactDate">): number {
  const today = DateTime.now();
  switch (dateValue) {
    case "today":
      return jsDateToNumber(today);
    case "yesterday":
      return jsDateToNumber(DateTime.fromTimestamp(today.setDate(today.getDate() - 1)));
    case "tomorrow":
      return jsDateToNumber(DateTime.fromTimestamp(today.setDate(today.getDate() + 1)));
    case "lastWeek":
      return jsDateToNumber(DateTime.fromTimestamp(today.setDate(today.getDate() - 7)));
    case "lastMonth":
      return jsDateToNumber(DateTime.fromTimestamp(today.setMonth(today.getMonth() - 1)));
    case "lastYear":
      return jsDateToNumber(DateTime.fromTimestamp(today.setFullYear(today.getFullYear() - 1)));
  }
}

/** Get all the dates values of a criterion converted to numbers, converting date values such as "today" to actual dates  */
export function getDateNumberCriterionValues(
  criterion: EvaluatedDateCriterion,
  locale: Locale
): (number | undefined)[] {
  if ("dateValue" in criterion && criterion.dateValue !== "exactDate") {
    return [toCriterionDateNumber(criterion.dateValue)];
  }

  return criterion.values.map((value) => valueToDateNumber(value, locale));
}

export function getDateCriterionFormattedValues(values: string[], locale: Locale) {
  return values.map((valueStr) => {
    if (valueStr.startsWith("=")) {
      return valueStr;
    }
    const value = parseLiteral(valueStr, locale);
    if (typeof value === "number") {
      return formatValue(value, { format: locale.dateFormat, locale });
    }
    return "";
  });
}
