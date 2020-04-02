import { Style } from "./misc";

// -----------------------------------------------------------------------------
// Conditional Formatting
// -----------------------------------------------------------------------------

/**
 * https://docs.microsoft.com/en-us/openspecs/office_standards/ms-xlsx/025ea6e4-ad42-43ea-a016-16f4e4688ac8
 */

export interface ConditionalFormat {
  id: string;
  rule: SingleColorRules | ColorScaleRule; //| DataBarRule | IconSetRule; // the rules to apply, in order;
  stopIfTrue?: boolean; // the next rules must not be evaluated/applied if this rule is true
  ranges: string[]; // the cells/ranges on which to apply this conditional formatting
}

export type SingleColorRules =
  | CellIsRule
  | ExpressionRule
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

export interface SingleColorRule {
  style: Style;
}

export interface TextRule extends SingleColorRule {
  text: string;
}
export interface CellIsRule extends SingleColorRule {
  type: "CellIsRule";
  operator: ConditionalFormattingOperatorValues;
  // can be one value for all operator except between, then it is 2 values
  values: string[];
}
export interface ExpressionRule extends SingleColorRule {
  type: "ExpressionRule";
}

export type ThresholdTypes = "value" | "number" | "percent" | "percentile" | "formula";
export type ColorScaleThreshold = { color: number; type: ThresholdTypes; value?: number };

export interface ColorScaleRule {
  type: "ColorScaleRule";
  minimum: ColorScaleThreshold;
  maximum: ColorScaleThreshold;
  midpoint?: ColorScaleThreshold;
}
// for future use
// export interface DataBarRule {
//   type: "ColorScaleRule";
// }
// export interface IconSetRule {
//   type: "IconSetRule";
// }
export interface ContainsTextRule extends TextRule {
  type: "ContainsTextRule";
}
export interface NotContainsTextRule extends TextRule {
  type: "NotContainsTextRule";
}
export interface BeginsWithRule extends TextRule {
  type: "BeginsWithRule";
}
export interface EndsWithRule extends TextRule {
  type: "EndsWithRule";
}
export interface containsBlanksRule extends TextRule {
  type: "containsBlanksRule";
}
export interface notContainsBlanksRule extends TextRule {
  type: "notContainsBlanksRule";
}
export interface containsErrorsRule extends SingleColorRule {
  type: "containsErrorsRule";
}
export interface notContainsErrorsRule extends SingleColorRule {
  type: "notContainsErrorsRule";
}
export interface TimePeriodRule extends SingleColorRule {
  type: "TimePeriodRule";
  timePeriod: string;
}
export interface AboveAverageRule extends SingleColorRule {
  type: "AboveAverageRule";
  /*"true" The conditional formatting rule is applied to cells with values above the average value of all cells in the range.
    "false" The conditional formatting rule is applied to cells with values below the average value of all cells in the range.*/
  aboveAverage: boolean;
  equalAverage: boolean;
}

export interface Top10Rule extends SingleColorRule {
  type: "Top10Rule";
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
