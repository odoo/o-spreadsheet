import {
  DEFAULT_GAUGE_LOWER_COLOR,
  DEFAULT_GAUGE_MIDDLE_COLOR,
  DEFAULT_GAUGE_UPPER_COLOR,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
} from "../../../constants";
import { _t } from "../../../translation";
import { CellValueType, EvaluatedCell } from "../../../types/cells";
import { BarChartDefinition } from "../../../types/chart/bar_chart";
import { BubbleChartDefinition } from "../../../types/chart/bubble_chart";
import { CalendarChartDefinition } from "../../../types/chart/calendar_chart";
import { ChartDefinition, ChartRangeDataSource } from "../../../types/chart/chart";
import { FunnelChartDefinition } from "../../../types/chart/funnel_chart";
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
import { isDateTimeFormat } from "../../format/format";
import { getZonesByColumns, zoneToXc } from "../../zones";

export type ExtendedColumnType =
  | "number"
  | "percentage"
  | "date"
  | "categorical"
  | "label"
  | "hierarchy"
  | "boolean"
  | "empty";

const HIERARCHY_SEPARATORS = [">", "→", " - ", "/", "\\"];

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

interface HierarchyInfo {
  separator: string;
  maxDepth: number;
}

export interface ColumnAnalysis {
  zone: Zone;
  type: ExtendedColumnType;
  header?: string;
  hasHeader: boolean;
  rowCount: number;
  uniqueCount: number;
  uniqueRatio: number;
  minValue?: number;
  maxValue?: number;
  lastValue?: number;
  secondToLastValue?: number;
  hierarchy?: HierarchyInfo;
}

export interface ChartSuggestion {
  title: string;
  rationale: string;
  definition: ChartDefinition;
}

function getUnboundRange(getters: Getters, zone: Zone): string {
  return zoneToXc(getters.getUnboundedZone(getters.getActiveSheetId(), zone));
}

function isDatasetTitled(getters: Getters, zone: Zone): boolean {
  const sheetId = getters.getActiveSheetId();
  const cell = getters.getEvaluatedCell({ sheetId, col: zone.left, row: zone.top });
  return ![CellValueType.number, CellValueType.empty].includes(cell.type);
}

function dataset(zone: Zone, getters: Getters, id = "0") {
  return { dataRange: getUnboundRange(getters, zone), dataSetId: id };
}

function rangeSource(
  dataSets: ReturnType<typeof dataset>[],
  dataSetsHaveTitle: boolean,
  labelRange?: string
): ChartRangeDataSource<string> {
  return { type: "range", dataSets, dataSetsHaveTitle, labelRange };
}

function detectHierarchy(values: string[]): HierarchyInfo | undefined {
  if (values.length < 3) {
    return undefined;
  }

  const countBySep: Record<string, number> = {};
  for (const val of values) {
    for (const sep of HIERARCHY_SEPARATORS) {
      if (val.includes(sep)) {
        countBySep[sep] = (countBySep[sep] ?? 0) + 1;
        break;
      }
    }
  }

  const valuesWithAnySep = Object.values(countBySep).reduce((a, b) => a + b, 0);
  if (valuesWithAnySep / values.length < 0.7) {
    return undefined;
  }

  const best = Object.entries(countBySep).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] / values.length < 0.8) {
    return undefined;
  }

  const [sep] = best;
  const depths = values.map((v) => v.split(sep).length);
  if (new Set(depths).size < 2) {
    return undefined;
  }

  return { separator: sep, maxDepth: Math.max(...depths) };
}

