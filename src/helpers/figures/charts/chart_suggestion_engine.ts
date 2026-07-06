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
import { Getters } from "../../../types/getters";
import { Zone } from "../../../types/misc";
import { toXC } from "../../coordinates";
import { analyzeColumns, ColumnAnalysis, ExtendedColumnType } from "../../data_analysis";
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

// -----------------------------------------------------------------------------
// Rule framework
//
// A column "shape" (the tuple of each selected column's ExtendedColumnType) is matched
// against a table of rules to decide which chart suggestions to propose. Rules are tried
// in two phases: EXACT_RULES first (fixed-length literal shapes, pairwise disjoint by
// construction), then OPEN_ENDED_RULES (a literal prefix followed by one type repeated for
// the rest of the columns). The two-phase split matters: for e.g. a 3-column
// categorical-first shape, an exact rule and an open-ended rule can both structurally
// match, and the exact rule must win — trying exact rules first guarantees this without
// needing any priority/ordering bookkeeping between rules.
// -----------------------------------------------------------------------------

/** A single column type, or an alternation of types (matches any of them). */
type ColumnTypeSpec = ExtendedColumnType | readonly ExtendedColumnType[];

interface ShapePattern {
  /** Matchers for a fixed-length prefix of columns, in order. */
  readonly prefix: readonly ColumnTypeSpec[];
  /**
   * Present only for open-ended rules: every column after the prefix must match `type`,
   * and the shape's total length must be >= minTotalColumns. `minTotalColumns` is required
   * (no derived default) because it isn't implied by the prefix length — e.g. the "3+
   * numbers" rule has prefix length 0 but requires >= 3 columns, while the "label/
   * categorical/date + multiple numbers" rules have prefix length 1 but also require >= 3
   * (i.e. >= 2 rest columns, not >= 1). Leaving it implicit would risk e.g. a 2-column
   * all-percentage shape (which has no exact rule and correctly yields no suggestions
   * today) silently matching the "3+ numbers" open-ended rule instead.
   */
  readonly rest?: { readonly type: ColumnTypeSpec; readonly minTotalColumns: number };
}

function matchesColumnType(spec: ColumnTypeSpec, type: ExtendedColumnType): boolean {
  return Array.isArray(spec) ? spec.includes(type) : spec === type;
}

function matchesShape(pattern: ShapePattern, shape: ExtendedColumnType[]): boolean {
  const { prefix, rest } = pattern;
  if (rest) {
    if (shape.length < prefix.length || shape.length < rest.minTotalColumns) {
      return false;
    }
  } else if (shape.length !== prefix.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (!matchesColumnType(prefix[i], shape[i])) {
      return false;
    }
  }
  if (rest) {
    for (let i = prefix.length; i < shape.length; i++) {
      if (!matchesColumnType(rest.type, shape[i])) {
        return false;
      }
    }
  }
  return true;
}

/**
 * A single chart proposition for a pattern, declared independently of the others.
 *
 * `title`/`rationale` are thunks rather than plain strings so each spec table can stay a
 * static, module-level constant: `_t(...)` returns an unresolved, not-yet-translated wrapper
 * until a `Model` has been constructed (see `setDefaultTranslationMethod`), so calling it
 * eagerly while building a top-level constant would freeze that wrapper before translations
 * are ready. Deferring the call to `title()`/`rationale()` — invoked only once a suggestion
 * is actually produced, always after a `Model` exists — avoids that while keeping the specs
 * themselves static data.
 */
interface SuggestionSpec<Ctx> {
  title: () => string;
  description: () => string;
  /** Defaults to always-applicable. */
  isApplicable?: (ctx: Ctx) => boolean;
  build: (ctx: Ctx) => ChartDefinition;
}

interface ChartSuggestionRule<Ctx> {
  /** Stable identifier for debugging/traceability (mirrors the historical "Pattern A" comments). */
  shape: ShapePattern;
  buildContext: (cols: ColumnAnalysis[], getters: Getters) => Ctx;
  specs: SuggestionSpec<Ctx>[];
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
interface SingleNumberContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
  firstCellXC: string;
  lastCellXC: string;
  prevCellXC?: string;
}

function buildSingleNumberContext([col]: ColumnAnalysis[], getters: Getters): SingleNumberContext {
  const title = col.header ?? _t("Value");
  const { firstCellXC, lastCellXC, prevCellXC } = interestingCellsXc(col);
  const source = rangeSource([dataset(col.zone, getters)], col.hasHeader);
  return { title, source, rowCount: col.rowCount, firstCellXC, lastCellXC, prevCellXC };
}

