import { _lt } from "../../translation";
import { CancelledReason } from "../../types/index";

export const conditionalFormatingTerms = {
  CF_TITLE: _lt("Format rules"),
  IS_RULE: _lt("Format cells if..."),
  FORMATTING_STYLE: _lt("Formatting style"),
  BOLD: _lt("Bold"),
  ITALIC: _lt("Italic"),
  STRIKETHROUGH: _lt("Strikethrough"),
  TEXTCOLOR: _lt("Text Color"),
  FILLCOLOR: _lt("Fill Color"),
  CANCEL: _lt("Cancel"),
  SAVE: _lt("Save"),
  PREVIEWTEXT: _lt("Preview text"),
  Errors: {
    [CancelledReason.InvalidNumberOfArgs]: _lt("Invalid number of arguments"),
    [CancelledReason.MinNaN]: _lt("The minpoint must be a number"),
    [CancelledReason.MidNaN]: _lt("The midpoint must be a number"),
    [CancelledReason.MaxNaN]: _lt("The maxpoint must be a number"),
    [CancelledReason.MinBiggerThanMax]: _lt("Minimum must be smaller then Maximum"),
    [CancelledReason.MinBiggerThanMid]: _lt("Minimum must be smaller then Midpoint"),
    [CancelledReason.MidBiggerThanMax]: _lt("Midpoint must be smaller then Maximum"),
    [CancelledReason.MinInvalidFormula]: _lt("Invalid Minpoint formula"),
    [CancelledReason.MaxInvalidFormula]: _lt("Invalid Maxpoint formula"),
    [CancelledReason.MidInvalidFormula]: _lt("Invalid Midpoint formula"),
    [CancelledReason.MinAsyncFormulaNotSupported]: _lt(
      "Some formulas are not supported for the Minpoint"
    ),
    [CancelledReason.MaxAsyncFormulaNotSupported]: _lt(
      "Some formulas are not supported for the Maxpoint"
    ),
    [CancelledReason.MidAsyncFormulaNotSupported]: _lt(
      "Some formulas are not supported for the Midpoint"
    ),
    unexpected: _lt("The rule is invalid for an unknown reason"),
  },
};
export const colorScale = {
  CellValues: _lt("Cell values"),
  FixedNumber: _lt("Fixed number"),
  Percentage: _lt("Percentage"),
  Percentile: _lt("Percentile"),
  Formula: _lt("Formula"),
  FormatRules: _lt("Format rules"),
  None: _lt("None"),
  Preview: _lt("Preview"),
  Minpoint: _lt("Minpoint"),
  MaxPoint: _lt("MaxPoint"),
  MidPoint: _lt("MidPoint"),
};

export const cellIsOperators = {
  BeginsWith: _lt("Begins with"),
  Between: _lt("Between"),
  ContainsText: _lt("Contains text"),
  EndsWith: _lt("Ends with"),
  Equal: _lt("Is equal to"),
  GreaterThan: _lt("Greater than"),
  GreaterThanOrEqual: _lt("Greater than or equal"),
  LessThan: _lt("Less than"),
  LessThanOrEqual: _lt("Less than or equal"),
  NotBetween: _lt("Not between"),
  NotContains: _lt("Not contains"),
  NotEqual: _lt("Not equal"),
};

export const chartTerms = {
  ChartType: _lt("Chart type"),
  Line: _lt("Line"),
  Bar: _lt("Bar"),
  Pie: _lt("Pie"),
  Title: _lt("Title"),
  Series: _lt("Series"),
  DataSeries: _lt("Data Series"),
  MyDataHasTitle: _lt("My data has title"),
  DataCategories: _lt("Data categories (labels)"),
  UpdateChart: _lt("Update chart"),
  CreateChart: _lt("Create chart"),
  TitlePlaceholder: _lt("New Chart"),
};

export const FindAndReplaceTerms = {
  Search: _lt("Search"),
  Replace: _lt("Replace"),
  Next: _lt("Next"),
  Previous: _lt("Previous"),
  MatchCase: _lt("Match case"),
  ExactMatch: _lt("Match entire cell content"),
  SearchFormulas: _lt("Search in formulas"),
  ReplaceAll: _lt("Replace all"),
  ReplaceFormulas: _lt("Also modify formulas"),
};
