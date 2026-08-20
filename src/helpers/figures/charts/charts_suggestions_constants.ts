import { ChartRangeDataSource } from "../../..";
import {
  DEFAULT_GAUGE_LOWER_COLOR,
  DEFAULT_GAUGE_MIDDLE_COLOR,
  DEFAULT_GAUGE_UPPER_COLOR,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
} from "../../../constants";
import { _t } from "../../../translation";
import { BarChartDefinition } from "../../../types/chart/bar_chart";
import { BubbleChartDefinition } from "../../../types/chart/bubble_chart";
import { CalendarChartDefinition } from "../../../types/chart/calendar_chart";
import {
  CategoricalDateNumberContext,
  CategoricalTwoNumbersContext,
  CategoricalVsMultipleNumbersContext,
  CategoricalVsNumberContext,
  CategoricalVsPercentageContext,
  DateVsMultipleNumbersContext,
  DateVsSeriesContext,
  LabelVsMultipleNumbersContext,
  LabelVsNumberContext,
  ManyNumbersContext,
  MultipleCategoricalsVsNumberContext,
  NumberVsNumberContext,
  SingleCategoricalContext,
  SingleDateContext,
  SingleLabelContext,
  SingleNumberContext,
  SinglePercentageContext,
  Suggestion,
} from "../../../types/chart/chart_suggestion";
import { ComboChartDefinition } from "../../../types/chart/combo_chart";
import { LegendPosition } from "../../../types/chart/common_chart";
import { GaugeChartDefinition } from "../../../types/chart/gauge_chart";
import { LineChartDefinition } from "../../../types/chart/line_chart";
import { PieChartDefinition } from "../../../types/chart/pie_chart";
import { PyramidChartDefinition } from "../../../types/chart/pyramid_chart";
import { RadarChartDefinition } from "../../../types/chart/radar_chart";
import { ScatterChartDefinition } from "../../../types/chart/scatter_chart";
import { ScorecardChartDefinition } from "../../../types/chart/scorecard_chart";
import { SunburstChartDefinition } from "../../../types/chart/sunburst_chart";
import { TreeMapChartDefinition } from "../../../types/chart/tree_map_chart";

/** Above this many rows, shape-based charts (radar, scatter, pyramid) become unreadable. */
const MAX_ROWS_FOR_SHAPE_CHART = 10;

function barChart(
  titleText: string,
  source: ChartRangeDataSource<string>,
  opts: Partial<BarChartDefinition<string>> = {}
): BarChartDefinition<string> {
  return {
    ...opts,
    type: "bar",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: opts.legendPosition ?? "none",
    stacked: opts.stacked ?? false,
    humanize: true,
    aggregated: opts.aggregated ?? false,
  };
}

function lineChart(
  titleText: string,
  source: ChartRangeDataSource<string>,
  opts: Partial<LineChartDefinition<string>> = {}
): LineChartDefinition<string> {
  return {
    ...opts,
    type: "line",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: opts.legendPosition ?? "none",
    stacked: opts.stacked ?? false,
    cumulative: opts.cumulative ?? false,
    labelsAsText: false,
    humanize: true,
  };
}

function pieChart(
  titleText: string,
  source: ChartRangeDataSource<string>,
  opts: Partial<PieChartDefinition<string>> = {}
): PieChartDefinition<string> {
  return {
    ...opts,
    type: "pie",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: opts.legendPosition ?? "top",
    humanize: true,
  };
}

function radarChart(
  titleText: string,
  source: ChartRangeDataSource<string>,
  opts: Partial<RadarChartDefinition<string>> = {}
): RadarChartDefinition<string> {
  return {
    ...opts,
    type: "radar",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: opts.legendPosition ?? "none",
    stacked: false,
    humanize: true,
  };
}

function sunburstChart(
  titleText: string,
  source: ChartRangeDataSource<string>
): SunburstChartDefinition<string> {
  return {
    type: "sunburst",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: "none",
  };
}

function treemapChart(
  titleText: string,
  source: ChartRangeDataSource<string>
): TreeMapChartDefinition<string> {
  return {
    type: "treemap",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: "none",
  };
}