const SINGLE_NUMBER_COLUMN_SUGGESTIONS: SuggestionSpec<SingleNumberContext>[] = [
  {
    title: () => _t("KPI Card"),
    description: () => _t("Highlights the most recent value compared to the previous one."),
    isApplicable: ({ rowCount }) => rowCount < 3,
    build: (ctx) =>
      scorecardChart(ctx.title, ctx.lastCellXC, {
        baseline: ctx.prevCellXC,
        baselineMode: "difference",
      }),
  },
  {
    title: () => _t("Gauge"),
    description: () => _t("Shows the position of the last value within the data's min-max range."),
    isApplicable: ({ rowCount }) => rowCount === 3,
    build: (ctx) =>
      gaugeChart(ctx.title, ctx.lastCellXC, `=${ctx.firstCellXC}`, `=${ctx.prevCellXC}`),
  },
  {
    title: () => _t("Bar Chart"),
    description: () => _t("Compares individual values side-by-side."),
    isApplicable: ({ rowCount }) => rowCount > 1,
    build: (ctx) => barChart(ctx.title, ctx.source),
  },
  {
    title: () => _t("Trend Line"),
    description: () => _t("Shows the evolution of all values over the range."),
    isApplicable: ({ rowCount }) => rowCount > 2,
    build: (ctx) => lineChart(ctx.title, ctx.source),
  },
  {
    title: () => _t("Area Chart"),
    description: () => _t("Emphasizes total accumulation over the range."),
    isApplicable: ({ rowCount }) => rowCount > 2,
    build: (ctx) => lineChart(ctx.title, ctx.source, { fillArea: true, cumulative: true }),
  },
];

/** Pattern B — Single percentage column */
interface SinglePercentageContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
  firstCellXC: string;
  lastCellXC: string;
  prevCellXC?: string;
  isAboveOne: boolean;
}

function buildSinglePercentageContext(
  [col]: ColumnAnalysis[],
  getters: Getters
): SinglePercentageContext {
  const hasTitle = col.hasHeader;
  const title = col.header ?? _t("Rate");
  const { firstCellXC, lastCellXC, prevCellXC } = interestingCellsXc(col);
  const source = rangeSource([dataset(col.zone, getters)], hasTitle);
  const isAboveOne = (col.maxValue ?? 0) > 1;
  return { title, source, rowCount: col.rowCount, firstCellXC, lastCellXC, prevCellXC, isAboveOne };
}

const SINGLE_PERCENTAGE_COLUMN_SUGGESTIONS: SuggestionSpec<SinglePercentageContext>[] = [
  {
    title: () => _t("KPI Card"),
    description: () => _t("Shows the last percentage value with its baseline."),
    isApplicable: ({ rowCount }) => rowCount < 3,
    build: (ctx) =>
      scorecardChart(ctx.title, ctx.lastCellXC, {
        baseline: ctx.prevCellXC,
        baselineMode: "percentage",
      }),
  },
  {
    title: () => _t("Gauge"),
    description: () => _t("Natural fit for a 0–100% range."),
    isApplicable: ({ rowCount }) => rowCount === 1,
    build: (ctx) => gaugeChart(ctx.title, ctx.lastCellXC, "0", ctx.isAboveOne ? "100" : "1"),
  },
  {
    title: () => _t("Gauge"),
    description: () => _t("Natural fit for a 0–100% range."),
    isApplicable: ({ rowCount }) => rowCount === 3,
    build: (ctx) =>
      gaugeChart(ctx.title, ctx.lastCellXC, `=${ctx.firstCellXC}`, `=${ctx.prevCellXC}`),
  },
  {
    title: () => _t("Donut Chart"),
    description: () => _t("Shows completion against total."),
    isApplicable: ({ rowCount }) => rowCount > 1,
    build: (ctx) => pieChart(ctx.title, ctx.source, { isDoughnut: true }),
  },
  {
    title: () => _t("Bar Chart"),
    description: () => _t("Compares all percentage values side-by-side."),
    isApplicable: ({ rowCount }) => rowCount > 1,
    build: (ctx) => barChart(ctx.title, ctx.source),
  },
];

/** Pattern C — Single date column */
interface SingleDateContext {
  title: string;
  lastCellXC: string;
  rowCount: number;
}

function buildSingleDateContext([col]: ColumnAnalysis[]): SingleDateContext {
  const { lastCellXC } = interestingCellsXc(col);
  return { title: col.header ?? _t("Date"), lastCellXC, rowCount: col.rowCount };
}

// TODO(ANHE): add line/bar/calendar suggestions once date-bucketing is supported.
const SINGLE_DATE_COLUMN_SUGGESTIONS: SuggestionSpec<SingleDateContext>[] = [
  {
    title: () => _t("KPI Card"),
    description: () => _t("Shows the last date value."),
    isApplicable: ({ rowCount }) => rowCount === 1,
    build: (ctx) => scorecardChart(ctx.title, ctx.lastCellXC),
  },
];

/** Pattern D — Single categorical column */
interface SingleCategoricalContext {
  title: string;
  source: ChartRangeDataSource<string>;
  range: string;
}

function buildSingleCategoricalContext(
  [col]: ColumnAnalysis[],
  getters: Getters
): SingleCategoricalContext {
  const hasTitle = col.hasHeader;
  const title = col.header ?? _t("Category");
  const range = getUnboundRange(getters, col.zone);
  const source = rangeSource([dataset(col.zone, getters)], hasTitle, range);
  return { title, source, range };
}

const SINGLE_CATEGORICAL_COLUMN_SUGGESTIONS: SuggestionSpec<SingleCategoricalContext>[] = [
  {
    title: () => _t("Pie Chart"),
    description: () => _t("Shows the share of each category."),
    build: (ctx) => pieChart(ctx.title, ctx.source, { aggregated: true, legendPosition: "top" }),
  },
  {
    title: () => _t("Donut Chart"),
    description: () => _t("Same as pie, cleaner proportional look."),
    build: (ctx) =>
      pieChart(ctx.title, ctx.source, {
        aggregated: true,
        isDoughnut: true,
        legendPosition: "top",
      }),
  },
  {
    title: () => _t("Bar (count)"),
    description: () => _t("Absolute count per category."),
    build: (ctx) =>
      barChart(
        ctx.title,
        { ...ctx.source, labelRange: ctx.range },
        { legendPosition: "none", aggregated: true }
      ),
  },
];

