import { DateCriterionValue, EvaluatedDateCriterion, Locale } from "../types";
import { parseLiteral } from "./cells";
import { DateTime, getDaysInMonth, jsDateToNumber, valueToDateNumber } from "./dates";
import { formatValue } from "./format/format";

function toCriterionDateNumber(dateValue: Exclude<DateCriterionValue, "exactDate">): number {
  const today = DateTime.now();
  switch (dateValue) {
    case "today":
      return Math.floor(jsDateToNumber(today));
    case "yesterday": {
      today.setDate(today.getDate() - 1);
      return Math.floor(jsDateToNumber(today));
    }
    case "tomorrow": {
      today.setDate(today.getDate() + 1);
      return Math.floor(jsDateToNumber(today));
    }
    case "lastWeek":
      today.setDate(today.getDate() - 6);
      return Math.floor(jsDateToNumber(today));
    case "lastMonth": {
      const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      const dateInLastMonth = new DateTime(today.getFullYear(), lastMonth, 1);
      if (today.getDate() > getDaysInMonth(dateInLastMonth)) {
        today.setDate(1);
      } else {
        today.setDate(today.getDate() + 1);
        today.setMonth(today.getMonth() - 1);
      }
      return Math.floor(jsDateToNumber(today));
    }
    case "lastYear":
      // Handle leap year case
      if (today.getMonth() === 1 && today.getDate() === 29) {
        today.setDate(28);
        today.setFullYear(today.getFullYear() - 1);
      } else {
        today.setDate(today.getDate() + 1);
        today.setFullYear(today.getFullYear() - 1);
      }
      return Math.floor(jsDateToNumber(today));
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