function isPyramidLike(numCol1: ColumnAnalysis, numCol2: ColumnAnalysis): boolean {
  if ((numCol1.maxValue ?? 1) <= 0) {
    return true;
  } else if ((numCol2.maxValue ?? 1) <= 0) {
    return true;
  }
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

function funnelChart(
  titleText: string,
  source: ChartRangeDataSource<string>
): FunnelChartDefinition<string> {
  return {
    type: "funnel",
    title: { text: titleText },
    dataSource: source,
    dataSetStyles: {},
    legendPosition: "none",
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
    humanize: true,
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

function computeColumnType(cells: EvaluatedCell[], getters: Getters): ExtendedColumnType {
  if (cells.length > 0) {
    if (cells.every((c) => c.type === CellValueType.boolean)) {
      return "boolean";
    } else if (
      cells.every(
        (c) => c.type === CellValueType.number && !!c.format && isDateTimeFormat(c.format)
      )
    ) {
      return "date";
    } else if (
      cells.every((c) => {
        if (c.type !== CellValueType.number) {
          return false;
        }
        if (c.format?.includes("%")) {
          return true;
        }
        const v = c.value as number;
        if (v < 0 || v > 1) {
          return false;
        }
        const str = String(v);
        const dot = str.indexOf(".");
        return dot < 0 || str.length - dot - 1 <= 2;
      })
    ) {
      return "percentage";
    } else if (cells.every((c) => c.type === CellValueType.number)) {
      return "number";
    } else {
      const textVals = cells
        .filter((c) => c.type === CellValueType.text)
        .map((c) => c.value as string);

      if (textVals.length > 0) {
        const hier = detectHierarchy(textVals);
        if (hier) {
          return "hierarchy";
        } else {
          const unique = new Set(textVals).size;
          const ratio = unique / textVals.length;
          return ratio < 0.75 && unique <= 20 ? "categorical" : "label";
        }
      }
    }
  }
  return "empty";
}

function analyzeColumn(zone: Zone, getters: Getters): ColumnAnalysis {
  const sheetId = getters.getActiveSheetId();
  const cells = getters.getEvaluatedCellsInZone(sheetId, zone);

  if (!cells.length) {
    return { zone, type: "empty", hasHeader: false, rowCount: 0, uniqueCount: 0, uniqueRatio: 0 };
  }

  const firstCell = cells[0];
  const rest = cells.slice(1);

  // Header: first cell is text AND rest has at least one non-text, non-empty cell
  const hasHeader =
    firstCell.type === CellValueType.text &&
    rest.some((c) => c.type !== CellValueType.text && c.type !== CellValueType.empty);

  const dataCells: EvaluatedCell[] = hasHeader ? rest : cells;
  const nonEmpty = dataCells.filter((c) => c.type !== CellValueType.empty);

  const type = computeColumnType(nonEmpty, getters);
  let hierarchy: HierarchyInfo | undefined = undefined;
  if (type === "hierarchy") {
    const textVals = cells
      .filter((c) => c.type === CellValueType.text)
      .map((c) => c.value as string);
    hierarchy = detectHierarchy(textVals);
  }

  const numVals = nonEmpty
    .filter((c) => c.type === CellValueType.number)
    .map((c) => c.value as number);

  const allVals = nonEmpty.map((c) => String(c.value ?? ""));
  const uniqueCount = new Set(allVals).size;

  return {
    zone,
    type,
    header: hasHeader ? String(firstCell.value ?? "") : undefined,
    hasHeader,
    rowCount: nonEmpty.length,
    uniqueCount,
    uniqueRatio: allVals.length > 0 ? uniqueCount / allVals.length : 0,
    minValue: numVals.length ? Math.min(...numVals) : undefined,
    maxValue: numVals.length ? Math.max(...numVals) : undefined,
    lastValue: numVals.length ? numVals[numVals.length - 1] : undefined,
    secondToLastValue: numVals.length >= 2 ? numVals[numVals.length - 2] : undefined,
    hierarchy,
  };
}

export function analyzeColumns(zones: Zone[], getters: Getters): ColumnAnalysis[] {
  return getZonesByColumns(zones).map((zone) => analyzeColumn(zone, getters));
}

/** Pattern A — Single numeric column */
function chartsForSingleNumberColumn(col: ColumnAnalysis, getters: Getters): ChartSuggestion[] {
  const hasTitle = col.hasHeader;
  const title = col.header ?? _t("Value");
  const lastRow = col.zone.bottom;
  const lastCellXC = zoneToXc({ ...col.zone, top: lastRow, bottom: lastRow });
  const prevCellXC = zoneToXc({ ...col.zone, top: lastRow - 1, bottom: lastRow - 1 });
  const hasPrev = lastRow - 1 >= col.zone.top;

  const source = rangeSource([dataset(col.zone, getters)], hasTitle);

  return [
    {
      title: _t("%s — KPI Card", title),
      rationale: _t("Highlights the most recent value compared to the previous one."),
      definition: scorecardChart(title, lastCellXC, {
        baseline: hasPrev ? prevCellXC : undefined,
        baselineMode: "difference",
      }),
    },
    {
      title: _t("%s — Gauge", title),
      rationale: _t("Shows the position of the last value within the data's min-max range."),
      definition: gaugeChart(
        title,
        lastCellXC,
        String(col.minValue ?? 0),
        String(col.maxValue ?? 100)
      ),
    },
    {
      title: _t("%s — Trend Line", title),
      rationale: _t("Shows the evolution of all values over the range."),
      definition: lineChart(title, source),
    },
    {
      title: _t("%s — Bar Chart", title),
      rationale: _t("Compares individual values side-by-side."),
      definition: barChart(title, source),
    },
    {
      title: _t("%s — Area Chart", title),
      rationale: _t("Emphasizes total accumulation over the range."),
      definition: lineChart(title, source, { fillArea: true, cumulative: true }),
    },
  ];
}

/** Pattern B — Single percentage column */
function chartsForSinglePercentageColumn(col: ColumnAnalysis, getters: Getters): ChartSuggestion[] {
  const hasTitle = col.hasHeader;
  const title = col.header ?? _t("Rate");
  const lastRow = col.zone.bottom;
  const lastCellXC = zoneToXc({ ...col.zone, top: lastRow, bottom: lastRow });
  const prevCellXC = zoneToXc({ ...col.zone, top: lastRow - 1, bottom: lastRow - 1 });
  const hasPrev = lastRow - 1 >= col.zone.top;

  const source = rangeSource([dataset(col.zone, getters)], hasTitle);
  const isAboveOne = (col.maxValue ?? 0) > 1;

  return [
    {
      title: _t("%s — KPI Card", title),
      rationale: _t("Shows the last percentage value with its baseline."),
      definition: scorecardChart(title, lastCellXC, {
        baseline: hasPrev ? prevCellXC : undefined,
        baselineMode: "percentage",
      }),
    },
    {
      title: _t("%s — Gauge", title),
      rationale: _t("Natural fit for a 0–100% range."),
      definition: gaugeChart(title, lastCellXC, "0", isAboveOne ? "100" : "1"),
    },
    {
      title: _t("%s — Donut Chart", title),
      rationale: _t("Shows completion against total."),
      definition: pieChart(title, source, { isDoughnut: true }),
    },
    {
      title: _t("%s — Bar Chart", title),
      rationale: _t("Compares all percentage values side-by-side."),
      definition: barChart(title, source),
    },
  ];
}

/** Pattern C — Single date column */
function chartsForSingleDateColumn(col: ColumnAnalysis, getters: Getters): ChartSuggestion[] {
  const hasTitle = col.hasHeader;
  const title = col.header ?? _t("Date");
  const source = rangeSource([dataset(col.zone, getters)], hasTitle);

  return [
    {
      title: _t("%s — Line (cumulative)", title),
      rationale: _t("Shows cumulative event count over time."),
      definition: lineChart(title, source, { cumulative: true }),
    },
    {
      title: _t("%s — Bar (count per period)", title),
      rationale: _t("Groups events by period for a period-by-period comparison."),
      definition: barChart(title, source),
    },
    {
      title: _t("%s — Calendar Heatmap", title),
      rationale: _t("Shows event density across the year."),
      definition: calendarChart(title, source),
    },
  ];
}

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
      title: _t("%s — Pie Chart", title),
      rationale: _t("Shows the share of each category."),
      definition: pieChart(title, source, { aggregated: true, legendPosition: "top" }),
    },
    {
      title: _t("%s — Donut Chart", title),
      rationale: _t("Same as pie, cleaner proportional look."),
      definition: pieChart(title, source, {
        aggregated: true,
        isDoughnut: true,
        legendPosition: "top",
      }),
    },
    {
      title: _t("%s — Bar (count)", title),
      rationale: _t("Absolute count per category."),
      definition: barChart(title, { ...source, labelRange: range }, { legendPosition: "none" }),
    },
    {
      title: _t("%s — Treemap", title),
      rationale: _t("Proportional area per category."),
      definition: treemapChart(title, source),
    },
  ];

  if (col.uniqueCount <= 8) {
    suggestions.push({
      title: _t("%s — Funnel", title),
      rationale: _t("Useful when categories imply stages or ordering."),
      definition: funnelChart(title, source),
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
      title: _t("%s — Bar Chart", title),
      rationale: _t("Classic category-vs-value comparison."),
      definition: barChart(title, source),
    },
    {
      title: _t("%s — Horizontal Bar", title),
      rationale: _t("Better when category labels are long."),
      definition: barChart(title, source, { horizontal: true }),
    },
    {
      title: _t("%s — Pie Chart", title),
      rationale: _t("Share of total per category."),
      definition: pieChart(title, source, { legendPosition: "top", aggregated: true }),
    },
    {
      title: _t("%s — Treemap", title),
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

  if (catCol.rowCount <= 8) {
    suggestions.push({
      title: _t("%s — Funnel", title),
      rationale: _t("Useful when categories represent sequential stages."),
      definition: funnelChart(title, source),
    });
  }

  return suggestions;
}

/** Pattern G — Date + Number */
function chartsForDateVsNumber(cols: ColumnAnalysis[], getters: Getters): ChartSuggestion[] {
  const [dateCol, numCol] = cols;
  const labelRange = getUnboundRange(getters, dateCol.zone);
  const hasTitle = isDatasetTitled(getters, dateCol.zone);
  const title = numCol.header ? _t("%s over time", numCol.header) : _t("Over Time");
  const source = rangeSource([dataset(numCol.zone, getters)], hasTitle, labelRange);

  const suggestions: ChartSuggestion[] = [
    {
      title: _t("%s — Line Chart", title),
      rationale: _t("Best for visualizing time-series trends."),
      definition: lineChart(title, source),
    },
    {
      title: _t("%s — Area Chart", title),
      rationale: _t("Emphasizes total volume over time."),
      definition: lineChart(title, source, { fillArea: true, cumulative: true }),
    },
    {
      title: _t("%s — Bar Chart", title),
      rationale: _t("Period-by-period comparison."),
      definition: barChart(title, source),
    },
    {
      title: _t("%s — Calendar Heatmap", title),
      rationale: _t("Shows intensity variation across days of the year."),
      definition: calendarChart(title, source),
    },
  ];

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

  const suggestions: ChartSuggestion[] = [
    {
      title: _t("%s — Scatter Plot", title),
      rationale: _t("Reveals correlation between two numeric variables."),
      definition: scatterChart(title, source2),
    },
    {
      title: _t("%s — Combo Chart", title),
      rationale: _t("Bar for the first series, line for the second — good for mixed scales."),
      definition: {
        type: "combo",
        title: { text: title },
        dataSource: sourceBoth,
        dataSetStyles: {},
        legendPosition: "top",
        humanize: true,
      },
    },
    {
      title: _t("%s — Grouped Bar", title),
      rationale: _t("Side-by-side comparison of two numeric series."),
      definition: barChart(title, sourceBoth, { legendPosition: "top" }),
    },
    {
      title: _t("%s — Stacked Area", title),
      rationale: _t("When both metrics contribute to a total."),
      definition: lineChart(title, sourceBoth, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
    },
  ];

  if (col1.rowCount <= 10) {
    suggestions.push({
      title: _t("%s — Radar", title),
      rationale: _t("Shape-based comparison when rows represent named entities."),
      definition: radarChart(title, sourceBoth, { legendPosition: "top" }),
    });
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
      title: _t("%s — Horizontal Bar", title),
      rationale: _t("Progress-bar style per category."),
      definition: barChart(title, source, { horizontal: true }),
    },
    {
      title: _t("%s — Bar Chart", title),
      rationale: _t("Vertical comparison of rates per category."),
      definition: barChart(title, source),
    },
    {
      title: _t("%s — Pie Chart", title),
      rationale: _t("Share of total percentage across categories."),
      definition: pieChart(title, source, { legendPosition: "top" }),
    },
  ];

  if (catCol.rowCount <= 10) {
    suggestions.push({
      title: _t("%s — Radar", title),
      rationale: _t("Comparison of completion rates across categories."),
      definition: radarChart(title, source),
    });
  }

  return suggestions;
}

/** Pattern J — Date + Percentage */
function chartsForDateVsPercentage(cols: ColumnAnalysis[], getters: Getters): ChartSuggestion[] {
  const [dateCol, pctCol] = cols;
  const labelRange = getUnboundRange(getters, dateCol.zone);
  const hasTitle = isDatasetTitled(getters, dateCol.zone);
  const title = pctCol.header ? _t("%s over time", pctCol.header) : _t("Rate over Time");
  const source = rangeSource([dataset(pctCol.zone, getters)], hasTitle, labelRange);

  return [
    {
      title: _t("%s — Line Chart", title),
      rationale: _t("Trend of the rate over time."),
      definition: lineChart(title, source),
    },
    {
      title: _t("%s — Area Chart", title),
      rationale: _t("Emphasizes volume of the rate over time."),
      definition: lineChart(title, source, { fillArea: true, cumulative: true }),
    },
    {
      title: _t("%s — Bar Chart", title),
      rationale: _t("Period-by-period comparison of the rate."),
      definition: barChart(title, source),
    },
  ];
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

  const suggestions: ChartSuggestion[] = [
    {
      title: _t("%s — Horizontal Bar", title),
      rationale: _t("Works well for named entities with long labels."),
      definition: barChart(title, source, { horizontal: true }),
    },
    {
      title: _t("%s — Bar Chart", title),
      rationale: _t("Vertical comparison across named items."),
      definition: barChart(title, source),
    },
  ];

  if (labelCol.rowCount <= 10) {
    suggestions.push({
      title: _t("%s — Radar", title),
      rationale: _t("Shape-based comparison across labeled items."),
      definition: radarChart(title, source),
    });
  }

  return suggestions;
}

/** Pattern L — Categorical + Categorical */
function chartsForCategoricalVsCategorical(
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
      title: _t("%s — Sunburst", title),
      rationale: _t("Two-level hierarchy — outer ring = first column, inner = second."),
      definition: sunburstChart(title, sourceBoth),
    },
    {
      title: _t("%s — Treemap", title),
      rationale: _t("Proportional nested areas — outer = first column, inner = second."),
      definition: treemapChart(title, sourceBoth),
    },
    {
      title: _t("%s — Grouped Bar (counts)", title),
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
}

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
      title: _t("%s — Grouped Bar", title),
      rationale: _t("Side-by-side comparison across categories for each series."),
      definition: barChart(title, source, { legendPosition: "top" }),
    },
    {
      title: _t("%s — Stacked Bar", title),
      rationale: _t("Shows composition and total per category."),
      definition: barChart(title, source, { stacked: true, legendPosition: "top" }),
    },
    {
      title: _t("%s — Multi-series Line", title),
      rationale: _t("Trend per series across categories."),
      definition: lineChart(title, source, { legendPosition: "top" }),
    },
    {
      title: _t("%s — Stacked Area", title),
      rationale: _t("Volume and composition across categories."),
      definition: lineChart(title, source, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
    },
  ];

  if (catCol.rowCount <= 10) {
    suggestions.push({
      title: _t("%s — Radar", title),
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
      title: _t("%s — Multi-series Line", title),
      rationale: _t("Trend comparison across multiple metrics over time."),
      definition: lineChart(title, source, { legendPosition: "top" }),
    },
    {
      title: _t("%s — Stacked Area", title),
      rationale: _t("Volume composition over time."),
      definition: lineChart(title, source, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
    },
    {
      title: _t("%s — Combo Chart", title),
      rationale: _t("Bar for the primary metric, line for the others."),
      definition: {
        type: "combo",
        title: { text: title },
        dataSource: rangeSource(dataSets, hasTitle, labelRange),
        dataSetStyles: {},
        legendPosition: "top",
        humanize: true,
      },
    },
    {
      title: _t("%s — Grouped Bar", title),
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
      title: _t("%s — Sunburst", title),
      rationale: _t("Two-level hierarchy weighted by value."),
      definition: sunburstChart(title, hierarchySource),
    },
    {
      title: _t("%s — Treemap", title),
      rationale: _t("Proportional nested area weighted by value."),
      definition: treemapChart(title, hierarchySource),
    },
    {
      title: _t("%s — Grouped Bar", title),
      rationale: _t("One series per inner category, grouped by outer category."),
      definition: barChart(title, barSource, { legendPosition: "top" }),
    },
    {
      title: _t("%s — Stacked Bar", title),
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
      title: _t("%s — Line (over time)", title),
      rationale: _t("Trend of values over time."),
      definition: lineChart(title, sourceByDate, { legendPosition: "top" }),
    },
    {
      title: _t("%s — Stacked Area", title),
      rationale: _t("Volume contribution over time."),
      definition: lineChart(title, sourceByDate, {
        stacked: true,
        fillArea: true,
        legendPosition: "top",
      }),
    },
    {
      title: _t("%s — Grouped Bar", title),
      rationale: _t("Period × category side-by-side comparison."),
      definition: barChart(title, sourceByCat, { legendPosition: "top" }),
    },
    {
      title: _t("%s — Stacked Bar", title),
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
      title: _t("%s — Radar", title),
      rationale: _t("Shape/profile comparison across metrics for each entity."),
      definition: radarChart(title, source, { legendPosition: "top" }),
    },
    {
      title: _t("%s — Horizontal Bar", title),
      rationale: _t("Side-by-side per entity — works well for long labels."),
      definition: barChart(title, source, { horizontal: true, legendPosition: "top" }),
    },
    {
      title: _t("%s — Grouped Bar", title),
      rationale: _t("Grouped bars per entity for direct metric comparison."),
      definition: barChart(title, source, { legendPosition: "top" }),
    },
  ];

  if (numCols.length === 2) {
    suggestions.push({
      title: _t("%s — Scatter Plot", title),
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

  if (numCols.length === 3) {
    suggestions.push({
      title: _t("%s — Bubble Chart", title),
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

  return suggestions.slice(0, 5);
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
      title: _t("%s — Population Pyramid", title),
      rationale: _t("Natural fit for symmetric or opposing values per category."),
      definition: pyramidChart(title, sourceBoth),
    });
  }

  suggestions.push(
    {
      title: _t("%s — Grouped Bar", title),
      rationale: _t("Side-by-side comparison of both metrics per category."),
      definition: barChart(title, sourceBoth, { legendPosition: "top", aggregated: true }),
    },
    {
      title: _t("%s — Combo Chart", title),
      rationale: _t("Bar for the first series, line for the second — good for mixed scales."),
      definition: {
        type: "combo",
        title: { text: title },
        dataSource: sourceBoth,
        dataSetStyles: {},
        legendPosition: "top",
        humanize: true,
        aggregated: true,
      },
    }
  );

  if (!isPyramid) {
    suggestions.push({
      title: _t("%s — Stacked Bar", title),
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

  const suggestions: ChartSuggestion[] = [
    {
      title: _t("%s — Grouped Bar", title),
      rationale: _t("Side-by-side comparison of all numeric metrics."),
      definition: barChart(title, source, { legendPosition: "top" }),
    },
    {
      title: _t("%s — Multi-series Line", title),
      rationale: _t("Trend comparison across all metrics."),
      definition: lineChart(title, source, { legendPosition: "top" }),
    },
  ];

  if (cols.length <= 12) {
    suggestions.unshift({
      title: _t("%s — Radar", title),
      rationale: _t("Overall shape/profile across all metrics."),
      definition: radarChart(title, source, { legendPosition: "top" }),
    });
  }

  return suggestions.slice(0, 5);
}

/** Pattern T — Single Hierarchy column */
function chartsForSingleHierarchyColumn(col: ColumnAnalysis, getters: Getters): ChartSuggestion[] {
  const title = col.header ?? _t("Hierarchy");
  const source = rangeSource([dataset(col.zone, getters)], col.hasHeader);

  return [
    {
      title: _t("%s — Sunburst", title),
      rationale: _t("Path-based hierarchy; each segment = one level."),
      definition: sunburstChart(title, source),
    },
    {
      title: _t("%s — Treemap", title),
      rationale: _t("Proportional nested areas; count-based when no numeric column."),
      definition: treemapChart(title, source),
    },
  ];
}

/** Pattern U — Hierarchy + Number */
function chartsForHierarchyVsNumber(cols: ColumnAnalysis[], getters: Getters): ChartSuggestion[] {
  const [hierCol, numCol] = cols;
  const title = numCol.header
    ? _t("%s by %s", numCol.header, hierCol.header ?? "Hierarchy")
    : _t("Hierarchical breakdown");
  const source = rangeSource(
    [dataset(hierCol.zone, getters)],
    numCol.hasHeader,
    getUnboundRange(getters, numCol.zone)
  );
  const barSource = rangeSource(
    [dataset(numCol.zone, getters)],
    numCol.hasHeader,
    getUnboundRange(getters, hierCol.zone)
  );

  return [
    {
      title: _t("%s — Sunburst", title),
      rationale: _t("Hierarchical share; leaf value = numeric column."),
      definition: sunburstChart(title, source),
    },
    {
      title: _t("%s — Treemap", title),
      rationale: _t("Proportional nested area per leaf node."),
      definition: treemapChart(title, source),
    },
    {
      title: _t("%s — Bar (leaf level)", title),
      rationale: _t("Flat comparison of leaf nodes."),
      definition: barChart(title, barSource),
    },
  ];
}

/** Fallback — when no pattern matches */
function fallback(cols: ColumnAnalysis[], getters: Getters): ChartSuggestion[] {
  if (!cols.length) {
    return [];
  }
  const hasTitle = cols.some((c) => c.hasHeader);
  const dataSets = cols.map((c, i) => dataset(c.zone, getters, String(i)));
  const title = cols[0].header ?? _t("Data");
  const source = rangeSource(dataSets, hasTitle);

  return [
    {
      title: _t("%s — Bar Chart", title),
      rationale: _t("General-purpose bar chart for selected data."),
      definition: barChart(title, source, { legendPosition: cols.length > 1 ? "top" : "none" }),
    },
    {
      title: _t("%s — Line Chart", title),
      rationale: _t("General-purpose line chart for selected data."),
      definition: lineChart(title, source, { legendPosition: cols.length > 1 ? "top" : "none" }),
    },
    {
      title: _t("%s — Pie Chart", title),
      rationale: _t("Share of total for the selected data."),
      definition: pieChart(title, source, { legendPosition: "top" }),
    },
    {
      title: _t("%s — Scatter Plot", title),
      rationale: _t("Correlation between the first two numeric columns."),
      definition: scatterChart(title, rangeSource(dataSets.slice(0, 2), hasTitle)),
    },
  ];
}

function matchPattern(cols: ColumnAnalysis[], getters: Getters): ChartSuggestion[] {
  const nonEmpty = cols.filter((c) => c.type !== "empty");
  if (!nonEmpty.length) {
    return fallback(cols, getters);
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
        return chartsForSingleDateColumn(nonEmpty[0], getters);
      case "categorical":
        return chartsForSingleCategoricalColumn(nonEmpty[0], getters);
      case "hierarchy":
        return chartsForSingleHierarchyColumn(nonEmpty[0], getters);
      case "label":
        return [
          {
            title: _t("Labels Distribution"),
            rationale: _t(
              "Shows the distribution of values across different labels. Useful for categorical data without a natural order."
            ),
            definition: barChart(
              nonEmpty[0].header ?? _t("Data"),
              rangeSource([dataset(nonEmpty[0].zone, getters)], nonEmpty[0].hasHeader)
            ),
          },
          {
            title: _t("Labels Proportion"),
            rationale: _t(
              "Shows the proportion of values across different labels. Useful for categorical data without a natural order."
            ),
            definition: pieChart(
              nonEmpty[0].header ?? _t("Data"),
              rangeSource([dataset(nonEmpty[0].zone, getters)], nonEmpty[0].hasHeader)
            ),
          },
        ];
      default:
        return fallback(nonEmpty, getters);
    }
  }

  if (numberOfColumns === 2) {
    const [a, b] = shape;
    if (a === "categorical" && b === "number") {
      return chartsForCategoricalVsNumber(nonEmpty, getters);
    }
    if (a === "date" && b === "number") {
      return chartsForDateVsNumber(nonEmpty, getters);
    }
    if (a === "number" && b === "number") {
      return chartsForNumberVsNumber(nonEmpty, getters);
    }
    if (a === "categorical" && b === "percentage") {
      return chartsForCategoricalVsPercentage(nonEmpty, getters);
    }
    if (a === "date" && b === "percentage") {
      return chartsForDateVsPercentage(nonEmpty, getters);
    }
    if (a === "label" && b === "number") {
      return chartsForLabelVsNumber(nonEmpty, getters);
    }
    if (a === "categorical" && b === "categorical") {
      return chartsForCategoricalVsCategorical(nonEmpty, getters);
    }
    if (a === "hierarchy" && b === "number") {
      return chartsForHierarchyVsNumber(nonEmpty, getters);
    }
    if (a === "label" && b === "percentage") {
      return chartsForCategoricalVsPercentage(nonEmpty, getters);
    }
  }

  if (numberOfColumns === 3) {
    const [a, b, c] = shape;
    if (a === "categorical" && b === "categorical" && c === "number") {
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

  return fallback(nonEmpty, getters);
}

/**
 * Analyzes the selected zones and returns an ordered list of chart suggestions.
 * The first suggestion is the primary recommendation.
 */
export function getChartSuggestions(zones: Zone[], getters: Getters): ChartSuggestion[] {
  const allCols = analyzeColumns(zones, getters);
  return matchPattern(allCols, getters);
}