/** Pattern E — Single label column */
interface SingleLabelContext {
  title: string;
  lastCellXC: string;
  rowCount: number;
}

function buildSingleLabelContext([col]: ColumnAnalysis[]): SingleLabelContext {
  const title = col.header ?? _t("Label");
  const { lastCellXC } = interestingCellsXc(col);
  return { title, lastCellXC, rowCount: col.rowCount };
}

const SINGLE_LABEL_COLUMN_SUGGESTIONS: SuggestionSpec<SingleLabelContext>[] = [
  {
    title: () => _t("KPI Card"),
    description: () => _t("Displays a key performance indicator."),
    isApplicable: ({ rowCount }) => rowCount === 1,
    build: (ctx) =>
      scorecardChart(ctx.title, ctx.lastCellXC, { baselineMode: "text", humanize: false }),
  },
];

/** Pattern F — Categorical + Number */
interface CategoricalVsNumberContext {
  title: string;
  source: ChartRangeDataSource<string>;
  treemapSource: ChartRangeDataSource<string>;
}

function buildCategoricalVsNumberContext(
  [catCol, numCol]: ColumnAnalysis[],
  getters: Getters
): CategoricalVsNumberContext {
  const labelRange = getUnboundRange(getters, catCol.zone);
  const hasTitle = numCol.hasHeader;
  const title = numCol.header
    ? _t("%s by %s", numCol.header, catCol.header ?? _t("Category"))
    : _t("By Category");
  const source = rangeSource([dataset(numCol.zone, getters)], hasTitle, labelRange);
  const treemapSource = rangeSource(
    [dataset(catCol.zone, getters)],
    hasTitle,
    getUnboundRange(getters, numCol.zone)
  );
  return { title, source, treemapSource };
}

const CATEGORICAL_VS_NUMBER_SUGGESTIONS: SuggestionSpec<CategoricalVsNumberContext>[] = [
  {
    title: () => _t("Bar Chart"),
    description: () => _t("Classic category-vs-value comparison."),
    build: (ctx) => barChart(ctx.title, ctx.source, { aggregated: true }),
  },
  {
    title: () => _t("Horizontal Bar"),
    description: () => _t("Better when category labels are long."),
    build: (ctx) => barChart(ctx.title, ctx.source, { horizontal: true, aggregated: true }),
  },
  {
    title: () => _t("Pie Chart"),
    description: () => _t("Share of total per category."),
    build: (ctx) => pieChart(ctx.title, ctx.source, { legendPosition: "top", aggregated: true }),
  },
  {
    title: () => _t("Treemap"),
    description: () => _t("Proportional area — good for many categories."),
    build: (ctx) => treemapChart(ctx.title, ctx.treemapSource),
  },
];

/** Patterns G & J — Date + Number or Date + Percentage */
interface DateVsSeriesContext {
  title: string;
  source: ChartRangeDataSource<string>;
  isPercentage: boolean;
}

function buildDateVsSeriesContext(
  [dateCol, seriesCol]: ColumnAnalysis[],
  getters: Getters
): DateVsSeriesContext {
  const isPercentage = seriesCol.type === "percentage";
  const labelRange = getUnboundRange(getters, dateCol.zone);
  const hasTitle = isDatasetTitled(getters, dateCol.zone);
  const title = seriesCol.header
    ? _t("%s over time", seriesCol.header)
    : isPercentage
    ? _t("Rate over Time")
    : _t("Over Time");
  const source = rangeSource([dataset(seriesCol.zone, getters)], hasTitle, labelRange);
  return { title, source, isPercentage };
}

const DATE_VS_SERIES_SUGGESTIONS: SuggestionSpec<DateVsSeriesContext>[] = [
  {
    title: () => _t("Line Chart"),
    description: () => _t("Best for visualizing time-series trends."),
    build: (ctx) => lineChart(ctx.title, ctx.source),
  },
  {
    title: () => _t("Area Chart"),
    description: () => _t("Emphasizes total volume over time."),
    build: (ctx) => lineChart(ctx.title, ctx.source, { fillArea: true, cumulative: true }),
  },
  {
    title: () => _t("Bar Chart"),
    description: () => _t("Period-by-period comparison."),
    build: (ctx) => barChart(ctx.title, ctx.source),
  },
  {
    title: () => _t("Calendar Heatmap"),
    description: () => _t("Shows intensity variation across days of the year."),
    isApplicable: ({ isPercentage }) => !isPercentage,
    build: (ctx) => calendarChart(ctx.title, ctx.source),
  },
];

/** Pattern H — Number + Number */
interface NumberVsNumberContext {
  title: string;
  source2: ChartRangeDataSource<string>;
  sourceBoth: ChartRangeDataSource<string>;
  rowCount1: number;
  rowCount2: number;
  lastCellXC: string;
  prevCellXC?: string;
}

function buildNumberVsNumberContext(
  [col1, col2]: ColumnAnalysis[],
  getters: Getters
): NumberVsNumberContext {
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
  const { lastCellXC } = interestingCellsXc(col2);
  const { lastCellXC: prevCellXC } = interestingCellsXc(col1);
  return {
    title,
    source2,
    sourceBoth,
    rowCount1: col1.rowCount,
    rowCount2: col2.rowCount,
    lastCellXC,
    prevCellXC,
  };
}

