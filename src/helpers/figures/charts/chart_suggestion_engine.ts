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
import { ChartDefinition, ChartRangeDataSource } from "../../../types/chart/chart";
import { ComboChartDefinition } from "../../../types/chart/combo_chart";
import { GaugeChartDefinition } from "../../../types/chart/gauge_chart";
import { LineChartDefinition } from "../../../types/chart/line_chart";
import { PieChartDefinition } from "../../../types/chart/pie_chart";
import { PyramidChartDefinition } from "../../../types/chart/pyramid_chart";
import { RadarChartDefinition } from "../../../types/chart/radar_chart";
import { ScatterChartDefinition } from "../../../types/chart/scatter_chart";
import { ScorecardChartDefinition } from "../../../types/chart/scorecard_chart";
import { SunburstChartDefinition } from "../../../types/chart/sunburst_chart";
import { TreeMapChartDefinition } from "../../../types/chart/tree_map_chart";
import { Getters } from "../../../types/getters";
import { Zone } from "../../../types/misc";
import { toXC } from "../../coordinates";
import { analyzeColumns, ColumnAnalysis } from "../../data_analysis";
import {
  dataset,
  getUnboundRange,
  isDatasetTitled,
  rangeSource,
} from "./chart_data_source_helpers";

const PYRAMID_HEADER_KEYWORDS = [
  "male",
  "female",
  "man",
  "woman",
  "boy",
  "girl",
  "before",
  "after",
  "previous",
  "current",
  "positive",
  "negative",
  "gain",
  "loss",
  "income",
  "expense",
  "revenue",
  "cost",
];

export interface ChartSuggestion {
  title: string;
  rationale: string;
  definition: ChartDefinition;
}

