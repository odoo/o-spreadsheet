import { Style } from "./misc";
// -----------------------------------------------------------------------------
// Conditional Formatting
// -----------------------------------------------------------------------------

export interface ConditionalFormat {
  formatRule: ConditionalFormattingRule; // the rules to apply, in order
  ranges: string[]; // the cells/ranges on which to apply this conditional formatting
  style: Style;
}

/**
 * https://docs.microsoft.com/en-us/openspecs/office_standards/ms-xlsx/025ea6e4-ad42-43ea-a016-16f4e4688ac8
 */
export interface ConditionalFormattingRule {
  type: ConditionalFormattingRuleType;
  stopIfTrue?: boolean; // the next rules must not be evaluated/applied if this rule is true
}

export type ConditionalFormattingRuleType =
  | CellIsRule
  | ExpressionRule
  | ColorScaleRule
  | DataBarRule
  | IconSetRule
  | ContainsTextRule
  | NotContainsTextRule
  | BeginsWithRule
  | EndsWithRule
  | containsBlanksRule
  | notContainsBlanksRule
  | containsErrorsRule
  | notContainsErrorsRule
  | TimePeriodRule
  | AboveAverageRule
  | Top10Rule;

export type ConditionalFormattingRuleTypeString =
  | "CellIsRule"
  | "ExpressionRule"
  | "ColorScaleRule"
  | "DataBarRule"
  | "IconSetRule"
  | "ContainsTextRule"
  | "NotContainsTextRule"
  | "BeginsWithRule"
  | "EndsWithRule"
  | "containsBlanksRule"
  | "notContainsBlanksRule"
  | "containsErrorsRule"
  | "notContainsErrorsRule"
  | "TimePeriodRule"
  | "AboveAverageRule"
  | "Top10Rule";

export interface TextRule {
  text: string;
}
export interface CellIsRule {
  kind: "CellIsRule";
  operator: ConditionalFormattingOperatorValues;
  // can be one value for all operator except between, then it is 2 values
  values: string[];
}

export interface ExpressionRule {
  kind: "ExpressionRule";
}
export interface ColorScaleRule {
  kind: "ColorScaleRule";
}
export interface DataBarRule {
  kind: "ColorScaleRule";
}
export interface IconSetRule {
  kind: "IconSetRule";
}
export interface ContainsTextRule extends TextRule {
  kind: "ContainsTextRule";
}
export interface NotContainsTextRule extends TextRule {
  kind: "NotContainsTextRule";
}
export interface BeginsWithRule extends TextRule {
  kind: "BeginsWithRule";
}
export interface EndsWithRule extends TextRule {
  kind: "EndsWithRule";
}
export interface containsBlanksRule {
  kind: "containsBlanksRule";
}
export interface notContainsBlanksRule {
  kind: "notContainsBlanksRule";
}
export interface containsErrorsRule {
  kind: "containsErrorsRule";
}
export interface notContainsErrorsRule {
  kind: "notContainsErrorsRule";
}
export interface TimePeriodRule {
  kind: "TimePeriodRule";
  timePeriod: string;
}
export interface AboveAverageRule {
  kind: "AboveAverageRule";
  /*"true" The conditional formatting rule is applied to cells with values above the average value of all cells in the range.
      "false" The conditional formatting rule is applied to cells with values below the average value of all cells in the range.*/
  aboveAverage: boolean;
  equalAverage: boolean;
}

export interface Top10Rule {
  kind: "Top10Rule";
  percent: boolean;
  bottom: boolean;
  /*  specifies how many cells are formatted by this conditional formatting rule. The value of percent specifies whether
        rank is a percentage or a quantity of cells. When percent is "true", rank MUST be greater than or equal to zero and
        less than or equal to 100. Otherwise, rank MUST be greater than or equal to 1 and less than or equal to 1,000 */
  rank: number;
}
//https://docs.microsoft.com/en-us/dotnet/api/documentformat.openxml.spreadsheet.conditionalformattingoperatorvalues?view=openxml-2.8.1
export type ConditionalFormattingOperatorValues =
  | "BeginsWith"
  | "Between"
  | "ContainsText"
  | "EndsWith"
  | "Equal"
  | "GreaterThan"
  | "GreaterThanOrEqual"
  | "LessThan"
  | "LessThanOrEqual"
  | "NotBetween"
  | "NotContains"
  | "NotEqual";