const NUMBER_VS_NUMBER_SUGGESTIONS: SuggestionSpec<NumberVsNumberContext>[] = [
  {
    title: () => _t("KPI Card"),
    description: () => _t("Highlights the second metric compared to the first one."),
    isApplicable: ({ rowCount1, rowCount2 }) => rowCount1 === 1 && rowCount2 === 1,
    build: (ctx) =>
      scorecardChart(ctx.title, ctx.lastCellXC, {
        baseline: ctx.prevCellXC,
        baselineMode: "difference",
      }),
  },
  {
    title: () => _t("Grouped Bar"),
    description: () => _t("Side-by-side comparison of two numeric series."),
    build: (ctx) => barChart(ctx.title, ctx.sourceBoth, { legendPosition: "top" }),
  },
  {
    title: () => _t("Scatter Plot"),
    description: () => _t("Reveals correlation between two numeric variables."),
    isApplicable: ({ rowCount1 }) => rowCount1 > 2,
    build: (ctx) => scatterChart(ctx.title, ctx.source2),
  },
  {
    title: () => _t("Combo Chart"),
    description: () => _t("Bar for the first series, line for the second — good for mixed scales."),
    isApplicable: ({ rowCount1 }) => rowCount1 > 2,
    build: (ctx) => comboChart(ctx.title, ctx.sourceBoth),
  },
  {
    title: () => _t("Stacked Area"),
    description: () => _t("When both metrics contribute to a total."),
    isApplicable: ({ rowCount1 }) => rowCount1 > 2,
    build: (ctx) =>
      lineChart(ctx.title, ctx.sourceBoth, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
  },
  {
    title: () => _t("Radar"),
    description: () => _t("Shape-based comparison when rows represent named entities."),
    isApplicable: ({ rowCount1 }) => rowCount1 > 2 && rowCount1 <= 10,
    build: (ctx) => radarChart(ctx.title, ctx.sourceBoth, { legendPosition: "top" }),
  },
];

/** Pattern I — Categorical + Percentage */
interface CategoricalVsPercentageContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
}

function buildCategoricalVsPercentageContext(
  [catCol, pctCol]: ColumnAnalysis[],
  getters: Getters
): CategoricalVsPercentageContext {
  const labelRange = getUnboundRange(getters, catCol.zone);
  const hasTitle = pctCol.hasHeader;
  const title = pctCol.header
    ? _t("%s by %s", pctCol.header, catCol.header ?? _t("Category"))
    : _t("Rates by Category");
  const source = rangeSource([dataset(pctCol.zone, getters)], hasTitle, labelRange);
  return { title, source, rowCount: catCol.rowCount };
}

const CATEGORICAL_VS_PERCENTAGE_SUGGESTIONS: SuggestionSpec<CategoricalVsPercentageContext>[] = [
  {
    title: () => _t("Bar Chart"),
    description: () => _t("Vertical comparison of rates per category."),
    build: (ctx) => barChart(ctx.title, ctx.source),
  },
  {
    title: () => _t("Horizontal Bar"),
    description: () => _t("Progress-bar style per category."),
    build: (ctx) => barChart(ctx.title, ctx.source, { horizontal: true }),
  },
  {
    title: () => _t("Pie Chart"),
    description: () => _t("Share of total percentage across categories."),
    build: (ctx) => pieChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    title: () => _t("Radar"),
    description: () => _t("Comparison of completion rates across categories."),
    isApplicable: ({ rowCount }) => rowCount > 2 && rowCount <= 10,
    build: (ctx) => radarChart(ctx.title, ctx.source),
  },
];

/** Pattern K — Label + Number */
interface LabelVsNumberContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
  lastCellXC: string;
  prevCellXC?: string;
}

function buildLabelVsNumberContext(
  [labelCol, numCol]: ColumnAnalysis[],
  getters: Getters
): LabelVsNumberContext {
  const labelRange = getUnboundRange(getters, labelCol.zone);
  const hasTitle = numCol.hasHeader;
  const title = numCol.header
    ? _t("%s by %s", numCol.header, labelCol.header ?? _t("Name"))
    : _t("By Name");
  const source = rangeSource([dataset(numCol.zone, getters)], hasTitle, labelRange);
  const { lastCellXC } = interestingCellsXc(numCol);
  const { lastCellXC: prevCellXC } = interestingCellsXc(labelCol);
  return { title, source, rowCount: labelCol.rowCount, lastCellXC, prevCellXC };
}

