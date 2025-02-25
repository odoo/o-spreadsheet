import { CellValue } from "./cells";

export interface GenericCriterion<T extends GenericCriterionType = GenericCriterionType> {
  type: T;
  values: string[];
}

export type GenericDateCriterion<T extends GenericCriterionType = GenericCriterionType> =
  GenericCriterion<T> & { dateValue: DateCriterionValue };

export type GenericCriterionType =
  | "containsText"
  | "notContainsText"
  | "isEqualText"
  | "isEmail"
  | "isLink"
  | "dateIs"
  | "dateIsBefore"
  | "dateIsOnOrBefore"
  | "dateIsAfter"
  | "dateIsOnOrAfter"
  | "dateIsBetween"
  | "dateIsNotBetween"
  | "dateIsValid"
  | "isEqual"
  | "isNotEqual"
  | "isGreaterThan"
  | "isGreaterOrEqualTo"
  | "isLessThan"
  | "isLessOrEqualTo"
  | "isBetween"
  | "isNotBetween"
  | "isBoolean"
  | "isValueInList"
  | "isValueInRange"
  | "customFormula"
  | "beginsWithText"
  | "endsWithText"
  | "isNotEmpty"
  | "isEmpty";

export type DateCriterionValue =
  | "today"
  | "tomorrow"
  | "yesterday"
  | "lastWeek"
  | "lastMonth"
  | "lastYear"
  | "exactDate";

// We want the Omit to apply to every type in the union, not to the union itself.
// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
export type EvaluatedCriterion<T extends GenericCriterion = GenericCriterion> = T extends any
  ? Omit<T, "values"> & { values: CellValue[] }
  : never;

export type EvaluatedDateCriterion = EvaluatedCriterion<GenericDateCriterion>;
