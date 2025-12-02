import { tryToNumber } from "../functions/helpers";
import { DataValidationCriterion, DateCriterionValue, Locale } from "../types";
import { DateTime, jsDateToNumber, valueToDateNumber } from "./dates";

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
      today.setDate(today.getDate() + 1);
      today.setMonth(today.getMonth() - 1);
      return Math.floor(jsDateToNumber(today));
    }
    case "lastYear":
      today.setDate(today.getDate() + 1);
      today.setFullYear(today.getFullYear() - 1);
      return Math.floor(jsDateToNumber(today));
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