const LABEL_VS_NUMBER_SUGGESTIONS: SuggestionSpec<LabelVsNumberContext>[] = [
  {
    title: () => _t("KPI Card"),
    description: () => _t("Highlights the most recent value for the named entity."),
    isApplicable: ({ rowCount }) => rowCount === 1,
    // TODO(ANHE): remove falsy humanize when it's fixed in the scorecard chart.
    build: (ctx) =>
      scorecardChart("", ctx.lastCellXC, {
        humanize: false,
        baselineMode: "text",
        baseline: ctx.prevCellXC,
      }),
  },
  {
    title: () => _t("Bar Chart"),
    description: () => _t("Vertical comparison across named items."),
    isApplicable: ({ rowCount }) => rowCount > 1,
    build: (ctx) => barChart(ctx.title, ctx.source),
  },
  {
    title: () => _t("Horizontal Bar"),
    description: () => _t("Works well for named entities with long labels."),
    isApplicable: ({ rowCount }) => rowCount > 1,
    build: (ctx) => barChart(ctx.title, ctx.source, { horizontal: true }),
  },
  {
    title: () => _t("Pie Chart"),
    description: () => _t("Share of total per category."),
    isApplicable: ({ rowCount }) => rowCount > 1 && rowCount <= 10,
    build: (ctx) => pieChart(ctx.title, ctx.source, { legendPosition: "top", aggregated: true }),
  },
  {
    title: () => _t("Radar"),
    description: () => _t("Shape-based comparison across labeled items."),
    isApplicable: ({ rowCount }) => rowCount > 2 && rowCount <= 10,
    build: (ctx) => radarChart(ctx.title, ctx.source),
  },
];

/** Pattern M — Categorical + Multiple Numbers */
interface CategoricalVsMultipleNumbersContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
}

function buildCategoricalVsMultipleNumbersContext(
  [catCol, ...numCols]: ColumnAnalysis[],
  getters: Getters
): CategoricalVsMultipleNumbersContext {
  const labelRange = getUnboundRange(getters, catCol.zone);
  const hasTitle = numCols.some((c) => c.hasHeader);
  const title = catCol.header ? _t("By %s", catCol.header) : _t("Multi-series");
  const dataSets = numCols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, hasTitle, labelRange);
  return { title, source, rowCount: catCol.rowCount };
}

const CATEGORICAL_VS_MULTIPLE_NUMBERS_SUGGESTIONS: SuggestionSpec<CategoricalVsMultipleNumbersContext>[] =
  [
    {
      title: () => _t("Grouped Bar"),
      description: () => _t("Side-by-side comparison across categories for each series."),
      build: (ctx) => barChart(ctx.title, ctx.source, { legendPosition: "top" }),
    },
    {
      title: () => _t("Stacked Bar"),
      description: () => _t("Shows composition and total per category."),
      build: (ctx) => barChart(ctx.title, ctx.source, { stacked: true, legendPosition: "top" }),
    },
    {
      title: () => _t("Multi-series Line"),
      description: () => _t("Trend per series across categories."),
      build: (ctx) => lineChart(ctx.title, ctx.source, { legendPosition: "top" }),
    },
    {
      title: () => _t("Stacked Area"),
      description: () => _t("Volume and composition across categories."),
      build: (ctx) =>
        lineChart(ctx.title, ctx.source, { stacked: true, fillArea: true, legendPosition: "top" }),
    },
    {
      title: () => _t("Radar"),
      description: () => _t("Shape comparison across metrics (best for ≤ 10 rows)."),
      isApplicable: ({ rowCount }) => rowCount > 2 && rowCount <= 10,
      build: (ctx) => radarChart(ctx.title, ctx.source, { legendPosition: "top" }),
    },
  ];

/** Pattern N — Date + Multiple Numbers */
interface DateVsMultipleNumbersContext {
  title: string;
  source: ChartRangeDataSource<string>;
}

function buildDateVsMultipleNumbersContext(
  [dateCol, ...numCols]: ColumnAnalysis[],
  getters: Getters
): DateVsMultipleNumbersContext {
  const labelRange = getUnboundRange(getters, dateCol.zone);
  const hasTitle = numCols.some((c) => c.hasHeader) || isDatasetTitled(getters, dateCol.zone);
  const title =
    numCols.length === 1 && numCols[0].header
      ? _t("%s over time", numCols[0].header)
      : _t("Multi-series over Time");
  const dataSets = numCols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, hasTitle, labelRange);
  return { title, source };
}

