import { formatValue } from "../helpers";
import { _t } from "../translation";
import { ChartColorScale, CommandResult, Locale } from "../types/index";

export const CfTerms = {
  Errors: {
    [CommandResult.InvalidRange]: _t("The range is invalid"),
    [CommandResult.FirstArgMissing]: _t("The argument is missing. Please provide a value"),
    [CommandResult.SecondArgMissing]: _t("The second argument is missing. Please provide a value"),
    [CommandResult.MinNaN]: _t("The minpoint must be a number"),
    [CommandResult.MidNaN]: _t("The midpoint must be a number"),
    [CommandResult.MaxNaN]: _t("The maxpoint must be a number"),
    [CommandResult.ValueUpperInflectionNaN]: _t("The first value must be a number"),
    [CommandResult.ValueLowerInflectionNaN]: _t("The second value must be a number"),
    [CommandResult.MinBiggerThanMax]: _t("Minimum must be smaller then Maximum"),
    [CommandResult.MinBiggerThanMid]: _t("Minimum must be smaller then Midpoint"),
    [CommandResult.MidBiggerThanMax]: _t("Midpoint must be smaller then Maximum"),
    [CommandResult.LowerBiggerThanUpper]: _t(
      "Lower inflection point must be smaller than upper inflection point"
    ),
    [CommandResult.MinInvalidFormula]: _t("Invalid Minpoint formula"),
    [CommandResult.MaxInvalidFormula]: _t("Invalid Maxpoint formula"),
    [CommandResult.MidInvalidFormula]: _t("Invalid Midpoint formula"),
    [CommandResult.ValueUpperInvalidFormula]: _t("Invalid upper inflection point formula"),
    [CommandResult.ValueLowerInvalidFormula]: _t("Invalid lower inflection point formula"),
    [CommandResult.EmptyRange]: _t("A range needs to be defined"),
    [CommandResult.ValueCellIsInvalidFormula]: _t(
      "At least one of the provided values is an invalid formula"
    ),
    Unexpected: _t("The rule is invalid for an unknown reason"),
  },
  ColorScale: _t("Color scale"),
  IconSet: _t("Icon set"),
  DataBar: _t("Data bar"),
};

export const ChartTerms: {
  [key: string]: any;
  ColorScales: Record<Extract<ChartColorScale, string>, string>;
} = {
  Series: _t("Series"),
  BackgroundColor: _t("Background color"),
  StackedBarChart: _t("Stacked bar chart"),
  StackedLineChart: _t("Stacked line chart"),
  StackedAreaChart: _t("Stacked area chart"),
  StackedColumnChart: _t("Stacked column chart"),
  CumulativeData: _t("Cumulative data"),
  TreatLabelsAsText: _t("Treat labels as text"),
  AggregatedChart: _t("Aggregate"),
  Errors: {
    Unexpected: _t("The chart definition is invalid for an unknown reason"),
    // BASIC CHART ERRORS (LINE | BAR | PIE)
    [CommandResult.InvalidDataSet]: _t("The dataset is invalid"),
    [CommandResult.InvalidLabelRange]: _t("Labels are invalid"),
    // SCORECARD CHART ERRORS
    [CommandResult.InvalidScorecardKeyValue]: _t("The key value is invalid"),
    [CommandResult.InvalidScorecardBaseline]: _t("The baseline value is invalid"),
    // GAUGE CHART ERRORS
    [CommandResult.InvalidGaugeDataRange]: _t("The data range is invalid"),
    [CommandResult.EmptyGaugeRangeMin]: _t("A minimum range limit value is needed"),
    [CommandResult.GaugeRangeMinNaN]: _t("The minimum range limit value must be a number"),
    [CommandResult.EmptyGaugeRangeMax]: _t("A maximum range limit value is needed"),
    [CommandResult.GaugeRangeMaxNaN]: _t("The maximum range limit value must be a number"),
    [CommandResult.GaugeLowerInflectionPointNaN]: _t(
      "The lower inflection point value must be a number"
    ),
    [CommandResult.GaugeUpperInflectionPointNaN]: _t(
      "The upper inflection point value must be a number"
    ),
  },
  ColorScales: {
    blues: _t("Blues"),
    cividis: _t("Cividis"),
    greens: _t("Greens"),
    greys: _t("Greys"),
    oranges: _t("Oranges"),
    purples: _t("Purples"),
    rainbow: _t("Rainbow"),
    reds: _t("Reds"),
    viridis: _t("Viridis"),
  },
};

