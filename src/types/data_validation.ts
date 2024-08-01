import type { UID } from "./misc";
import type { Range } from "./range";

export interface DataValidationRule {
  id: UID;
  criterion: DataValidationCriterion;
  ranges: Range[];
  isBlocking?: boolean;
}

export type TextContainsCriterion = {
  type: "textContains";
  values: string[];
};

export type TextNotContainsCriterion = {
  type: "textNotContains";
  values: string[];
};

export type TextIsCriterion = {
  type: "textIs";
  values: string[];
};

export type TextIsEmailCriterion = {
  type: "textIsEmail";
  values: string[];
};

export type TextIsLinkCriterion = {
  type: "textIsLink";
  values: string[];
};

export type DateIsCriterion = {
  type: "dateIs";
  dateValue: DateCriterionValue;
  values: string[];
};

export type DateIsBeforeCriterion = {
  type: "dateIsBefore";
  dateValue: DateCriterionValue;
  values: string[];
};

export type DateIsOnOrBeforeCriterion = {
  type: "dateIsOnOrBefore";
  dateValue: DateCriterionValue;
  values: string[];
};

export type DateIsAfterCriterion = {
  type: "dateIsAfter";
  dateValue: DateCriterionValue;
  values: string[];
};

export type DateIsOnOrAfterCriterion = {
  type: "dateIsOnOrAfter";
  dateValue: DateCriterionValue;
  values: string[];
};

export type DateIsBetweenCriterion = {
  type: "dateIsBetween";
  values: string[];
};

export type DateIsNotBetweenCriterion = {
  type: "dateIsNotBetween";
  values: string[];
};

export type DateIsValidCriterion = {
  type: "dateIsValid";
  values: string[];
};

export type IsEqualCriterion = {
  type: "isEqual";
  values: string[];
};

export type IsNotEqualCriterion = {
  type: "isNotEqual";
  values: string[];
};

export type IsGreaterThanCriterion = {
  type: "isGreaterThan";
  values: string[];
};

export type IsGreaterOrEqualToCriterion = {
  type: "isGreaterOrEqualTo";
  values: string[];
};

export type IsLessThanCriterion = {
  type: "isLessThan";
  values: string[];
};

export type IsLessOrEqualToCriterion = {
  type: "isLessOrEqualTo";
  values: string[];
};

export type IsBetweenCriterion = {
  type: "isBetween";
  values: string[];
};

export type IsNotBetweenCriterion = {
  type: "isNotBetween";
  values: string[];
};

export type IsCheckboxCriterion = {
  type: "isBoolean";
  values: string[];
};

export type IsValueInListCriterion = {
  type: "isValueInList";
  values: string[];
  displayStyle: "arrow" | "plainText";
};

export type IsValueInRangeCriterion = {
  type: "isValueInRange";
  values: string[];
  displayStyle: "arrow" | "plainText";
};

export type CustomFormulaCriterion = {
  type: "customFormula";
  values: string[];
};

export type DataValidationCriterion =
  | TextContainsCriterion
  | TextNotContainsCriterion
  | TextIsCriterion
  | TextIsEmailCriterion
  | TextIsLinkCriterion
  | IsBetweenCriterion
  | DateIsCriterion
  | DateIsBeforeCriterion
  | DateIsOnOrBeforeCriterion
  | DateIsAfterCriterion
  | DateIsOnOrAfterCriterion
  | DateIsBetweenCriterion
  | DateIsNotBetweenCriterion
  | DateIsValidCriterion
  | IsEqualCriterion
  | IsNotEqualCriterion
  | IsGreaterThanCriterion
  | IsGreaterOrEqualToCriterion
  | IsLessThanCriterion
  | IsLessOrEqualToCriterion
  | IsNotBetweenCriterion
  | IsCheckboxCriterion
  | IsValueInListCriterion
  | IsValueInRangeCriterion
  | CustomFormulaCriterion;

export type DateCriterionValue =
  | "today"
  | "tomorrow"
  | "yesterday"
  | "lastWeek"
  | "lastMonth"
  | "lastYear"
  | "exactDate";

export type DataValidationCriterionType = DataValidationCriterion["type"];

export type DataValidationDateCriterion = Extract<
  DataValidationCriterion,
  { dateValue: DateCriterionValue }
>;
