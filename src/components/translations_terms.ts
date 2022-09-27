import { _lt } from "../translation";
import { CommandResult } from "../types/index";

export const CfTerms = {
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
      "Lower inflection point must be smaller than upper inflection point"
    ),
    [CommandResult.MinInvalidFormula]: _lt("Invalid Minpoint formula"),
    [CommandResult.MaxInvalidFormula]: _lt("Invalid Maxpoint formula"),
    [CommandResult.MidInvalidFormula]: _lt("Invalid Midpoint formula"),
    [CommandResult.ValueUpperInvalidFormula]: _lt("Invalid upper inflection point formula"),
    [CommandResult.ValueLowerInvalidFormula]: _lt("Invalid lower inflection point formula"),
    [CommandResult.EmptyRange]: _lt("A range needs to be defined"),
    Unexpected: _lt("The rule is invalid for an unknown reason"),
  },
  ColorScale: _lt("Color scale"),
  IconSet: _lt("Icon set"),
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
  Series: _lt("Series"),
  Errors: {
    Unexpected: _lt("The chart definition is invalid for an unknown reason"),
    // BASIC CHART ERRORS (LINE | BAR | PIE)
    [CommandResult.InvalidDataSet]: _lt("The dataset is invalid"),
    [CommandResult.InvalidLabelRange]: _lt("Labels are invalid"),
    // SCORECARD CHART ERRORS
    [CommandResult.InvalidScorecardKeyValue]: _lt("The key value is invalid"),
    [CommandResult.InvalidScorecardBaseline]: _lt("The baseline value is invalid"),
    // GAUGE CHART ERRORS
    [CommandResult.InvalidGaugeDataRange]: _lt("The data range is invalid"),
    [CommandResult.EmptyGaugeRangeMin]: _lt("A minimum range limit value is needed"),
    [CommandResult.GaugeRangeMinNaN]: _lt("The minimum range limit value must be a number"),
    [CommandResult.EmptyGaugeRangeMax]: _lt("A maximum range limit value is needed"),
    [CommandResult.GaugeRangeMaxNaN]: _lt("The maximum range limit value must be a number"),
    [CommandResult.GaugeRangeMinBiggerThanRangeMax]: _lt(
      "Minimum range limit must be smaller than maximum range limit"
    ),
    [CommandResult.GaugeLowerInflectionPointNaN]: _lt(
      "The lower inflection point value must be a number"
    ),
    [CommandResult.GaugeUpperInflectionPointNaN]: _lt(
      "The upper inflection point value must be a number"
    ),
  },
};

export const NumberFormatTerms = {
  Automatic: _lt("Automatic"),
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

export const CustomCurrencyTerms = {
  Custom: _lt("Custom"),
};

export const MergeErrorMessage = _lt(
  "Merged cells are preventing this operation. Unmerge those cells and try again."
);