function isPyramidLike(numCol1: ColumnAnalysis, numCol2: ColumnAnalysis): boolean {
  const h1 = (numCol1.header ?? "").toLowerCase();
  const h2 = (numCol2.header ?? "").toLowerCase();
  return PYRAMID_HEADER_KEYWORDS.some((k) => h1.includes(k) || h2.includes(k));
}

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
  opts: { legendPosition?: "top" | "none" | "bottom" | "left" | "right" } = {}
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
    type: "combo",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: "top",
    humanize: true,
    ...(opts.aggregated ? { aggregated: true } : {}),
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
  opts: Partial<ScorecardChartDefinition<string>> = {}
): ScorecardChartDefinition<string> {
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

function gaugeChart(
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

function interestingCellsXc(col: ColumnAnalysis): {
  firstCellXC: string;
  lastCellXC: string;
  prevCellXC?: string;
} {
  if (!col) {
    return { firstCellXC: "", lastCellXC: "", prevCellXC: undefined };
  }
  const firstCellPosition = col.nonEmpty.at(0)?.position;
  const firstCellXC = firstCellPosition ? toXC(firstCellPosition?.col, firstCellPosition?.row) : "";
  const lastCellPosition = col.nonEmpty.at(-1)?.position;
  const lastCellXC = lastCellPosition ? toXC(lastCellPosition?.col, lastCellPosition?.row) : "";
  const prevCellPosition = col.nonEmpty.at(-2)?.position;
  const prevCellXC = prevCellPosition
    ? toXC(prevCellPosition?.col, prevCellPosition?.row)
    : undefined;
  return { firstCellXC, lastCellXC, prevCellXC };
}

/** Pattern A — Single numeric column */
function chartsForSingleNumberColumn(col: ColumnAnalysis, getters: Getters): ChartSuggestion[] {
  const title = col.header ?? _t("Value");
  const { firstCellXC, lastCellXC, prevCellXC } = interestingCellsXc(col);
  const source = rangeSource([dataset(col.zone, getters)], col.hasHeader);

  const suggestions: ChartSuggestion[] = [];

  if (col.rowCount < 3) {
    suggestions.push({
      title: _t("KPI Card"),
      rationale: _t("Highlights the most recent value compared to the previous one."),
      definition: scorecardChart(title, lastCellXC, {
        baseline: prevCellXC,
        baselineMode: "difference",
      }),
    });
  }
  if (col.rowCount === 3) {
    suggestions.push({
      title: _t("Gauge"),
      rationale: _t("Shows the position of the last value within the data's min-max range."),
      definition: gaugeChart(title, lastCellXC, `=${firstCellXC}`, `=${prevCellXC}`),
    });
  }

  if (col.rowCount > 1) {
    suggestions.push({
      title: _t("Bar Chart"),
      rationale: _t("Compares individual values side-by-side."),
      definition: barChart(title, source),
    });
  }

  if (col.rowCount > 2) {
    suggestions.push(
      {
        title: _t("Trend Line"),
        rationale: _t("Shows the evolution of all values over the range."),
        definition: lineChart(title, source),
      },
      {
        title: _t("Area Chart"),
        rationale: _t("Emphasizes total accumulation over the range."),
        definition: lineChart(title, source, { fillArea: true, cumulative: true }),
      }
    );
  }

  return suggestions;
}

/** Pattern B — Single percentage column */
function chartsForSinglePercentageColumn(col: ColumnAnalysis, getters: Getters): ChartSuggestion[] {
  const hasTitle = col.hasHeader;
  const title = col.header ?? _t("Rate");
  const { firstCellXC, lastCellXC, prevCellXC } = interestingCellsXc(col);

  const source = rangeSource([dataset(col.zone, getters)], hasTitle);
  const isAboveOne = (col.maxValue ?? 0) > 1;

  const suggestions: ChartSuggestion[] = [];

  if (col.rowCount < 3) {
    suggestions.push({
      title: _t("KPI Card"),
      rationale: _t("Shows the last percentage value with its baseline."),
      definition: scorecardChart(title, lastCellXC, {
        baseline: prevCellXC,
        baselineMode: "percentage",
      }),
    });
  }
  if (col.rowCount === 1) {
    suggestions.push({
      title: _t("Gauge"),
      rationale: _t("Natural fit for a 0–100% range."),
      definition: gaugeChart(title, lastCellXC, "0", isAboveOne ? "100" : "1"),
    });
  } else if (col.rowCount === 3) {
    suggestions.push({
      title: _t("Gauge"),
      rationale: _t("Natural fit for a 0–100% range."),
      definition: gaugeChart(title, lastCellXC, `=${firstCellXC}`, `=${prevCellXC}`),
    });
  }
  if (col.rowCount > 1) {
    suggestions.push(
      {
        title: _t("Donut Chart"),
        rationale: _t("Shows completion against total."),
        definition: pieChart(title, source, { isDoughnut: true }),
      },
      {
        title: _t("Bar Chart"),
        rationale: _t("Compares all percentage values side-by-side."),
        definition: barChart(title, source),
      }
    );
  }
  return suggestions;
}

/** Pattern C — Single date column */
//TODO ANHE: re-enable when we have a proper date chart implementation
/*function chartsForSingleDateColumn(col: ColumnAnalysis, getters: Getters): ChartSuggestion[] {
  const hasTitle = col.hasHeader;
  const title = col.header ?? _t("Date");
  const source = rangeSource([dataset(col.zone, getters)], hasTitle);

  return [
    {
      title: _t("Line (cumulative)"),
      rationale: _t("Shows cumulative event count over time."),
      definition: lineChart(title, source, { cumulative: true }),
    },
    {
      title: _t("Bar (count per period)"),
      rationale: _t("Groups events by period for a period-by-period comparison."),
      definition: barChart(title, source),
    },
    {
      title: _t("Calendar Heatmap"),
      rationale: _t("Shows event density across the year."),
      definition: calendarChart(title, source),
    },
  ];
}*/

/** Pattern D — Single categorical column */
function chartsForSingleCategoricalColumn(
  col: ColumnAnalysis,
  getters: Getters
): ChartSuggestion[] {
  const hasTitle = col.hasHeader;
  const title = col.header ?? _t("Category");
  const range = getUnboundRange(getters, col.zone);
  const source = rangeSource([dataset(col.zone, getters)], hasTitle, range);

  const suggestions: ChartSuggestion[] = [
    {
      title: _t("Pie Chart"),
      rationale: _t("Shows the share of each category."),
      definition: pieChart(title, source, { aggregated: true, legendPosition: "top" }),
    },
    {
      title: _t("Donut Chart"),
      rationale: _t("Same as pie, cleaner proportional look."),
      definition: pieChart(title, source, {
        aggregated: true,
        isDoughnut: true,
        legendPosition: "top",
      }),
    },
    {
      title: _t("Bar (count)"),
      rationale: _t("Absolute count per category."),
      definition: barChart(
        title,
        { ...source, labelRange: range },
        { legendPosition: "none", aggregated: true }
      ),
    },
    // {
    //   title: _t("Treemap"),
    //   rationale: _t("Proportional area per category."),
    //   definition: treemapChart(title, source),
    // },
  ];

  return suggestions;
}

/** Pattern E — Single label column */
function chartsForSingleLabelColumn(col: ColumnAnalysis, getters: Getters): ChartSuggestion[] {
  const title = col.header ?? _t("Label");
  const { lastCellXC } = interestingCellsXc(col);
  const suggestions: ChartSuggestion[] = [];
  if (col.rowCount === 1) {
    suggestions.push({
      title: _t("KPI Card"),
      rationale: _t("Displays a key performance indicator."),
      definition: scorecardChart(title, lastCellXC, {
        baselineMode: "text",
        humanize: false,
      }),
    });
  }
  return suggestions;
}

/** Pattern F — Categorical + Number */
function chartsForCategoricalVsNumber(cols: ColumnAnalysis[], getters: Getters): ChartSuggestion[] {
  const [catCol, numCol] = cols;
  const labelRange = getUnboundRange(getters, catCol.zone);
  const hasTitle = numCol.hasHeader;
  const title = numCol.header
    ? _t("%s by %s", numCol.header, catCol.header ?? "Category")
    : _t("By Category");
  const source = rangeSource([dataset(numCol.zone, getters)], hasTitle, labelRange);

  const suggestions: ChartSuggestion[] = [
    {
      title: _t("Bar Chart"),
      rationale: _t("Classic category-vs-value comparison."),
      definition: barChart(title, source, { aggregated: true }),
    },
    {
      title: _t("Horizontal Bar"),
      rationale: _t("Better when category labels are long."),
      definition: barChart(title, source, { horizontal: true, aggregated: true }),
    },
    {
      title: _t("Pie Chart"),
      rationale: _t("Share of total per category."),
      definition: pieChart(title, source, { legendPosition: "top", aggregated: true }),
    },
    {
      title: _t("Treemap"),
      rationale: _t("Proportional area — good for many categories."),
      definition: treemapChart(
        title,
        rangeSource(
          [dataset(catCol.zone, getters)],
          hasTitle,
          getUnboundRange(getters, numCol.zone)
        )
      ),
    },
  ];

  return suggestions;
}

/** Patterns G & J — Date + Number or Date + Percentage */
function chartsForDateVsSeries(cols: ColumnAnalysis[], getters: Getters): ChartSuggestion[] {
  const [dateCol, seriesCol] = cols;
  const isPercentage = seriesCol.type === "percentage";
  const labelRange = getUnboundRange(getters, dateCol.zone);
  const hasTitle = isDatasetTitled(getters, dateCol.zone);
  const title = seriesCol.header
    ? _t("%s over time", seriesCol.header)
    : isPercentage
    ? _t("Rate over Time")
    : _t("Over Time");
  const source = rangeSource([dataset(seriesCol.zone, getters)], hasTitle, labelRange);

  const suggestions: ChartSuggestion[] = [
    {
      title: _t("Line Chart"),
      rationale: _t("Best for visualizing time-series trends."),
      definition: lineChart(title, source),
    },
    {
      title: _t("Area Chart"),
      rationale: _t("Emphasizes total volume over time."),
      definition: lineChart(title, source, { fillArea: true, cumulative: true }),
    },
    {
      title: _t("Bar Chart"),
      rationale: _t("Period-by-period comparison."),
      definition: barChart(title, source),
    },
  ];

  if (!isPercentage) {
    suggestions.push({
      title: _t("Calendar Heatmap"),
      rationale: _t("Shows intensity variation across days of the year."),
      definition: calendarChart(title, source),
    });
  }

  return suggestions;
}

/** Pattern H — Number + Number */
function chartsForNumberVsNumber(cols: ColumnAnalysis[], getters: Getters): ChartSuggestion[] {
  const [col1, col2] = cols;
  const title =
    col1.header && col2.header ? _t("%s vs %s", col2.header, col1.header) : _t("Correlation");
  const hasTitle = col1.hasHeader || col2.hasHeader;
  const source2 = rangeSource(
    [dataset(col2.zone, getters)],
    col2.hasHeader,
    getUnboundRange(getters, col1.zone)
  );
  const sourceBoth = rangeSource(
    [dataset(col1.zone, getters, "0"), dataset(col2.zone, getters, "1")],
    hasTitle
  );

  const suggestions: ChartSuggestion[] = [];

  if (col1.rowCount === 1) {
    const { lastCellXC } = interestingCellsXc(col2);
    const { lastCellXC: prevCellXC } = interestingCellsXc(col1);
    suggestions.push({
      title: _t("KPI Card"),
      rationale: _t("Highlights the second metric compared to the first one."),
      definition: scorecardChart(title, lastCellXC, {
        baseline: prevCellXC,
        baselineMode: "difference",
      }),
    });
  }

  suggestions.push({
    title: _t("Grouped Bar"),
    rationale: _t("Side-by-side comparison of two numeric series."),
    definition: barChart(title, sourceBoth, { legendPosition: "top" }),
  });

  if (col1.rowCount > 2) {
    suggestions.push(
      {
        title: _t("Scatter Plot"),
        rationale: _t("Reveals correlation between two numeric variables."),
        definition: scatterChart(title, source2),
      },
      {
        title: _t("Combo Chart"),
        rationale: _t("Bar for the first series, line for the second — good for mixed scales."),
        definition: comboChart(title, sourceBoth),
      },
      {
        title: _t("Stacked Area"),
        rationale: _t("When both metrics contribute to a total."),
        definition: lineChart(title, sourceBoth, {
          stacked: true,
          fillArea: true,
          legendPosition: "top",
        }),
      }
    );

    if (col1.rowCount <= 10) {
      suggestions.push({
        title: _t("Radar"),
        rationale: _t("Shape-based comparison when rows represent named entities."),
        definition: radarChart(title, sourceBoth, { legendPosition: "top" }),
      });
    }
  }

  return suggestions;
}

/** Pattern I — Categorical + Percentage */
function chartsForCategoricalVsPercentage(
  cols: ColumnAnalysis[],
  getters: Getters
): ChartSuggestion[] {
  const [catCol, pctCol] = cols;
  const labelRange = getUnboundRange(getters, catCol.zone);
  const hasTitle = pctCol.hasHeader;
  const title = pctCol.header
    ? _t("%s by %s", pctCol.header, catCol.header ?? "Category")
    : _t("Rates by Category");
  const source = rangeSource([dataset(pctCol.zone, getters)], hasTitle, labelRange);

  const suggestions: ChartSuggestion[] = [
    {
      title: _t("Bar Chart"),
      rationale: _t("Vertical comparison of rates per category."),
      definition: barChart(title, source),
    },
    {
      title: _t("Horizontal Bar"),
      rationale: _t("Progress-bar style per category."),
      definition: barChart(title, source, { horizontal: true }),
    },
    {
      title: _t("Pie Chart"),
      rationale: _t("Share of total percentage across categories."),
      definition: pieChart(title, source, { legendPosition: "top" }),
    },
  ];

  if (catCol.rowCount > 2 && catCol.rowCount <= 10) {
    suggestions.push({
      title: _t("Radar"),
      rationale: _t("Comparison of completion rates across categories."),
      definition: radarChart(title, source),
    });
  }

  return suggestions;
}

/** Pattern K — Label + Number */
function chartsForLabelVsNumber(cols: ColumnAnalysis[], getters: Getters): ChartSuggestion[] {
  const [labelCol, numCol] = cols;
  const labelRange = getUnboundRange(getters, labelCol.zone);
  const hasTitle = numCol.hasHeader;
  const title = numCol.header
    ? _t("%s by %s", numCol.header, labelCol.header ?? "Name")
    : _t("By Name");
  const source = rangeSource([dataset(numCol.zone, getters)], hasTitle, labelRange);

  const suggestions: ChartSuggestion[] = [];

  if (labelCol.rowCount === 1) {
    const { lastCellXC } = interestingCellsXc(numCol);
    suggestions.push({
      title: _t("KPI Card"),
      rationale: _t("Highlights the most recent value for the named entity."),
      //TODO ANHE: remove falsy humanize when it's fixed in the scorecard chart
      definition: scorecardChart("", lastCellXC, {
        humanize: false,
        baselineMode: "text",
        baseline: labelRange,
      }),
    });
  }

  if (labelCol.rowCount > 1 && labelCol.rowCount <= 10) {
    suggestions.push(
      {
        title: _t("Bar Chart"),
        rationale: _t("Vertical comparison across named items."),
        definition: barChart(title, source),
      },
      {
        title: _t("Horizontal Bar"),
        rationale: _t("Works well for named entities with long labels."),
        definition: barChart(title, source, { horizontal: true }),
      },
      {
        title: _t("Pie Chart"),
        rationale: _t("Share of total per category."),
        definition: pieChart(title, source, { legendPosition: "top", aggregated: true }),
      }
    );

    if (labelCol.rowCount > 2 && labelCol.rowCount <= 10) {
      suggestions.push({
        title: _t("Radar"),
        rationale: _t("Shape-based comparison across labeled items."),
        definition: radarChart(title, source),
      });
    }
  }

  return suggestions;
}

/** Pattern L — Categorical + Categorical */
//TODO ANHE: re-enable when we have a proper categorical-categorical chart implementation
/*function chartsForCategoricalVsCategorical(
  cols: ColumnAnalysis[],
  getters: Getters
): ChartSuggestion[] {
  const [cat1, cat2] = cols;
  const title =
    cat1.header && cat2.header
      ? _t("%s × %s", cat1.header, cat2.header)
      : _t("Two-level hierarchy");
  const hasTitle = cat1.hasHeader || cat2.hasHeader;
  const sourceBoth = rangeSource(
    [dataset(cat1.zone, getters, "0"), dataset(cat2.zone, getters, "1")],
    hasTitle
  );

  return [
    {
      title: _t("Sunburst"),
      rationale: _t("Two-level hierarchy — outer ring = first column, inner = second."),
      definition: sunburstChart(title, sourceBoth),
    },
    {
      title: _t("Treemap"),
      rationale: _t("Proportional nested areas — outer = first column, inner = second."),
      definition: treemapChart(title, sourceBoth),
    },
    {
      title: _t("Grouped Bar (counts)"),
      rationale: _t("Co-occurrence counts between the two categories."),
      definition: barChart(
        title,
        rangeSource(
          [dataset(cat2.zone, getters)],
          cat2.hasHeader,
          getUnboundRange(getters, cat1.zone)
        )
      ),
    },
  ];
}*/

/** Pattern M — Categorical + Multiple Numbers */
function chartsForCategoricalVsMultipleNumbers(
  cols: ColumnAnalysis[],
  getters: Getters
): ChartSuggestion[] {
  const [catCol, ...numCols] = cols;
  const labelRange = getUnboundRange(getters, catCol.zone);
  const hasTitle = numCols.some((c) => c.hasHeader);
  const title = catCol.header ? _t("By %s", catCol.header) : _t("Multi-series");
  const dataSets = numCols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, hasTitle, labelRange);

  const suggestions: ChartSuggestion[] = [
    {
      title: _t("Grouped Bar"),
      rationale: _t("Side-by-side comparison across categories for each series."),
      definition: barChart(title, source, { legendPosition: "top" }),
    },
    {
      title: _t("Stacked Bar"),
      rationale: _t("Shows composition and total per category."),
      definition: barChart(title, source, { stacked: true, legendPosition: "top" }),
    },
    {
      title: _t("Multi-series Line"),
      rationale: _t("Trend per series across categories."),
      definition: lineChart(title, source, { legendPosition: "top" }),
    },
    {
      title: _t("Stacked Area"),
      rationale: _t("Volume and composition across categories."),
      definition: lineChart(title, source, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
    },
  ];

  if (catCol.rowCount > 2 && catCol.rowCount <= 10) {
    suggestions.push({
      title: _t("Radar"),
      rationale: _t("Shape comparison across metrics (best for ≤ 10 rows)."),
      definition: radarChart(title, source, { legendPosition: "top" }),
    });
  }

  return suggestions.slice(0, 6);
}

/** Pattern N — Date + Multiple Numbers */
function chartsForDateVsMultipleNumbers(
  cols: ColumnAnalysis[],
  getters: Getters
): ChartSuggestion[] {
  const [dateCol, ...numCols] = cols;
  const labelRange = getUnboundRange(getters, dateCol.zone);
  const hasTitle = numCols.some((c) => c.hasHeader) || isDatasetTitled(getters, dateCol.zone);
  const title =
    numCols.length === 1 && numCols[0].header
      ? _t("%s over time", numCols[0].header)
      : _t("Multi-series over Time");
  const dataSets = numCols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, hasTitle, labelRange);

  return [
    {
      title: _t("Multi-series Line"),
      rationale: _t("Trend comparison across multiple metrics over time."),
      definition: lineChart(title, source, { legendPosition: "top" }),
    },
    {
      title: _t("Stacked Area"),
      rationale: _t("Volume composition over time."),
      definition: lineChart(title, source, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
    },
    {
      title: _t("Combo Chart"),
      rationale: _t("Bar for the primary metric, line for the others."),
      definition: comboChart(title, source),
    },
    {
      title: _t("Grouped Bar"),
      rationale: _t("Period-by-period grouped comparison."),
      definition: barChart(title, source, { legendPosition: "top" }),
    },
  ];
}

/** Pattern O — Categorical + Categorical + Number */
function chartsForMultipleCategoricalsVsNumber(
  cols: ColumnAnalysis[],
  getters: Getters
): ChartSuggestion[] {
  const [cat1, cat2, numCol] = cols;
  const title = numCol.header
    ? _t("%s by %s and %s", numCol.header, cat1.header ?? "Level 1", cat2.header ?? "Level 2")
    : _t("Two-level hierarchy");
  const hasTitle = numCol.hasHeader;
  const hierarchySource = rangeSource(
    [dataset(cat1.zone, getters, "0"), dataset(cat2.zone, getters, "1")],
    hasTitle,
    getUnboundRange(getters, numCol.zone)
  );
  const barSource = rangeSource(
    [dataset(numCol.zone, getters)],
    hasTitle,
    getUnboundRange(getters, cat1.zone)
  );

  return [
    {
      title: _t("Sunburst"),
      rationale: _t("Two-level hierarchy weighted by value."),
      definition: sunburstChart(title, hierarchySource),
    },
    {
      title: _t("Treemap"),
      rationale: _t("Proportional nested area weighted by value."),
      definition: treemapChart(title, hierarchySource),
    },
    {
      title: _t("Grouped Bar"),
      rationale: _t("One series per inner category, grouped by outer category."),
      definition: barChart(title, barSource, { legendPosition: "top" }),
    },
    {
      title: _t("Stacked Bar"),
      rationale: _t("Contribution of inner categories per outer category."),
      definition: barChart(title, barSource, { stacked: true, legendPosition: "top" }),
    },
  ];
}

/** Pattern P — Categorical + Date + Number */
function chartsForCategoricalDateNumber(
  cols: ColumnAnalysis[],
  getters: Getters
): ChartSuggestion[] {
  const [catCol, dateCol, numCol] = cols;
  const dateRange = getUnboundRange(getters, dateCol.zone);
  const catRange = getUnboundRange(getters, catCol.zone);
  const hasTitle = numCol.hasHeader;
  const title = numCol.header
    ? _t("%s by %s over %s", numCol.header, catCol.header ?? "Category", dateCol.header ?? "Time")
    : _t("Multi-series over Time");

  const sourceByDate = rangeSource([dataset(numCol.zone, getters)], hasTitle, dateRange);
  const sourceByCat = rangeSource([dataset(numCol.zone, getters)], hasTitle, catRange);

  return [
    {
      title: _t("Line (over time)"),
      rationale: _t("Trend of values over time."),
      definition: lineChart(title, sourceByDate, { legendPosition: "top" }),
    },
    {
      title: _t("Stacked Area"),
      rationale: _t("Volume contribution over time."),
      definition: lineChart(title, sourceByDate, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
    },
    {
      title: _t("Grouped Bar"),
      rationale: _t("Period × category side-by-side comparison."),
      definition: barChart(title, sourceByCat, { legendPosition: "top" }),
    },
    {
      title: _t("Stacked Bar"),
      rationale: _t("Composition per period over time."),
      definition: barChart(title, sourceByDate, { stacked: true, legendPosition: "top" }),
    },
  ];
}

/** Pattern Q — Label + Multiple Numbers */
function chartsForLabelVsMultipleNumbers(
  cols: ColumnAnalysis[],
  getters: Getters
): ChartSuggestion[] {
  const [labelCol, ...numCols] = cols;
  const labelRange = getUnboundRange(getters, labelCol.zone);
  const hasTitle = numCols.some((c) => c.hasHeader);
  const title = labelCol.header ? _t("By %s", labelCol.header) : _t("Profile Comparison");
  const dataSets = numCols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, hasTitle, labelRange);

  const suggestions: ChartSuggestion[] = [
    {
      title: _t("Horizontal Bar"),
      rationale: _t("Side-by-side per entity — works well for long labels."),
      definition: barChart(title, source, { horizontal: true, legendPosition: "top" }),
    },
    {
      title: _t("Grouped Bar"),
      rationale: _t("Grouped bars per entity for direct metric comparison."),
      definition: barChart(title, source, { legendPosition: "top" }),
    },
  ];

  if (labelCol.rowCount > 2 && labelCol.rowCount <= 10) {
    suggestions.push({
      title: _t("Radar"),
      rationale: _t("Shape/profile comparison across metrics for each entity."),
      definition: radarChart(title, source, { legendPosition: "top" }),
    });

    if (numCols.length === 2) {
      suggestions.push({
        title: _t("Scatter Plot"),
        rationale: _t("Correlation between the two numeric metrics across entities."),
        definition: scatterChart(
          title,
          rangeSource(
            [dataset(numCols[1].zone, getters)],
            numCols[1].hasHeader,
            getUnboundRange(getters, numCols[0].zone)
          )
        ),
      });
    }
  }

  if (numCols.length === 3) {
    suggestions.push({
      title: _t("Bubble Chart"),
      rationale: _t("Three metrics in one view: X position, Y position and bubble size."),
      definition: bubbleChart(
        title,
        getUnboundRange(getters, numCols[0].zone),
        [getUnboundRange(getters, numCols[1].zone)],
        getUnboundRange(getters, numCols[2].zone),
        labelRange,
        hasTitle
      ),
    });
  }

  return suggestions;
}

/** Pattern R — Categorical + Two Numbers (Population Pyramid or Grouped) */
function chartsForCategoricalTwoNumbers(
  cols: ColumnAnalysis[],
  getters: Getters
): ChartSuggestion[] {
  const [catCol, numCol1, numCol2] = cols;
  const catRange = getUnboundRange(getters, catCol.zone);
  const hasTitle = numCol1.hasHeader || numCol2.hasHeader;
  const title =
    numCol1.header && numCol2.header
      ? _t("%s vs %s by %s", numCol1.header, numCol2.header, catCol.header ?? "Category")
      : catCol.header
      ? _t("By %s", catCol.header)
      : _t("Category Comparison");
  const isPyramid = isPyramidLike(numCol1, numCol2);

  const sourceBoth = rangeSource(
    [dataset(numCol1.zone, getters, "0"), dataset(numCol2.zone, getters, "1")],
    hasTitle,
    catRange
  );

  const suggestions: ChartSuggestion[] = [];

  if (isPyramid) {
    suggestions.push({
      title: _t("Population Pyramid"),
      rationale: _t("Natural fit for symmetric or opposing values per category."),
      definition: pyramidChart(title, sourceBoth),
    });
  }

  suggestions.push(
    {
      title: _t("Grouped Bar"),
      rationale: _t("Side-by-side comparison of both metrics per category."),
      definition: barChart(title, sourceBoth, { legendPosition: "top", aggregated: true }),
    },
    {
      title: _t("Combo Chart"),
      rationale: _t("Bar for the first series, line for the second — good for mixed scales."),
      definition: comboChart(title, sourceBoth, { aggregated: true }),
    }
  );

  if (!isPyramid) {
    suggestions.push({
      title: _t("Stacked Bar"),
      rationale: _t("Shows total and composition per category."),
      definition: barChart(title, sourceBoth, {
        stacked: true,
        legendPosition: "top",
        aggregated: true,
      }),
    });
  }

  return suggestions;
}

/** Pattern S — Many Numbers (3+ numeric columns, no categorical/date) */
function patternS(cols: ColumnAnalysis[], getters: Getters): ChartSuggestion[] {
  const title = cols.every((c) => c.hasHeader)
    ? cols.map((c) => c.header!).join(" / ")
    : _t("KPI Overview");
  const hasTitle = cols.some((c) => c.hasHeader);
  const dataSets = cols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, hasTitle);

  const suggestions: ChartSuggestion[] = [];
  if (cols.length === 3 && cols[0].rowCount === 1) {
    const { lastCellXC } = interestingCellsXc(cols[2]);
    const { lastCellXC: firstCellXC } = interestingCellsXc(cols[0]);
    const { lastCellXC: secondCellXC } = interestingCellsXc(cols[1]);
    suggestions.push({
      title: _t("Gauge"),
      rationale: _t("Shows the position of the last value within the data's min-max range."),
      definition: gaugeChart(title, lastCellXC, `=${firstCellXC}`, `=${secondCellXC}`),
    });
  }
  if (cols[0].rowCount > 2 && cols[0].rowCount <= 10) {
    suggestions.push(
      {
        title: _t("Multi-series Line"),
        rationale: _t("Trend comparison across all metrics."),
        definition: lineChart(title, source, { legendPosition: "top" }),
      },
      {
        title: _t("Radar"),
        rationale: _t("Overall shape/profile across all metrics."),
        definition: radarChart(title, source, { legendPosition: "top" }),
      }
    );
  }

  suggestions.push(
    {
      title: _t("Grouped Bar"),
      rationale: _t("Side-by-side comparison of all numeric metrics."),
      definition: barChart(title, source, { legendPosition: "top" }),
    },
    {
      title: _t("Stacked Bar"),
      rationale: _t("Side-by-side comparison of all numeric metrics."),
      definition: barChart(title, source, { legendPosition: "top", stacked: true }),
    }
  );
  return suggestions;
}

export function getChartSuggestions(zones: Zone[], getters: Getters): ChartSuggestion[] {
  const cols = analyzeColumns(zones, getters);
  if (cols.some((c) => c.type === "error")) {
    return [];
  }
  const nonEmpty = cols.filter((c) => c.type !== "empty");
  if (!nonEmpty.length) {
    return [];
  }

  const shape = nonEmpty.map((c) => c.type);
  const numberOfColumns = shape.length;

  // Pattern S — 3+ all numeric/percentage
  if (numberOfColumns >= 3 && shape.every((t) => t === "number" || t === "percentage")) {
    return patternS(nonEmpty, getters);
  }

  if (numberOfColumns === 1) {
    switch (shape[0]) {
      case "number":
        return chartsForSingleNumberColumn(nonEmpty[0], getters);
      case "percentage":
        return chartsForSinglePercentageColumn(nonEmpty[0], getters);
      case "date":
        return [];
      case "categorical":
        return chartsForSingleCategoricalColumn(nonEmpty[0], getters);
      case "label":
        return chartsForSingleLabelColumn(nonEmpty[0], getters);
      default:
        return [];
    }
  }

  if (numberOfColumns === 2) {
    const [a, b] = shape;
    if (a === "categorical" && b === "number") {
      return chartsForCategoricalVsNumber(nonEmpty, getters);
    }
    if (a === "date" && (b === "number" || b === "percentage")) {
      return chartsForDateVsSeries(nonEmpty, getters);
    }
    if (a === "number" && b === "number") {
      return chartsForNumberVsNumber(nonEmpty, getters);
    }
    if (a === "categorical" && b === "percentage") {
      return chartsForCategoricalVsPercentage(nonEmpty, getters);
    }
    if (a === "label" && b === "number") {
      return chartsForLabelVsNumber(nonEmpty, getters);
    }
    if (a === "categorical" && b === "categorical") {
      return [];
    }
    if (a === "label" && b === "percentage") {
      return chartsForCategoricalVsPercentage(nonEmpty, getters);
    }
    if (a === "label" && b === "label") {
      return [];
    }
  }

  if (numberOfColumns === 3) {
    const [a, b, c] = shape;
    if (a === "categorical" && b === "categorical" && c === "number") {
      return chartsForMultipleCategoricalsVsNumber(nonEmpty, getters);
    }
    if (a === "categorical" && b === "label" && c === "number") {
      return chartsForMultipleCategoricalsVsNumber(nonEmpty, getters);
    }
    if (a === "categorical" && b === "date" && (c === "number" || c === "percentage")) {
      return chartsForCategoricalDateNumber(nonEmpty, getters);
    }
    if (
      a === "categorical" &&
      (b === "number" || b === "percentage") &&
      (c === "number" || c === "percentage")
    ) {
      return chartsForCategoricalTwoNumbers(nonEmpty, getters);
    }
  }

  if (numberOfColumns >= 3) {
    const [first, ...rest] = shape;
    if (first === "label" && rest.every((t) => t === "number" || t === "percentage")) {
      return chartsForLabelVsMultipleNumbers(nonEmpty, getters);
    }
    if (first === "categorical" && rest.every((t) => t === "number" || t === "percentage")) {
      return chartsForCategoricalVsMultipleNumbers(nonEmpty, getters);
    }
    if (first === "date" && rest.every((t) => t === "number" || t === "percentage")) {
      return chartsForDateVsMultipleNumbers(nonEmpty, getters);
    }
  }

  return [];
}