export const CustomCurrencyTerms = {
  Custom: _t("Custom"),
};

export const MergeErrorMessage = _t(
  "Merged cells are preventing this operation. Unmerge those cells and try again."
);

export const TableHeaderMoveErrorMessage = _t("The header row of a table can't be moved.");

export const SplitToColumnsTerms = {
  Errors: {
    Unexpected: _t("Cannot split the selection for an unknown reason"),
    [CommandResult.NoSplitSeparatorInSelection]: _t(
      "There is no match for the selected separator in the selection"
    ),
    [CommandResult.MoreThanOneColumnSelected]: _t(
      "Only a selection from a single column can be split"
    ),
    [CommandResult.SplitWillOverwriteContent]: _t("Splitting will overwrite existing content"),
  },
};

export const RemoveDuplicateTerms = {
  Errors: {
    Unexpected: _t("Cannot remove duplicates for an unknown reason"),
    [CommandResult.MoreThanOneRangeSelected]: _t("Please select only one range of cells"),
    [CommandResult.EmptyTarget]: _t("Please select a range of cells containing values."),
    [CommandResult.NoColumnsProvided]: _t("Please select at latest one column to analyze."),
    //TODO: Remove it when accept to copy and paste merge cells
    [CommandResult.WillRemoveExistingMerge]: _t(
      "This operation is not possible due to a merge. Please remove the merges first than try again."
    ),
  },
};

export const DVTerms = {
  DateIs: {
    today: _t("today"),
    yesterday: _t("yesterday"),
    tomorrow: _t("tomorrow"),
    lastWeek: _t("in the past week"),
    lastMonth: _t("in the past month"),
    lastYear: _t("in the past year"),
  },
  DateIsBefore: {
    today: _t("today"),
    yesterday: _t("yesterday"),
    tomorrow: _t("tomorrow"),
    lastWeek: _t("one week ago"),
    lastMonth: _t("one month ago"),
    lastYear: _t("one year ago"),
  },
  CriterionError: {
    notEmptyValue: _t("The value must not be empty"),
    numberValue: _t("The value must be a number"),
    dateValue: _t("The value must be a date"),
    validRange: _t("The value must be a valid range"),
    validFormula: _t("The formula must be valid"),
  },
  Errors: {
    [CommandResult.InvalidRange]: _t("The range is invalid."),
    [CommandResult.InvalidDataValidationCriterionValue]: _t(
      "One or more of the provided criteria values are invalid. Please review and correct them."
    ),
    [CommandResult.InvalidNumberOfCriterionValues]: _t(
      "One or more of the provided criteria values are missing."
    ),
    Unexpected: _t("The rule is invalid for an unknown reason."),
  },
};

export const TableTerms = {
  Errors: {
    Unexpected: _t("The table zone is invalid for an unknown reason"),
    [CommandResult.TableOverlap]: _t("You cannot create overlapping tables."),
    [CommandResult.NonContinuousTargets]: _t(
      "A table can only be created on a continuous selection."
    ),
    [CommandResult.InvalidRange]: _t("The range is invalid"),
    [CommandResult.TargetOutOfSheet]: _t("The range is out of the sheet"),
  },
  Checkboxes: {
    hasFilters: _t("Filter button"),
    headerRow: _t("Header row(s)"),
    bandedRows: _t("Banded rows"),
    firstColumn: _t("First column"),
    lastColumn: _t("Last column"),
    bandedColumns: _t("Banded columns"),
    automaticAutofill: _t("Automatically autofill formulas"),
    totalRow: _t("Total row"),
    isDynamic: _t("Auto-adjust to formula result"),
  },
  Tooltips: {
    filterWithoutHeader: _t("Cannot have filters without a header row"),
    isDynamic: _t("For tables based on array formulas only"),
  },
};