const DATE_VS_MULTIPLE_NUMBERS_SUGGESTIONS: SuggestionSpec<DateVsMultipleNumbersContext>[] = [
  {
    title: () => _t("Multi-series Line"),
    description: () => _t("Trend comparison across multiple metrics over time."),
    build: (ctx) => lineChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    title: () => _t("Stacked Area"),
    description: () => _t("Volume composition over time."),
    build: (ctx) =>
      lineChart(ctx.title, ctx.source, { stacked: true, fillArea: true, legendPosition: "top" }),
  },
  {
    title: () => _t("Combo Chart"),
    description: () => _t("Bar for the primary metric, line for the others."),
    build: (ctx) => comboChart(ctx.title, ctx.source),
  },
  {
    title: () => _t("Grouped Bar"),
    description: () => _t("Period-by-period grouped comparison."),
    build: (ctx) => barChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
];

/** Pattern O — Categorical + Categorical + Number */
interface MultipleCategoricalsVsNumberContext {
  title: string;
  hierarchySource: ChartRangeDataSource<string>;
  barSource: ChartRangeDataSource<string>;
}

function buildMultipleCategoricalsVsNumberContext(
  [cat1, cat2, numCol]: ColumnAnalysis[],
  getters: Getters
): MultipleCategoricalsVsNumberContext {
  const title = numCol.header
    ? _t(
        "%s by %s and %s",
        numCol.header,
        cat1.header ?? _t("Level 1"),
        cat2.header ?? _t("Level 2")
      )
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
  return { title, hierarchySource, barSource };
}

const MULTIPLE_CATEGORICALS_VS_NUMBER_SUGGESTIONS: SuggestionSpec<MultipleCategoricalsVsNumberContext>[] =
  [
    {
      title: () => _t("Sunburst"),
      description: () => _t("Two-level hierarchy weighted by value."),
      build: (ctx) => sunburstChart(ctx.title, ctx.hierarchySource),
    },
    {
      title: () => _t("Treemap"),
      description: () => _t("Proportional nested area weighted by value."),
      build: (ctx) => treemapChart(ctx.title, ctx.hierarchySource),
    },
    {
      title: () => _t("Grouped Bar"),
      description: () => _t("One series per inner category, grouped by outer category."),
      build: (ctx) => barChart(ctx.title, ctx.barSource, { legendPosition: "top" }),
    },
    {
      title: () => _t("Stacked Bar"),
      description: () => _t("Contribution of inner categories per outer category."),
      build: (ctx) => barChart(ctx.title, ctx.barSource, { stacked: true, legendPosition: "top" }),
    },
  ];

/** Pattern P — Categorical + Date + Number */
interface CategoricalDateNumberContext {
  title: string;
  sourceByDate: ChartRangeDataSource<string>;
  sourceByCat: ChartRangeDataSource<string>;
}

function buildCategoricalDateNumberContext(
  [catCol, dateCol, numCol]: ColumnAnalysis[],
  getters: Getters
): CategoricalDateNumberContext {
  const dateRange = getUnboundRange(getters, dateCol.zone);
  const catRange = getUnboundRange(getters, catCol.zone);
  const hasTitle = numCol.hasHeader;
  const title = numCol.header
    ? _t(
        "%s by %s over %s",
        numCol.header,
        catCol.header ?? _t("Category"),
        dateCol.header ?? _t("Time")
      )
    : _t("Multi-series over Time");
  const sourceByDate = rangeSource([dataset(numCol.zone, getters)], hasTitle, dateRange);
  const sourceByCat = rangeSource([dataset(numCol.zone, getters)], hasTitle, catRange);
  return { title, sourceByDate, sourceByCat };
}

const CATEGORICAL_DATE_NUMBER_SUGGESTIONS: SuggestionSpec<CategoricalDateNumberContext>[] = [
  {
    title: () => _t("Line (over time)"),
    description: () => _t("Trend of values over time."),
    build: (ctx) => lineChart(ctx.title, ctx.sourceByDate, { legendPosition: "top" }),
  },
  {
    title: () => _t("Stacked Area"),
    description: () => _t("Volume contribution over time."),
    build: (ctx) =>
      lineChart(ctx.title, ctx.sourceByDate, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
  },
  {
    title: () => _t("Grouped Bar"),
    description: () => _t("Period × category side-by-side comparison."),
    build: (ctx) => barChart(ctx.title, ctx.sourceByCat, { legendPosition: "top" }),
  },
  {
    title: () => _t("Stacked Bar"),
    description: () => _t("Composition per period over time."),
    build: (ctx) => barChart(ctx.title, ctx.sourceByDate, { stacked: true, legendPosition: "top" }),
  },
];

/** Pattern Q — Label + Multiple Numbers */
interface LabelVsMultipleNumbersContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
  numColsCount: number;
  /** Always defined: this rule only fires with >= 2 numeric columns (open-ended shape, min 3 total). */
  scatterSource: ChartRangeDataSource<string>;
  /** Only defined when numColsCount === 3 (Bubble Chart's isApplicable guards its use). */
  bubble?: {
    xRange: string;
    yRanges: string[];
    sizeRange: string;
    labelRange: string;
    hasTitle: boolean;
  };
}

function buildLabelVsMultipleNumbersContext(
  [labelCol, ...numCols]: ColumnAnalysis[],
  getters: Getters
): LabelVsMultipleNumbersContext {
  const labelRange = getUnboundRange(getters, labelCol.zone);
  const hasTitle = numCols.some((c) => c.hasHeader);
  const title = labelCol.header ? _t("By %s", labelCol.header) : _t("Profile Comparison");
  const dataSets = numCols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, hasTitle, labelRange);
  const scatterSource = rangeSource(
    [dataset(numCols[1].zone, getters)],
    numCols[1].hasHeader,
    getUnboundRange(getters, numCols[0].zone)
  );
  const bubble =
    numCols.length === 3
      ? {
          xRange: getUnboundRange(getters, numCols[0].zone),
          yRanges: [getUnboundRange(getters, numCols[1].zone)],
          sizeRange: getUnboundRange(getters, numCols[2].zone),
          labelRange,
          hasTitle,
        }
      : undefined;
  return {
    title,
    source,
    rowCount: labelCol.rowCount,
    numColsCount: numCols.length,
    scatterSource,
    bubble,
  };
}