function calendarChart(
  titleText: string,
  source: ChartRangeDataSource<string>
): CalendarChartDefinition<string> {
  return {
    type: "calendar",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: "none",
    horizontalGroupBy: "month_number",
    verticalGroupBy: "day_of_week",
    humanize: true,
  };
}

function scatterChart(
  titleText: string,
  source: ChartRangeDataSource<string>
): ScatterChartDefinition<string> {
  return {
    type: "scatter",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: "none",
    labelsAsText: false,
    humanize: true,
  };
}

function pyramidChart(
  titleText: string,
  source: ChartRangeDataSource<string>,
  opts: { legendPosition?: LegendPosition } = {}
): PyramidChartDefinition<string> {
  return {
    type: "pyramid",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: opts.legendPosition ?? "top",
    stacked: false,
    horizontal: true,
    humanize: true,
  };
}

function comboChart(
  titleText: string,
  source: ChartRangeDataSource<string>,
  opts: { aggregated?: boolean } = {}
): ComboChartDefinition<string> {
  return {
    ...opts,
    type: "combo",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: "top",
    humanize: true,
  };
}

function bubbleChart(
  titleText: string,
  xRange: string,
  yRanges: string[],
  sizeRange: string | undefined,
  labelRange: string | undefined,
  dataSetsHaveTitle: boolean
): BubbleChartDefinition<string> {
  return {
    type: "bubble",
    title: { text: titleText },
    humanize: true,
    dataSetsHaveTitle,
    yRanges,
    xRange,
    sizeRange,
    labelRange,
    labelsAsText: false,
    legendPosition: "none",
    bubbleColor: { color: "multiple" },
    verticalAxisPosition: "left",
  };
}

function scorecardChart(
  titleText: string,
  keyValue: string,
  opts: Partial<ScorecardChartDefinition> = {}
): ScorecardChartDefinition {
  return {
    ...opts,
    type: "scorecard",
    title: { text: titleText },
    keyValue,
    baselineMode: opts.baselineMode ?? "difference",
    baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
    baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
    humanize: opts.humanize ?? true,
  };
}

export function gaugeChart(
  titleText: string,
  dataRange: string,
  rangeMin: string,
  rangeMax: string
): GaugeChartDefinition<string> {
  return {
    type: "gauge",
    title: { text: titleText },
    dataRange,
    sectionRule: {
      colors: {
        lowerColor: DEFAULT_GAUGE_LOWER_COLOR,
        middleColor: DEFAULT_GAUGE_MIDDLE_COLOR,
        upperColor: DEFAULT_GAUGE_UPPER_COLOR,
      },
      rangeMin,
      rangeMax,
      lowerInflectionPoint: { type: "percentage", value: "33", operator: "<=" },
      upperInflectionPoint: { type: "percentage", value: "66", operator: "<=" },
    },
    humanize: true,
  };
}

/** Pattern A — Single numeric column */
export const SINGLE_NUMBER_COLUMN_SUGGESTIONS: Suggestion<SingleNumberContext>[] = [
  {
    description: _t("Highlights the most recent value compared to the previous one."),
    isApplicable: ({ rowCount }) => rowCount < 3,
    build: (ctx) =>
      scorecardChart(ctx.title, `=${ctx.lastCellXC}`, {
        baseline: ctx.prevCellXC ? `=${ctx.prevCellXC}` : undefined,
        baselineMode: "difference",
      }),
  },
  {
    description: _t("Shows the position of the last value within the data's min-max range."),
    isApplicable: ({ rowCount }) => rowCount === 3,
    build: (ctx) =>
      gaugeChart(ctx.title, ctx.lastCellXC, `=${ctx.firstCellXC}`, `=${ctx.prevCellXC}`),
  },
  {
    description: _t("Compares individual values side-by-side."),
    isApplicable: ({ rowCount }) => rowCount > 1,
    build: (ctx) => barChart(ctx.title, ctx.source),
  },
  {
    description: _t("Shows the evolution of all values over the range."),
    isApplicable: ({ rowCount }) => rowCount > 2,
    build: (ctx) => lineChart(ctx.title, ctx.source),
  },
  {
    description: _t("Emphasizes total accumulation over the range."),
    isApplicable: ({ rowCount }) => rowCount > 2,
    build: (ctx) => lineChart(ctx.title, ctx.source, { fillArea: true, cumulative: true }),
  },
];

