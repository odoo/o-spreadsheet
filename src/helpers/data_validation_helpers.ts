import { tryToNumber } from "../functions/helpers";
import type { DataValidationCriterion, DateCriterionValue, Locale } from "../types";
import { DateTime, jsDateToNumber, valueToDateNumber } from "./dates";

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
  criterion: DataValidationCriterion,
  locale: Locale
): (number | undefined)[] {
  if ("dateValue" in criterion && criterion.dateValue !== "exactDate") {
    return [toCriterionDateNumber(criterion.dateValue)];
  }

  return criterion.values.map((value) => valueToDateNumber(value, locale));
}

/** Convert the criterion values to numbers. Return undefined values if they cannot be converted to numbers. */
export function getCriterionValuesAsNumber(criterion: DataValidationCriterion, locale: Locale) {
  return criterion.values.map((value) => tryToNumber(value, locale));
}
