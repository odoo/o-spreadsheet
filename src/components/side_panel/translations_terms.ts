import { _lt } from "../../translation";
import { CommandResult } from "../../types/index";

export const conditionalFormattingTerms = {
  CF_TITLE: _lt("Format rules"),
  IS_RULE: _lt("Format cells if..."),
  FORMATTING_STYLE: _lt("Formatting style"),
  BOLD: _lt("Bold"),
  ITALIC: _lt("Italic"),
  UNDERLINE: _lt("Underline"),
  STRIKE_THROUGH: _lt("Strikethrough"),
  TEXT_COLOR: _lt("Text Color"),
  FILL_COLOR: _lt("Fill Color"),
  CANCEL: _lt("Cancel"),
  SAVE: _lt("Save"),
  PREVIEW_TEXT: _lt("Preview text"),
  Errors: {
    [CommandResult.InvalidRange]: _lt("The range is invalid"),
    [CommandResult.FirstArgMissing]: _lt("The argument is missing. Please provide a value"),
    [CommandResult.SecondArgMissing]: _lt("The second argument is missing. Please provide a value"),
    [CommandResult.MinNaN]: _lt("The minpoint must be a number"),
    [CommandResult.MidNaN]: _lt("The midpoint must be a number"),
    [CommandResult.MaxNaN]: _lt("The maxpoint must be a number"),
    [CommandResult.ValueUpperInflectionNaN]: _lt("The first value must be a number"),
    [CommandResult.ValueLowerInflectionNaN]: _lt("The second value must be a number"),
    [CommandResult.MinBiggerThanMax]: _lt("Minimum must be smaller then Maximum"),
    [CommandResult.MinBiggerThanMid]: _lt("Minimum must be smaller then Midpoint"),
    [CommandResult.MidBiggerThanMax]: _lt("Midpoint must be smaller then Maximum"),
    [CommandResult.LowerBiggerThanUpper]: _lt(
      "Lower inflection point must be smaller then upper inflection point"
    ),
    [CommandResult.MinInvalidFormula]: _lt("Invalid Minpoint formula"),
    [CommandResult.MaxInvalidFormula]: _lt("Invalid Maxpoint formula"),
    [CommandResult.MidInvalidFormula]: _lt("Invalid Midpoint formula"),
    [CommandResult.ValueUpperInvalidFormula]: _lt("Invalid upper inflection point formula"),
    [CommandResult.ValueLowerInvalidFormula]: _lt("Invalid lower inflection point formula"),
    [CommandResult.EmptyRange]: _lt("A range needs to be defined"),
    unexpected: _lt("The rule is invalid for an unknown reason"),
  },
  SingleColor: _lt("Single color"),
  ColorScale: _lt("Color scale"),
  IconSet: _lt("Icon set"),
  newRule: _lt("Add another rule"),
  FixedNumber: _lt("Number"),
  Percentage: _lt("Percentage"),
  Percentile: _lt("Percentile"),
  Formula: _lt("Formula"),
};
export const colorScale = {
  CellValues: _lt("Cell values"),
  None: _lt("None"),
  Preview: _lt("Preview"),
  Minpoint: _lt("Minpoint"),
  MaxPoint: _lt("Maxpoint"),
  MidPoint: _lt("Midpoint"),
};

export const iconSetRule = {
  WhenValueIs: _lt("When value is"),
  Else: _lt("Else"),
  ReverseIcons: _lt("Reverse icons"),
  Icons: _lt("Icons"),
  Type: _lt("Type"),
  Value: _lt("Value"),
};

export const cellIsOperators = {
  IsEmpty: _lt("Is empty"),
  IsNotEmpty: _lt("Is not empty"),
  ContainsText: _lt("Contains"),
  NotContains: _lt("Does not contain"),
  BeginsWith: _lt("Starts with"),
  EndsWith: _lt("Ends with"),
  Equal: _lt("Is equal to"),
  NotEqual: _lt("Is not equal to"),
  GreaterThan: _lt("Is greater than"),
  GreaterThanOrEqual: _lt("Is greater than or equal to"),
  LessThan: _lt("Is less than"),
  LessThanOrEqual: _lt("Is less than or equal to"),
  Between: _lt("Is between"),
  NotBetween: _lt("Is not between"),
};

export const chartTerms = {
  ChartType: _lt("Chart type"),
  Line: _lt("Line"),
  Bar: _lt("Bar"),
  Pie: _lt("Pie"),
  StackedBar: _lt("Stacked barchart"),
  Title: _lt("Title"),
  Series: _lt("Series"),
  DataSeries: _lt("Data Series"),
  MyDataHasTitle: _lt("Data series include title"),
  DataCategories: _lt("Categories / Labels"),
  UpdateChart: _lt("Update chart"),
  CreateChart: _lt("Create chart"),
  TitlePlaceholder: _lt("New Chart"),
  BackgroundColor: _lt("Background color"),
  SelectColor: _lt("Select a color..."),
  VerticalAxisPosition: _lt("Vertical axis position"),
  LegendPosition: _lt("Legend position"),
  Left: _lt("Left"),
  Right: _lt("Right"),
  None: _lt("None"),
  Top: _lt("Top"),
  Bottom: _lt("Bottom"),
  Center: _lt("Center"),
  Linear: _lt("Linear"),
  Exponential: _lt("Exponential"),
  Logarithmic: _lt("Logarithmic"),
  Errors: {
    [CommandResult.EmptyDataSet]: _lt("A dataset needs to be defined"),
    [CommandResult.InvalidDataSet]: _lt("The dataset is invalid"),
    [CommandResult.InvalidLabelRange]: _lt("Labels are invalid"),
    unexpected: _lt("The chart definition is invalid for an unknown reason"),
  },
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

export const GenericWords = {
  And: _lt("and"),
};