export const measureDisplayTerms = {
  labels: {
    no_calculations: _t("No calculations"),
    "%_of_grand_total": _t("% of grand total"),
    "%_of_col_total": _t("% of column total"),
    "%_of_row_total": _t("% of row total"),
    "%_of": _t("% of"),
    "%_of_parent_row_total": _t("% of parent row total"),
    "%_of_parent_col_total": _t("% of parent column total"),
    "%_of_parent_total": _t("% of parent total"),
    difference_from: _t("Difference from"),
    "%_difference_from": _t("% difference from"),
    running_total: _t("Running total"),
    "%_running_total": _t("% Running total"),
    rank_asc: _t("Rank smallest to largest"),
    rank_desc: _t("Rank largest to smallest"),
    index: _t("Index"),
  },
  descriptions: {
    "%_of_grand_total": () => _t("Displayed as % of grand total"),
    "%_of_col_total": () => _t("Displayed as % of column total"),
    "%_of_row_total": () => _t("Displayed as % of row total"),
    "%_of": (field: string) => _t('Displayed as % of "%s"', field),
    "%_of_parent_row_total": (field: string) =>
      _t('Displayed as % of parent row total of "%s"', field),
    "%_of_parent_col_total": () => _t("Displayed as % of parent column total"),
    "%_of_parent_total": (field: string) => _t('Displayed as % of parent "%s" total', field),
    difference_from: (field: string) => _t('Displayed as difference from "%s"', field),
    "%_difference_from": (field: string) => _t('Displayed as % difference from "%s"', field),
    running_total: (field: string) => _t('Displayed as running total based on "%s"', field),
    "%_running_total": (field: string) => _t('Displayed as % running total based on "%s"', field),
    rank_asc: (field: string) =>
      _t('Displayed as rank from smallest to largest based on "%s"', field),
    rank_desc: (field: string) => _t('Displayed as rank largest to smallest based on "%s"', field),
    index: () => _t("Displayed as index"),
  },
  documentation: {
    no_calculations: _t("Displays the value that is entered in the field."),
    "%_of_grand_total": _t(
      "Displays values as a percentage of the grand total of all the values or data points in the report."
    ),
    "%_of_col_total": _t(
      "Displays all the values in each column or series as a percentage of the total for the column or series."
    ),
    "%_of_row_total": _t(
      "Displays the value in each row or category as a percentage of the total for the row or category."
    ),
    "%_of": _t("Displays values as a percentage of the value of the Base item in the Base field."),
    "%_of_parent_row_total": _t(
      "Calculates values as follows:\n(value for the item) / (value for the parent item on rows)"
    ),
    "%_of_parent_col_total": _t(
      "Calculates values as follows:\n(value for the item) / (value for the parent item on columns)"
    ),
    "%_of_parent_total": _t(
      "Calculates values as follows:\n(value for the item) / (value for the parent item of the selected Base field)"
    ),
    difference_from: _t(
      "Displays values as the difference from the value of the Base item in the Base field."
    ),
    "%_difference_from": _t(
      "Displays values as the percentage difference from the value of the Base item in the Base field."
    ),
    running_total: _t(
      "Displays the value for successive items in the Base field as a running total."
    ),
    "%_running_total": _t(
      "Calculates the value as a percentage for successive items in the Base field that are displayed as a running total."
    ),
    rank_asc: _t(
      "Displays the rank of selected values in a specific field, listing the smallest item in the field as 1, and each larger value with a higher rank value."
    ),
    rank_desc: _t(
      "Displays the rank of selected values in a specific field, listing the largest item in the field as 1, and each smaller value with a higher rank value."
    ),
    index: _t(
      "Calculates values as follows:\n((value in cell) x (Grand Total of Grand Totals)) / ((Grand Row Total) x (Grand Column Total))"
    ),
  },
};

export function getPivotTooBigErrorMessage(numberOfCells: number, locale: Locale): string {
  const formattedNumber = formatValue(numberOfCells, {
    format: "0,00",
    locale: locale,
  });
  return _t(
    "Oops—this pivot table is quite large (%s cells). Try simplifying it using the side panel.",
    formattedNumber
  );
}