/** Pattern B — Single percentage column */
export const SINGLE_PERCENTAGE_COLUMN_SUGGESTIONS: Suggestion<SinglePercentageContext>[] = [
  {
    description: _t("Shows the last percentage value with its baseline."),
    isApplicable: ({ rowCount }) => rowCount < 3,
    build: (ctx) =>
      scorecardChart(ctx.title, `=${ctx.lastCellXC}`, {
        baseline: ctx.prevCellXC ? `=${ctx.prevCellXC}` : undefined,
        baselineMode: "percentage",
      }),
  },
  {
    description: _t("Natural fit for a 0–100% range."),
    isApplicable: ({ rowCount }) => rowCount === 1,
    build: (ctx) => gaugeChart(ctx.title, ctx.lastCellXC, "0", ctx.isAboveOne ? "100" : "1"),
  },
  {
    description: _t("Natural fit for a 0–100% range."),
    isApplicable: ({ rowCount }) => rowCount === 3,
    build: (ctx) =>
      gaugeChart(ctx.title, ctx.lastCellXC, `=${ctx.firstCellXC}`, `=${ctx.prevCellXC}`),
  },
  {
    description: _t("Shows completion against total."),
    isApplicable: ({ rowCount }) => rowCount > 1,
    build: (ctx) => pieChart(ctx.title, ctx.source, { isDoughnut: true }),
  },
  {
    description: _t("Compares all percentage values side-by-side."),
    isApplicable: ({ rowCount }) => rowCount > 1,
    build: (ctx) => barChart(ctx.title, ctx.source),
  },
];

/** Pattern C — Single date column */
// TODO(ANHE): add line/bar/calendar suggestions once date-bucketing is supported.
export const SINGLE_DATE_COLUMN_SUGGESTIONS: Suggestion<SingleDateContext>[] = [
  {
    description: _t("Shows the last date value."),
    isApplicable: ({ rowCount }) => rowCount === 1,
    build: (ctx) => scorecardChart(ctx.title, `=${ctx.lastCellXC}`),
  },
];

/** Pattern D — Single categorical column */
export const SINGLE_CATEGORICAL_COLUMN_SUGGESTIONS: Suggestion<SingleCategoricalContext>[] = [
  {
    description: _t("Shows the share of each category."),
    build: (ctx) => pieChart(ctx.title, ctx.source, { aggregated: true, legendPosition: "top" }),
  },
  {
    description: _t("Same as pie, cleaner proportional look."),
    build: (ctx) =>
      pieChart(ctx.title, ctx.source, {
        aggregated: true,
        isDoughnut: true,
        legendPosition: "top",
      }),
  },
  {
    description: _t("Absolute count per category."),
    build: (ctx) =>
      barChart(
        ctx.title,
        { ...ctx.source, labelRange: ctx.range },
        { legendPosition: "none", aggregated: true }
      ),
  },
];

/** Pattern E — Single label column */
export const SINGLE_LABEL_COLUMN_SUGGESTIONS: Suggestion<SingleLabelContext>[] = [
  {
    description: _t("Displays a key performance indicator."),
    isApplicable: ({ rowCount }) => rowCount === 1,
    build: (ctx) =>
      scorecardChart(ctx.title, `=${ctx.lastCellXC}`, { baselineMode: "text", humanize: false }),
  },
];

/** Pattern F — Categorical + Number */
export const CATEGORICAL_VS_NUMBER_SUGGESTIONS: Suggestion<CategoricalVsNumberContext>[] = [
  {
    description: _t("Classic category-vs-value comparison."),
    build: (ctx) => barChart(ctx.title, ctx.source, { aggregated: true }),
  },
  {
    description: _t("Better when category labels are long."),
    build: (ctx) => barChart(ctx.title, ctx.source, { horizontal: true, aggregated: true }),
  },
  {
    description: _t("Share of total per category."),
    build: (ctx) => pieChart(ctx.title, ctx.source, { legendPosition: "top", aggregated: true }),
  },
  {
    description: _t("Proportional area — good for many categories."),
    build: (ctx) => treemapChart(ctx.title, ctx.treemapSource),
  },
];

