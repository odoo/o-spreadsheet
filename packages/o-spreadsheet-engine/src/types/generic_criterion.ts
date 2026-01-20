import { CellValue } from "./cells";

export interface GenericCriterion {
  type: GenericCriterionType;
  values: string[];
  isPercent?: boolean;
  isBottom?: boolean;
}

export type GenericDateCriterion = GenericCriterion & { dateValue: DateCriterionValue };

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
  | "isEmpty"
  | "top10"
  | "uniqueValues"
  | "duplicateValues";

export type DateCriterionValue =
  | "today"
  | "tomorrow"
  | "yesterday"
  | "lastWeek"
  | "lastMonth"
  | "lastYear"
  | "exactDate";

export type EvaluatedCriterion<T extends GenericCriterion = GenericCriterion> = Omit<
  T,
  "values"
> & { values: CellValue[] };

export type EvaluatedDateCriterion = EvaluatedCriterion<GenericDateCriterion>;
