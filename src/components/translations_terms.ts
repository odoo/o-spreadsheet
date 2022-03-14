import { _lt } from "../translation";
import { CommandResult } from "../types/index";

export const CfTerms = {
  CfTitle: _lt("Format rules"),
  IsRule: _lt("Format cells if..."),
  FormattingStyle: _lt("Formatting style"),
  PreviewText: _lt("Preview text"),
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
    Unexpected: _lt("The rule is invalid for an unknown reason"),
  },
  SingleColor: _lt("Single color"),
  ColorScale: _lt("Color scale"),
  IconSet: _lt("Icon set"),
  NewRule: _lt("Add another rule"),
  ReorderRules: _lt("Reorder rules"),
  ExitReorderMode: _lt("Stop reordering rules"),
  FixedNumber: _lt("Number"),
  Percentage: _lt("Percentage"),
  Percentile: _lt("Percentile"),
  Formula: _lt("Formula"),
  ApplyToRange: _lt("Apply to range"),
};
export const ColorScale = {
  CellValues: _lt("Cell values"),
  None: _lt("None"),
  Preview: _lt("Preview"),
  Minpoint: _lt("Minpoint"),
  MaxPoint: _lt("Maxpoint"),
  MidPoint: _lt("Midpoint"),
};

export const IconSetRule = {
  WhenValueIs: _lt("When value is"),
  Else: _lt("Else"),
  ReverseIcons: _lt("Reverse icons"),
  Icons: _lt("Icons"),
  Type: _lt("Type"),
};

export const CellIsOperators = {
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

export const ChartTerms = {
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
    Unexpected: _lt("The chart definition is invalid for an unknown reason"),
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

export const LinkEditorTerms = {
  Text: _lt("Text"),
  Link: _lt("Link"),
  Edit: _lt("Edit link"),
  Remove: _lt("Remove link"),
};

export const TopBarTerms = {
  ReadonlyAccess: _lt("Readonly Access"),
  PaintFormat: _lt("Paint Format"),
  ClearFormat: _lt("Clear Format"),
  FormatPercent: _lt("Format as percent"),
  DecreaseDecimal: _lt("Decrease decimal places"),
  IncreaseDecimal: _lt("Increase decimal places"),
  MoreFormat: _lt("More formats"),
  FontSize: _lt("Font Size"),
  Borders: _lt("Borders"),
  MergeCells: _lt("Merge Cells"),
  HorizontalAlign: _lt("Horizontal align"),
};

export const NumberFormatTerms = {
  General: _lt("General"),
  NoSpecificFormat: _lt("no specific format"),
  Number: _lt("Number"),
  Percent: _lt("Percent"),
  Currency: _lt("Currency"),
  CurrencyRounded: _lt("Currency rounded"),
  Date: _lt("Date"),
  Time: _lt("Time"),
  DateTime: _lt("Date time"),
  Duration: _lt("Duration"),
  CustomCurrency: _lt("Custom currency"),
};

export const GenericTerms = {
  Undo: _lt("Undo"),
  Redo: _lt("Redo"),
  Bold: _lt("Bold"),
  Italic: _lt("Italic"),
  Strikethrough: _lt("Strikethrough"),
  Underline: _lt("Underline"),
  FillColor: _lt("Fill Color"),
  TextColor: _lt("Text Color"),
  Cancel: _lt("Cancel"),
  Save: _lt("Save"),
  Confirm: _lt("Confirm"),
  Value: _lt("Value"),
  AndValue: _lt("and value"),
};

export const GenericWords = {
  And: _lt("and"),
};

export const CustomCurrencyTerms = {
  Currency: _lt("Currency"),
  Custom: _lt("Custom"),
  Symbol: _lt("Symbol"),
  Code: _lt("Code"),
  Format: _lt("Format"),
  Apply: _lt("Apply"),
};