const LABEL_VS_MULTIPLE_NUMBERS_SUGGESTIONS: SuggestionSpec<LabelVsMultipleNumbersContext>[] = [
  {
    title: () => _t("Horizontal Bar"),
    description: () => _t("Side-by-side per entity — works well for long labels."),
    build: (ctx) => barChart(ctx.title, ctx.source, { horizontal: true, legendPosition: "top" }),
  },
  {
    title: () => _t("Grouped Bar"),
    description: () => _t("Grouped bars per entity for direct metric comparison."),
    build: (ctx) => barChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    title: () => _t("Radar"),
    description: () => _t("Shape/profile comparison across metrics for each entity."),
    isApplicable: ({ rowCount }) => rowCount > 2 && rowCount <= 10,
    build: (ctx) => radarChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    title: () => _t("Scatter Plot"),
    description: () => _t("Correlation between the two numeric metrics across entities."),
    isApplicable: ({ rowCount, numColsCount }) => rowCount > 2 && numColsCount === 2,
    build: (ctx) => scatterChart(ctx.title, ctx.scatterSource),
  },
  {
    title: () => _t("Bubble Chart"),
    description: () => _t("Three metrics in one view: X position, Y position and bubble size."),
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
interface CategoricalTwoNumbersContext {
  title: string;
  sourceBoth: ChartRangeDataSource<string>;
  isPyramid: boolean;
}

function buildCategoricalTwoNumbersContext(
  [catCol, numCol1, numCol2]: ColumnAnalysis[],
  getters: Getters
): CategoricalTwoNumbersContext {
  const catRange = getUnboundRange(getters, catCol.zone);
  const hasTitle = numCol1.hasHeader || numCol2.hasHeader;
  const title =
    numCol1.header && numCol2.header
      ? _t("%s vs %s by %s", numCol1.header, numCol2.header, catCol.header ?? _t("Category"))
      : catCol.header
      ? _t("By %s", catCol.header)
      : _t("Category Comparison");
  const isPyramid = isPyramidLike(numCol1, numCol2);
  const sourceBoth = rangeSource(
    [dataset(numCol1.zone, getters, "0"), dataset(numCol2.zone, getters, "1")],
    hasTitle,
    catRange
  );
  return { title, sourceBoth, isPyramid };
}

const CATEGORICAL_TWO_NUMBERS_SUGGESTIONS: SuggestionSpec<CategoricalTwoNumbersContext>[] = [
  {
    title: () => _t("Population Pyramid"),
    description: () => _t("Natural fit for symmetric or opposing values per category."),
    isApplicable: ({ isPyramid }) => isPyramid,
    build: (ctx) => pyramidChart(ctx.title, ctx.sourceBoth),
  },
  {
    title: () => _t("Grouped Bar"),
    description: () => _t("Side-by-side comparison of both metrics per category."),
    build: (ctx) =>
      barChart(ctx.title, ctx.sourceBoth, { legendPosition: "top", aggregated: true }),
  },
  {
    title: () => _t("Combo Chart"),
    description: () => _t("Bar for the first series, line for the second — good for mixed scales."),
    build: (ctx) => comboChart(ctx.title, ctx.sourceBoth, { aggregated: true }),
  },
  {
    title: () => _t("Stacked Bar"),
    description: () => _t("Shows total and composition per category."),
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
interface ManyNumbersContext {
  title: string;
  source: ChartRangeDataSource<string>;
  colsLength: number;
  rowCount: number;
  lastCellXC: string;
  firstCellXC: string;
  secondCellXC: string;
}

function buildManyNumbersContext(cols: ColumnAnalysis[], getters: Getters): ManyNumbersContext {
  const title = cols.every((c) => c.hasHeader)
    ? cols.map((c) => c.header!).join(" / ")
    : _t("KPI Overview");
  const hasTitle = cols.some((c) => c.hasHeader);
  const dataSets = cols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, hasTitle);
  const { lastCellXC } = interestingCellsXc(cols[2]);
  const { lastCellXC: firstCellXC } = interestingCellsXc(cols[0]);
  const { lastCellXC: secondCellXC } = interestingCellsXc(cols[1]);
  return {
    title,
    source,
    colsLength: cols.length,
    rowCount: cols[0].rowCount,
    lastCellXC,
    firstCellXC,
    secondCellXC,
  };
}

const MANY_NUMBERS_SUGGESTIONS: SuggestionSpec<ManyNumbersContext>[] = [
  {
    title: () => _t("Gauge"),
    description: () => _t("Shows the position of the last value within the data's min-max range."),
    isApplicable: ({ colsLength, rowCount }) => colsLength === 3 && rowCount === 1,
    build: (ctx) =>
      gaugeChart(ctx.title, ctx.lastCellXC, `=${ctx.firstCellXC}`, `=${ctx.secondCellXC}`),
  },
  {
    title: () => _t("Multi-series Line"),
    description: () => _t("Trend comparison across all metrics."),
    isApplicable: ({ rowCount }) => rowCount > 2,
    build: (ctx) => lineChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    title: () => _t("Radar"),
    description: () => _t("Overall shape/profile across all metrics."),
    isApplicable: ({ rowCount }) => rowCount > 2 && rowCount <= 10,
    build: (ctx) => radarChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    title: () => _t("Grouped Bar"),
    description: () => _t("Side-by-side comparison of all numeric metrics."),
    build: (ctx) => barChart(ctx.title, ctx.source, { legendPosition: "top" }),
  },
  {
    title: () => _t("Stacked Bar"),
    description: () => _t("Side-by-side comparison of all numeric metrics."),
    build: (ctx) => barChart(ctx.title, ctx.source, { legendPosition: "top", stacked: true }),
  },
];

const NUMBER_OR_PERCENTAGE: readonly ExtendedColumnType[] = ["number", "percentage"];

// Fixed-length shapes. Pairwise disjoint by construction (mutually exclusive literal
// tuples), so array order doesn't matter — tried before OPEN_ENDED_RULES.
const EXACT_RULES: ChartSuggestionRule<any>[] = [
  {
    shape: { prefix: ["number"] },
    buildContext: buildSingleNumberContext,
    specs: SINGLE_NUMBER_COLUMN_SUGGESTIONS,
  },
  {
    shape: { prefix: ["percentage"] },
    buildContext: buildSinglePercentageContext,
    specs: SINGLE_PERCENTAGE_COLUMN_SUGGESTIONS,
  },
  {
    shape: { prefix: ["date"] },
    buildContext: buildSingleDateContext,
    specs: SINGLE_DATE_COLUMN_SUGGESTIONS,
  },
  {
    shape: { prefix: ["categorical"] },
    buildContext: buildSingleCategoricalContext,
    specs: SINGLE_CATEGORICAL_COLUMN_SUGGESTIONS,
  },
  {
    shape: { prefix: ["label"] },
    buildContext: buildSingleLabelContext,
    specs: SINGLE_LABEL_COLUMN_SUGGESTIONS,
  },
  {
    shape: { prefix: ["categorical", "number"] },
    buildContext: buildCategoricalVsNumberContext,
    specs: CATEGORICAL_VS_NUMBER_SUGGESTIONS,
  },
  {
    shape: { prefix: ["date", NUMBER_OR_PERCENTAGE] },
    buildContext: buildDateVsSeriesContext,
    specs: DATE_VS_SERIES_SUGGESTIONS,
  },
  {
    shape: { prefix: ["number", "number"] },
    buildContext: buildNumberVsNumberContext,
    specs: NUMBER_VS_NUMBER_SUGGESTIONS,
  },
  {
    shape: { prefix: ["categorical", "percentage"] },
    buildContext: buildCategoricalVsPercentageContext,
    specs: CATEGORICAL_VS_PERCENTAGE_SUGGESTIONS,
  },
  {
    shape: { prefix: ["label", "number"] },
    buildContext: buildLabelVsNumberContext,
    specs: LABEL_VS_NUMBER_SUGGESTIONS,
  },
  {
    shape: { prefix: ["label", "percentage"] },
    buildContext: buildCategoricalVsPercentageContext,
    specs: CATEGORICAL_VS_PERCENTAGE_SUGGESTIONS,
  },
  {
    shape: { prefix: ["categorical", "categorical", "number"] },
    buildContext: buildMultipleCategoricalsVsNumberContext,
    specs: MULTIPLE_CATEGORICALS_VS_NUMBER_SUGGESTIONS,
  },
  {
    shape: { prefix: ["categorical", "label", "number"] },
    buildContext: buildMultipleCategoricalsVsNumberContext,
    specs: MULTIPLE_CATEGORICALS_VS_NUMBER_SUGGESTIONS,
  },
  {
    shape: { prefix: ["categorical", "date", NUMBER_OR_PERCENTAGE] },
    buildContext: buildCategoricalDateNumberContext,
    specs: CATEGORICAL_DATE_NUMBER_SUGGESTIONS,
  },
  {
    shape: { prefix: ["categorical", NUMBER_OR_PERCENTAGE, NUMBER_OR_PERCENTAGE] },
    buildContext: buildCategoricalTwoNumbersContext,
    specs: CATEGORICAL_TWO_NUMBERS_SUGGESTIONS,
  },
];

// Open-ended shapes: a literal prefix followed by one or more columns matching `rest.type`.
// Pairwise disjoint by construction (each requires a distinct first-column type, except
// "many-numbers" which requires ALL columns to be number/percentage — a shape no other rule
// here allows) — tried only once no EXACT_RULES entry matches.
const OPEN_ENDED_RULES: ChartSuggestionRule<any>[] = [
  {
    shape: { prefix: [], rest: { type: NUMBER_OR_PERCENTAGE, minTotalColumns: 3 } },
    buildContext: buildManyNumbersContext,
    specs: MANY_NUMBERS_SUGGESTIONS,
  },
  {
    shape: { prefix: ["label"], rest: { type: NUMBER_OR_PERCENTAGE, minTotalColumns: 3 } },
    buildContext: buildLabelVsMultipleNumbersContext,
    specs: LABEL_VS_MULTIPLE_NUMBERS_SUGGESTIONS,
  },
  {
    shape: { prefix: ["categorical"], rest: { type: NUMBER_OR_PERCENTAGE, minTotalColumns: 3 } },
    buildContext: buildCategoricalVsMultipleNumbersContext,
    specs: CATEGORICAL_VS_MULTIPLE_NUMBERS_SUGGESTIONS,
  },
  {
    shape: { prefix: ["date"], rest: { type: NUMBER_OR_PERCENTAGE, minTotalColumns: 3 } },
    buildContext: buildDateVsMultipleNumbersContext,
    specs: DATE_VS_MULTIPLE_NUMBERS_SUGGESTIONS,
  },
];

function findMatchingRule(shape: ExtendedColumnType[]): ChartSuggestionRule<any> | undefined {
  return (
    EXACT_RULES.find((rule) => matchesShape(rule.shape, shape)) ??
    OPEN_ENDED_RULES.find((rule) => matchesShape(rule.shape, shape))
  );
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
  const rule = findMatchingRule(shape);
  if (!rule) {
    return [];
  }
  const ctx = rule.buildContext(nonEmpty, getters);
  return rule.specs
    .filter((spec) => spec.isApplicable?.(ctx) ?? true)
    .map((spec) => ({
      title: spec.title(),
      rationale: spec.description(),
      definition: spec.build(ctx),
    }));
}
