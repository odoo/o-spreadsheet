import { DateCriterionValue } from "./generic_criterion";
import { Color, UID } from "./misc";
import { Range } from "./range";

export interface DataValidationRule {
  id: UID;
  criterion: DataValidationCriterion;
  ranges: Range[];
  isBlocking?: boolean;
}

export type TextContainsCriterion = {
  type: "containsText";
  values: string[];
};

export type TextNotContainsCriterion = {
  type: "notContainsText";
  values: string[];
};

export type TextIsCriterion = {
  type: "isEqualText";
  values: string[];
};

export type TextIsEmailCriterion = {
  type: "isEmail";
  values: string[];
};

export type TextIsLinkCriterion = {
  type: "isLink";
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
  colors?: Record<string, Color | undefined>;
  displayStyle: "arrow" | "plainText" | "chip";
};

export type IsValueInRangeCriterion = {
  type: "isValueInRange";
  values: string[];
  colors?: Record<string, Color | undefined>;
  displayStyle: "arrow" | "plainText" | "chip";
};

export type Top10Criterion = {
  type: "top10";
  values: string[];
  isPercent?: boolean;
  isBottom?: boolean;
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

export type DataValidationCriterionType = DataValidationCriterion["type"];

export type DataValidationDateCriterion = Extract<
  DataValidationCriterion,
  { dateValue: DateCriterionValue }
>;

export const availableDataValidationOperators: Set<DataValidationCriterionType> = new Set([
  "containsText",
  "notContainsText",
  "isEqualText",
  "isEmail",
  "isLink",
  "dateIs",
  "dateIsBefore",
  "dateIsOnOrBefore",
  "dateIsAfter",
  "dateIsOnOrAfter",
  "dateIsBetween",
  "dateIsNotBetween",
  "dateIsValid",
  "isEqual",
  "isNotEqual",
  "isGreaterThan",
  "isGreaterOrEqualTo",
  "isLessThan",
  "isLessOrEqualTo",
  "isBetween",
  "isNotBetween",
  "isBoolean",
  "isValueInList",
  "isValueInRange",
  "customFormula",
]);