/** Patterns G & J — Date + Number or Date + Percentage */
export const DATE_VS_SERIES_SUGGESTIONS: Suggestion<DateVsSeriesContext>[] = [
  {
    description: _t("Best for visualizing time-series trends."),
    build: (ctx) => lineChart(ctx.title, ctx.source),
  },
  {
    description: _t("Emphasizes total volume over time."),
    build: (ctx) => lineChart(ctx.title, ctx.source, { fillArea: true, cumulative: true }),
  },
  {
    description: _t("Period-by-period comparison."),
    build: (ctx) => barChart(ctx.title, ctx.source),
  },
  {
    description: _t("Shows intensity variation across days of the year."),
    isApplicable: ({ isPercentage }) => !isPercentage,
    build: (ctx) => calendarChart(ctx.title, ctx.source),
  },
];

/** Pattern H — Number + Number */
export const NUMBER_VS_NUMBER_SUGGESTIONS: Suggestion<NumberVsNumberContext>[] = [
  {
    description: _t("Highlights the second metric compared to the first one."),
    isApplicable: ({ rowCount1, rowCount2 }) => rowCount1 === 1 && rowCount2 === 1,
    build: (ctx) =>
      scorecardChart(ctx.title, `=${ctx.lastCellXC}`, {
        baseline: ctx.prevCellXC ? `=${ctx.prevCellXC}` : undefined,
        baselineMode: "difference",
      }),
  },
  {
    description: _t("Side-by-side comparison of two numeric series."),
    build: (ctx) => barChart(ctx.title, ctx.sourceBoth, { legendPosition: "top" }),
  },
  {
    description: _t("Reveals correlation between two numeric variables."),
    isApplicable: ({ rowCount1 }) => rowCount1 > 2,
    build: (ctx) => scatterChart(ctx.title, ctx.source2),
  },
  {
    description: _t("Bar for the first series, line for the second — good for mixed scales."),
    isApplicable: ({ rowCount1 }) => rowCount1 > 2,
    build: (ctx) => comboChart(ctx.title, ctx.sourceBoth),
  },
  {
    description: _t("When both metrics contribute to a total."),
    isApplicable: ({ rowCount1 }) => rowCount1 > 2,
    build: (ctx) =>
      lineChart(ctx.title, ctx.sourceBoth, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
  },
  {
    description: _t("Shape-based comparison when rows represent named entities."),
    isApplicable: ({ rowCount1 }) => rowCount1 > 2 && rowCount1 <= MAX_ROWS_FOR_SHAPE_CHART,
    build: (ctx) => radarChart(ctx.title, ctx.sourceBoth, { legendPosition: "top" }),
  },
];

/** Pattern I — Categorical + Percentage */
export const CATEGORICAL_VS_PERCENTAGE_SUGGESTIONS: Suggestion<CategoricalVsPercentageContext>[] = [
  {
    description: _t("Vertical comparison of rates per category."),
    build: (ctx) => barChart(ctx.title, ctx.source),
  },
  {
    description: _t("Progress-bar style per category."),
    build: (ctx) => barChart(ctx.title, ctx.source, { horizontal: true }),
  },
  {
    description: _t("Share of total percentage across categories."),
    build: (ctx) => pieChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    description: _t("Comparison of completion rates across categories."),
    isApplicable: ({ rowCount }) => rowCount > 2 && rowCount <= MAX_ROWS_FOR_SHAPE_CHART,
    build: (ctx) => radarChart(ctx.title, ctx.source),
  },
];

/** Pattern K — Label + Number */
export const LABEL_VS_NUMBER_SUGGESTIONS: Suggestion<LabelVsNumberContext>[] = [
  {
    description: _t("Highlights the most recent value for the named entity."),
    isApplicable: ({ rowCount }) => rowCount === 1,
    // TODO(ANHE): remove falsy humanize when it's fixed in the scorecard chart.
    build: (ctx) =>
      scorecardChart("", `=${ctx.lastCellXC}`, {
        humanize: false,
        baselineMode: "text",
        baseline: ctx.prevCellXC ? `=${ctx.prevCellXC}` : undefined,
      }),
  },
  {
    description: _t("Vertical comparison across named items."),
    isApplicable: ({ rowCount }) => rowCount > 1,
    build: (ctx) => barChart(ctx.title, ctx.source),
  },
  {
    description: _t("Works well for named entities with long labels."),
    isApplicable: ({ rowCount }) => rowCount > 1,
    build: (ctx) => barChart(ctx.title, ctx.source, { horizontal: true }),
  },
  {
    description: _t("Share of total per category."),
    isApplicable: ({ rowCount }) => rowCount > 1 && rowCount <= MAX_ROWS_FOR_SHAPE_CHART,
    build: (ctx) => pieChart(ctx.title, ctx.source, { legendPosition: "top", aggregated: true }),
  },
  {
    description: _t("Shape-based comparison across labeled items."),
    isApplicable: ({ rowCount }) => rowCount > 2 && rowCount <= MAX_ROWS_FOR_SHAPE_CHART,
    build: (ctx) => radarChart(ctx.title, ctx.source),
  },
];

/** Pattern M — Categorical + Multiple Numbers */
export const CATEGORICAL_VS_MULTIPLE_NUMBERS_SUGGESTIONS: Suggestion<CategoricalVsMultipleNumbersContext>[] =
  [
    {
      description: _t("Side-by-side comparison across categories for each series."),
      build: (ctx) => barChart(ctx.title, ctx.source, { legendPosition: "top" }),
    },
    {
      description: _t("Shows composition and total per category."),
      build: (ctx) => barChart(ctx.title, ctx.source, { stacked: true, legendPosition: "top" }),
    },
    {
      description: _t("Trend per series across categories."),
      build: (ctx) => lineChart(ctx.title, ctx.source, { legendPosition: "top" }),
    },
    {
      description: _t("Volume and composition across categories."),
      build: (ctx) =>
        lineChart(ctx.title, ctx.source, { stacked: true, fillArea: true, legendPosition: "top" }),
    },
    {
      description: _t("Shape comparison across metrics (best for ≤ 10 rows)."),
      isApplicable: ({ rowCount }) => rowCount > 2 && rowCount <= MAX_ROWS_FOR_SHAPE_CHART,
      build: (ctx) => radarChart(ctx.title, ctx.source, { legendPosition: "top" }),
    },
  ];

/** Pattern N — Date + Multiple Numbers */
export const DATE_VS_MULTIPLE_NUMBERS_SUGGESTIONS: Suggestion<DateVsMultipleNumbersContext>[] = [
  {
    description: _t("Trend comparison across multiple metrics over time."),
    build: (ctx) => lineChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    description: _t("Volume composition over time."),
    build: (ctx) =>
      lineChart(ctx.title, ctx.source, { stacked: true, fillArea: true, legendPosition: "top" }),
  },
  {
    description: _t("Bar for the primary metric, line for the others."),
    build: (ctx) => comboChart(ctx.title, ctx.source),
  },
  {
    description: _t("Period-by-period grouped comparison."),
    build: (ctx) => barChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
];

/** Pattern O — Categorical + Categorical + Number */
export const MULTIPLE_CATEGORICALS_VS_NUMBER_SUGGESTIONS: Suggestion<MultipleCategoricalsVsNumberContext>[] =
  [
    {
      description: _t("Two-level hierarchy weighted by value."),
      build: (ctx) => sunburstChart(ctx.title, ctx.hierarchySource),
    },
    {
      description: _t("Proportional nested area weighted by value."),
      build: (ctx) => treemapChart(ctx.title, ctx.hierarchySource),
    },
    {
      description: _t("One series per inner category, grouped by outer category."),
      build: (ctx) => barChart(ctx.title, ctx.barSource, { legendPosition: "top" }),
    },
    {
      description: _t("Contribution of inner categories per outer category."),
      build: (ctx) => barChart(ctx.title, ctx.barSource, { stacked: true, legendPosition: "top" }),
    },
  ];

/** Pattern P — Categorical + Date + Number */
export const CATEGORICAL_DATE_NUMBER_SUGGESTIONS: Suggestion<CategoricalDateNumberContext>[] = [
  {
    description: _t("Trend of values over time."),
    build: (ctx) => lineChart(ctx.title, ctx.sourceByDate, { legendPosition: "top" }),
  },
  {
    description: _t("Volume contribution over time."),
    build: (ctx) =>
      lineChart(ctx.title, ctx.sourceByDate, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
  },
  {
    description: _t("Period × category side-by-side comparison."),
    build: (ctx) => barChart(ctx.title, ctx.sourceByCat, { legendPosition: "top" }),
  },
  {
    description: _t("Composition per period over time."),
    build: (ctx) => barChart(ctx.title, ctx.sourceByDate, { stacked: true, legendPosition: "top" }),
  },
];

/** Pattern Q — Label + Multiple Numbers */
export const LABEL_VS_MULTIPLE_NUMBERS_SUGGESTIONS: Suggestion<LabelVsMultipleNumbersContext>[] = [
  {
    description: _t("Side-by-side per entity — works well for long labels."),
    build: (ctx) => barChart(ctx.title, ctx.source, { horizontal: true, legendPosition: "top" }),
  },
  {
    description: _t("Grouped bars per entity for direct metric comparison."),
    build: (ctx) => barChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    description: _t("Shape/profile comparison across metrics for each entity."),
    isApplicable: ({ rowCount }) => rowCount > 2 && rowCount <= MAX_ROWS_FOR_SHAPE_CHART,
    build: (ctx) => radarChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    description: _t("Correlation between the two numeric metrics across entities."),
    isApplicable: ({ rowCount, numColsCount }) => rowCount > 2 && numColsCount === 2,
    build: (ctx) => scatterChart(ctx.title, ctx.scatterSource),
  },
  {
    description: _t("Three metrics in one view: X position, Y position and bubble size."),
    isApplicable: ({ numColsCount }) => numColsCount === 3,
    build: (ctx) => {
      const bubble = ctx.bubble!;
      return bubbleChart(
        ctx.title,
        bubble.xRange,
        bubble.yRanges,
        bubble.sizeRange,
        bubble.labelRange,
        bubble.hasTitle
      );
    },
  },
];

/** Pattern R — Categorical + Two Numbers (Population Pyramid or Grouped) */
export const CATEGORICAL_TWO_NUMBERS_SUGGESTIONS: Suggestion<CategoricalTwoNumbersContext>[] = [
  {
    description: _t("Natural fit for symmetric or opposing values per category."),
    isApplicable: ({ isPyramid }) => isPyramid,
    build: (ctx) => pyramidChart(ctx.title, ctx.sourceBoth),
  },
  {
    description: _t("Side-by-side comparison of both metrics per category."),
    build: (ctx) =>
      barChart(ctx.title, ctx.sourceBoth, { legendPosition: "top", aggregated: true }),
  },
  {
    description: _t("Bar for the first series, line for the second — good for mixed scales."),
    build: (ctx) => comboChart(ctx.title, ctx.sourceBoth, { aggregated: true }),
  },
  {
    description: _t("Shows total and composition per category."),
    isApplicable: ({ isPyramid }) => !isPyramid,
    build: (ctx) =>
      barChart(ctx.title, ctx.sourceBoth, {
        stacked: true,
        legendPosition: "top",
        aggregated: true,
      }),
  },
];

/** Pattern S — Many Numbers (3+ numeric columns, no categorical/date) */
export const MANY_NUMBERS_SUGGESTIONS: Suggestion<ManyNumbersContext>[] = [
  {
    description: _t("Shows the position of the last value within the data's min-max range."),
    isApplicable: ({ colsLength, rowCount }) => colsLength === 3 && rowCount === 1,
    build: (ctx) =>
      gaugeChart(ctx.title, ctx.lastCellXC, `=${ctx.firstCellXC}`, `=${ctx.secondCellXC}`),
  },
  {
    description: _t("Trend comparison across all metrics."),
    isApplicable: ({ rowCount }) => rowCount > 2,
    build: (ctx) => lineChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    description: _t("Overall shape/profile across all metrics."),
    isApplicable: ({ rowCount }) => rowCount > 2 && rowCount <= MAX_ROWS_FOR_SHAPE_CHART,
    build: (ctx) => radarChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    description: _t("Side-by-side comparison of all numeric metrics."),
    build: (ctx) => barChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    description: _t("Side-by-side comparison of all numeric metrics."),
    build: (ctx) => barChart(ctx.title, ctx.source, { legendPosition: "top", stacked: true }),
  },
];
