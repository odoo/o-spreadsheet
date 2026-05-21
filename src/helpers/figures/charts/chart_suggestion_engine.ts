import {
  DEFAULT_GAUGE_LOWER_COLOR,
  DEFAULT_GAUGE_MIDDLE_COLOR,
  DEFAULT_GAUGE_UPPER_COLOR,
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { _t } from "../../../translation";
import { CellValueType, EvaluatedCell } from "../../../types/cells";
import { BarChartDefinition } from "../../../types/chart/bar_chart";
import { ChartDefinition, ChartRangeDataSource, SuggestedChart } from "../../../types/chart/chart";
import { GaugeChartDefinition } from "../../../types/chart/gauge_chart";
import { LineChartDefinition } from "../../../types/chart/line_chart";
import { Getters } from "../../../types/getters";
import { Zone } from "../../../types/misc";
import { toXC } from "../../coordinates";
import { isDateTimeFormat } from "../../format/format";
import { getZonesByColumns, zoneToXc } from "../../zones";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtendedColumnType =
  | "number"
  | "percentage"
  | "date"
  | "categorical"
  | "label"
  | "hierarchy"
  | "boolean"
  | "empty";

interface ColumnInfo {
  zone: Zone;
  type: ExtendedColumnType;
  header: string | undefined;
  /** Number of non-empty data rows, excluding header */
  rowCount: number;
  /** Number of unique non-empty values (meaningful for categorical/label/hierarchy) */
  uniqueCount: number;
}

// ─── Default configs ──────────────────────────────────────────────────────────

const DEFAULT_BAR_CHART_CONFIG: BarChartDefinition<string> = {
  type: "bar",
  title: {},
  dataSource: { type: "range", dataSets: [], dataSetsHaveTitle: false },
  dataSetStyles: {},
  legendPosition: "none",
  stacked: false,
  humanize: true,
};

const DEFAULT_LINE_CHART_CONFIG: LineChartDefinition<string> = {
  type: "line",
  title: {},
  dataSource: { type: "range", dataSets: [], dataSetsHaveTitle: false },
  dataSetStyles: {},
  legendPosition: "none",
  stacked: false,
  cumulative: false,
  labelsAsText: false,
  humanize: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUnboundRange(getters: Getters, zone: Zone): string {
  return zoneToXc(getters.getUnboundedZone(getters.getActiveSheetId(), zone));
}

const HIERARCHY_SEPARATORS = [" > ", " → ", " / ", " - ", "\\"];

function detectHierarchy(values: string[]): boolean {
  if (values.length < 2) {
    return false;
  }
  for (const sep of HIERARCHY_SEPARATORS) {
    const withSep = values.filter((v) => v.includes(sep));
    if (withSep.length / values.length < 0.7) {
      continue;
    }
    const depths = new Set(withSep.map((v) => v.split(sep).length));
    if (depths.size >= 2) {
      return true;
    }
  }
  return false;
}

function hasAtMostTwoDecimals(v: number): boolean {
  return Math.abs(v - Math.round(v * 100) / 100) < 1e-10;
}

/**
 * Detect the extended column type for a set of evaluated cells.
 * When the first cell looks like a header (text, while rest has numbers/dates),
 * it is stripped before computing categorical/label statistics.
 */
function detectExtendedColumnType(cells: EvaluatedCell[]): ExtendedColumnType {
  if (!cells.length) {
    return "empty";
  }

  const counts: Record<string, number> = {
    number: 0,
    text: 0,
    date: 0,
    percentage: 0,
    boolean: 0,
  };

  for (const cell of cells) {
    if (cell.type === CellValueType.number) {
      if (cell.format && isDateTimeFormat(cell.format)) {
        counts.date++;
      } else if (cell.format?.includes("%")) {
        counts.percentage++;
      } else {
        counts.number++;
      }
    } else if (cell.type === CellValueType.text) {
      counts.text++;
    } else if (cell.type === CellValueType.boolean) {
      counts.boolean++;
    }
  }

  const dominant = (Object.keys(counts) as (keyof typeof counts)[]).reduce((a, b) =>
    counts[a] >= counts[b] ? a : b
  );

  const dominantCount = counts[dominant];
  if (dominantCount === 0) {
    return "empty";
  }

  if (dominant === "boolean") {
    return "boolean";
  }

  // Not predominantly text → use numeric type
  if (dominant !== "text") {
    // Secondary check: number values in [0, 1] with ≤ 2 decimal places → percentage
    if (dominant === "number") {
      const numericCells = cells.filter(
        (c) =>
          c.type === CellValueType.number &&
          !(c.format && isDateTimeFormat(c.format)) &&
          !c.format?.includes("%")
      );
      if (
        numericCells.length >= 2 &&
        numericCells.every((c) => {
          const v = c.value as number;
          return v >= 0 && v <= 1 && hasAtMostTwoDecimals(v);
        })
      ) {
        return "percentage";
      }
    }
    return dominant as ExtendedColumnType;
  }

  // It's text — check if first cell is a header
  const firstCell = cells[0];
  const isFirstText = firstCell.type === CellValueType.text;
  const restHasNumericOrDate =
    isFirstText &&
    cells.slice(1).some((c) => {
      if (c.type !== CellValueType.number) {
        return false;
      }
      return true;
    });

  const dataCells = isFirstText && restHasNumericOrDate ? cells.slice(1) : cells;
  const textValues = dataCells
    .filter((c) => c.type === CellValueType.text)
    .map((c) => String(c.value).trim())
    .filter((v) => v.length > 0);

  if (textValues.length === 0) {
    return "empty";
  }

  // Hierarchy detection
  if (detectHierarchy(textValues)) {
    return "hierarchy";
  }

  // Categorical vs label
  const uniqueCount = new Set(textValues).size;
  const uniqueRatio = uniqueCount / textValues.length;
  if (uniqueRatio < 0.5 && uniqueCount <= 20) {
    return "categorical";
  }
  return "label";
}

/**
 * Try to extract a header string from the first cell of the zone (if it's text).
 */
function getColumnHeader(getters: Getters, zone: Zone): string | undefined {
  const cell = getters.getEvaluatedCell({
    sheetId: getters.getActiveSheetId(),
    col: zone.left,
    row: zone.top,
  });
  if (cell.type === CellValueType.text && cell.value) {
    return String(cell.value);
  }
  return undefined;
}

function isDatasetTitled(getters: Getters, zone: Zone): boolean {
  const titleCell = getters.getEvaluatedCell({
    sheetId: getters.getActiveSheetId(),
    col: zone.left,
    row: zone.top,
  });
  return ![CellValueType.number, CellValueType.empty].includes(titleCell.type);
}

function categorizeColumns(zones: Zone[], getters: Getters): ColumnInfo[] {
  const sheetId = getters.getActiveSheetId();
  const columns: ColumnInfo[] = [];
  for (const zone of getZonesByColumns(zones)) {
    const cells = getters.getEvaluatedCellsInZone(sheetId, zone);
    const header = getColumnHeader(getters, zone);
    const type = detectExtendedColumnType(cells);
    // Only strip header from data when the rest of the column has numeric values.
    // For all-text columns (label/categorical/hierarchy), the first cell may be a
    // column name in the context of a multi-column table but the rows following it
    // are also text, so we keep all cells for rowCount/uniqueCount calculations.
    const hasRealHeader =
      header !== undefined && cells.slice(1).some((c) => c.type === CellValueType.number);
    const dataCells = hasRealHeader ? cells.slice(1) : cells;
    const nonEmptyCells = dataCells.filter((c) => c.type !== CellValueType.empty);
    const rowCount = nonEmptyCells.length;
    const textValues = nonEmptyCells
      .filter((c) => c.type === CellValueType.text)
      .map((c) => String(c.value).trim());
    const uniqueCount = new Set(
      textValues.length > 0 ? textValues : nonEmptyCells.map((c) => String(c.value))
    ).size;
    columns.push({ zone, type, header, rowCount, uniqueCount });
  }
  return columns;
}

function makeRangeDataSource(
  getters: Getters,
  dataCols: ColumnInfo[],
  labelCol: ColumnInfo | undefined
): ChartRangeDataSource<string> {
  const dataSets = dataCols.map(({ zone }, i) => ({
    dataRange: getUnboundRange(getters, zone),
    dataSetId: i.toString(),
  }));
  const dataSetsHaveTitle = dataCols.some((c) => isDatasetTitled(getters, c.zone));
  return {
    type: "range",
    dataSets,
    dataSetsHaveTitle,
    ...(labelCol ? { labelRange: getUnboundRange(getters, labelCol.zone) } : {}),
  };
}

/**
 * Compute the maximum hierarchy depth for a zone (number of path segments in the deepest value).
 * Used to suppress sunburst/treemap when the hierarchy is too deep (> 3 levels per plan Section 5).
 */
function getMaxHierarchyDepth(getters: Getters, zone: Zone): number {
  const sheetId = getters.getActiveSheetId();
  const cells = getters.getEvaluatedCellsInZone(sheetId, zone);
  const textValues = cells
    .filter((c) => c.type === CellValueType.text && c.value)
    .map((c) => String(c.value));
  if (textValues.length === 0) {
    return 1;
  }
  let maxDepth = 1;
  for (const sep of HIERARCHY_SEPARATORS) {
    const withSep = textValues.filter((v) => v.includes(sep));
    if (withSep.length / textValues.length >= 0.7) {
      for (const v of withSep) {
        const depth = v.split(sep).length;
        if (depth > maxDepth) {
          maxDepth = depth;
        }
      }
      break;
    }
  }
  return maxDepth;
}

/**
 * Compute the min and max numeric values from a zone, used for Gauge suggestions.
 */
function getColumnNumericRange(getters: Getters, zone: Zone): { min: number; max: number } | null {
  const cells = getters.getEvaluatedCellsInZone(getters.getActiveSheetId(), zone);
  let min = Infinity;
  let max = -Infinity;
  for (const cell of cells) {
    if (cell.type === CellValueType.number) {
      const v = cell.value as number;
      if (v < min) {
        min = v;
      }
      if (v > max) {
        max = v;
      }
    }
  }
  return isFinite(min) ? { min, max } : null;
}

/**
 * Check if a column has predominantly negative values (used for population pyramid detection).
 */
function hasPredomNegativeValues(getters: Getters, zone: Zone): boolean {
  const cells = getters.getEvaluatedCellsInZone(getters.getActiveSheetId(), zone);
  const numbers = cells
    .filter((c) => c.type === CellValueType.number)
    .map((c) => c.value as number);
  if (numbers.length === 0) {
    return false;
  }
  return numbers.filter((n) => n < 0).length / numbers.length > 0.5;
}

const PYRAMID_ANTONYM_PAIRS: [string, string][] = [
  ["male", "female"],
  ["man", "woman"],
  ["boy", "girl"],
  ["before", "after"],
  ["import", "export"],
  ["positive", "negative"],
];

function isPyramidPair(header0: string | undefined, header1: string | undefined): boolean {
  if (!header0 || !header1) {
    return false;
  }
  const h0 = header0.toLowerCase();
  const h1 = header1.toLowerCase();
  return PYRAMID_ANTONYM_PAIRS.some(
    ([a, b]) => (h0.includes(a) && h1.includes(b)) || (h0.includes(b) && h1.includes(a))
  );
}

// ─── Pattern builders ─────────────────────────────────────────────────────────

function buildScorecard(col: ColumnInfo, getters: Getters): ChartDefinition<string> | null {
  const zone = col.zone;
  if (zone.bottom <= zone.top) {
    return null;
  } // need at least 2 rows
  const keyValue = toXC(zone.left, zone.bottom);
  const baseline = toXC(zone.left, zone.bottom - 1);
  return {
    type: "scorecard",
    title: {},
    keyValue,
    baseline,
    baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
    baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
    baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  };
}

function buildGauge(
  col: ColumnInfo,
  getters: Getters,
  rangeMin: string,
  rangeMax: string
): GaugeChartDefinition<string> {
  const zone = col.zone;
  const lastCell = toXC(zone.left, zone.bottom);
  return {
    type: "gauge",
    title: col.header ? { text: col.header } : {},
    dataRange: lastCell,
    sectionRule: {
      colors: {
        lowerColor: DEFAULT_GAUGE_LOWER_COLOR,
        middleColor: DEFAULT_GAUGE_MIDDLE_COLOR,
        upperColor: DEFAULT_GAUGE_UPPER_COLOR,
      },
      rangeMin,
      rangeMax,
      lowerInflectionPoint: {
        type: "percentage",
        value: "33",
        operator: "<=",
      },
      upperInflectionPoint: {
        type: "percentage",
        value: "66",
        operator: "<=",
      },
    },
  };
}

// ─── Pattern A: [number] ──────────────────────────────────────────────────────
function patternA(col: ColumnInfo, getters: Getters): SuggestedChart[] {
  const label = col.header ?? _t("Values");
  const dataSource = makeRangeDataSource(getters, [col], undefined);
  const suggestions: SuggestedChart[] = [];

  const scorecard = buildScorecard(col, getters);
  if (scorecard) {
    suggestions.push({
      title: label,
      description: _t("Show the latest value"),
      definition: scorecard,
    });
  }

  const numRange = getColumnNumericRange(getters, col.zone);
  if (numRange) {
    suggestions.push({
      title: label,
      description: _t("Show the latest value on a gauge"),
      definition: buildGauge(col, getters, String(numRange.min), String(numRange.max)),
    });
  }

  const lineDef: ChartDefinition<string> = {
    ...DEFAULT_LINE_CHART_CONFIG,
    title: col.header ? { text: col.header } : {},
    dataSource,
  };

  suggestions.push({
    title: label,
    description: _t("Show values over time as a line"),
    definition: lineDef,
  });

  suggestions.push({
    title: label,
    description: _t("Compare values with a bar chart"),
    definition: {
      ...DEFAULT_BAR_CHART_CONFIG,
      title: col.header ? { text: col.header } : {},
      dataSource,
    },
  });

  suggestions.push({
    title: label,
    description: _t("Show values as an area chart"),
    definition: {
      ...DEFAULT_LINE_CHART_CONFIG,
      fillArea: true,
      stacked: true,
      title: col.header ? { text: col.header } : {},
      dataSource,
    },
  });

  // KPI + Trend Carousel: scorecard + line chart
  if (scorecard) {
    suggestions.push({
      title: label,
      description: _t("KPI card with trend line in a carousel"),
      definition: scorecard,
      carouselDefinitions: [scorecard, lineDef],
    });
  }

  return suggestions;
}

// ─── Pattern B: [percentage] ─────────────────────────────────────────────────
function patternB(col: ColumnInfo, getters: Getters): SuggestedChart[] {
  const label = col.header ?? _t("Percentages");
  const dataSource = makeRangeDataSource(getters, [col], undefined);
  const suggestions: SuggestedChart[] = [];

  const scorecard = buildScorecard(col, getters);
  if (scorecard) {
    suggestions.push({
      title: label,
      description: _t("Show the latest percentage"),
      definition: scorecard,
    });
  }

  const gaugeDef = buildGauge(col, getters, "0", "1");
  suggestions.push({
    title: label,
    description: _t("Show the latest percentage on a gauge"),
    definition: gaugeDef,
  });

  suggestions.push({
    title: label,
    description: _t("Compare percentages with a bar chart"),
    definition: {
      ...DEFAULT_BAR_CHART_CONFIG,
      title: col.header ? { text: col.header } : {},
      dataSource,
    },
  });

  suggestions.push({
    title: label,
    description: _t("Show the distribution as a doughnut chart"),
    definition: {
      type: "pie",
      title: col.header ? { text: col.header } : {},
      dataSource,
      dataSetStyles: {},
      legendPosition: "top",
      isDoughnut: true,
    },
  });

  // Progress Carousel: scorecard + gauge
  if (scorecard) {
    suggestions.push({
      title: label,
      description: _t("KPI card with gauge in a carousel"),
      definition: scorecard,
      carouselDefinitions: [scorecard, gaugeDef],
    });
  }

  return suggestions;
}

// ─── Pattern C: [date] ────────────────────────────────────────────────────────
function patternC(col: ColumnInfo, getters: Getters): SuggestedChart[] {
  const label = col.header ?? _t("Dates");
  const dataSource = makeRangeDataSource(getters, [col], undefined);
  return [
    {
      title: label,
      description: _t("Show dates as a line chart"),
      definition: {
        ...DEFAULT_LINE_CHART_CONFIG,
        title: col.header ? { text: col.header } : {},
        dataSource,
      },
    },
    {
      title: label,
      description: _t("Compare dates with a bar chart"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: col.header ? { text: col.header } : {},
        dataSource,
      },
    },
  ];
}

// ─── Pattern D: [categorical] ─────────────────────────────────────────────────
function patternD(col: ColumnInfo, getters: Getters): SuggestedChart[] {
  const label = col.header ?? _t("Categories");
  const dataSource: ChartRangeDataSource<string> = {
    type: "range",
    dataSets: [{ dataRange: getUnboundRange(getters, col.zone), dataSetId: "0" }],
    dataSetsHaveTitle: isDatasetTitled(getters, col.zone),
    labelRange: getUnboundRange(getters, col.zone),
  };

  const suggestions: SuggestedChart[] = [];

  // Pie: suppress if > 8 unique categories
  if (col.uniqueCount <= 8) {
    suggestions.push({
      title: label,
      description: _t("Show category distribution as a pie chart"),
      definition: {
        type: "pie",
        title: col.header ? { text: col.header } : {},
        dataSource,
        dataSetStyles: {},
        aggregated: true,
        legendPosition: "top",
      },
    });

    suggestions.push({
      title: label,
      description: _t("Show category distribution as a doughnut chart"),
      definition: {
        type: "pie",
        title: col.header ? { text: col.header } : {},
        dataSource,
        dataSetStyles: {},
        aggregated: true,
        legendPosition: "top",
        isDoughnut: true,
      },
    });
  }

  suggestions.push({
    title: label,
    description: _t("Compare category counts with a bar chart"),
    definition: {
      ...DEFAULT_BAR_CHART_CONFIG,
      title: col.header ? { text: col.header } : {},
      dataSource,
      aggregated: true,
    },
  });

  // Funnel: suppress if > 10 rows
  if (col.rowCount <= 10) {
    suggestions.push({
      title: label,
      description: _t("Show category counts as a funnel"),
      definition: {
        type: "funnel",
        title: col.header ? { text: col.header } : {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "none",
        aggregated: true,
        humanize: true,
      },
    });
  }

  suggestions.push({
    title: label,
    description: _t("Show category distribution as a treemap"),
    definition: {
      type: "treemap",
      title: col.header ? { text: col.header } : {},
      dataSource,
      dataSetStyles: {},
      legendPosition: "none",
    },
  });

  return suggestions;
}

// ─── Pattern F: [categorical, number] ─────────────────────────────────────────
function patternF(catCol: ColumnInfo, numCol: ColumnInfo, getters: Getters): SuggestedChart[] {
  const catLabel = catCol.header ?? _t("Categories");
  const numLabel = numCol.header ?? _t("Values");
  const dataSource = makeRangeDataSource(getters, [numCol], catCol);

  const suggestions: SuggestedChart[] = [];

  suggestions.push({
    title: _t("%(num)s by %(cat)s", { num: numLabel, cat: catLabel }),
    description: _t("Compare values across categories"),
    definition: {
      ...DEFAULT_BAR_CHART_CONFIG,
      title: numCol.header ? { text: numCol.header } : {},
      dataSource,
      aggregated: true,
    },
  });

  suggestions.push({
    title: _t("%(num)s by %(cat)s", { num: numLabel, cat: catLabel }),
    description: _t("Compare values horizontally"),
    definition: {
      ...DEFAULT_BAR_CHART_CONFIG,
      title: numCol.header ? { text: numCol.header } : {},
      dataSource,
      horizontal: true,
      aggregated: true,
    },
  });

  // Pie: suppress if > 8 unique categories
  if (catCol.uniqueCount <= 8) {
    suggestions.push({
      title: _t("%(num)s by %(cat)s", { num: numLabel, cat: catLabel }),
      description: _t("Show proportions as a pie chart"),
      definition: {
        type: "pie",
        title: numCol.header ? { text: numCol.header } : {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "top",
        aggregated: true,
      },
    });
  }

  suggestions.push({
    title: _t("%(num)s by %(cat)s", { num: numLabel, cat: catLabel }),
    description: _t("Show proportions as a treemap"),
    definition: {
      type: "treemap",
      title: numCol.header ? { text: numCol.header } : {},
      dataSource,
      dataSetStyles: {},
      legendPosition: "none",
    },
  });

  // Funnel: suppress if rowCount > 10
  if (catCol.rowCount <= 10) {
    suggestions.push({
      title: _t("%(num)s by %(cat)s", { num: numLabel, cat: catLabel }),
      description: _t("Show values as a funnel chart"),
      definition: {
        type: "funnel",
        title: numCol.header ? { text: numCol.header } : {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "none",
        aggregated: true,
        humanize: true,
      },
    });
  }

  return suggestions;
}

// ─── Pattern G: [date, number] ────────────────────────────────────────────────
function patternG(dateCol: ColumnInfo, numCol: ColumnInfo, getters: Getters): SuggestedChart[] {
  const dateLabel = dateCol.header ?? _t("Date");
  const numLabel = numCol.header ?? _t("Values");
  const dataSource = makeRangeDataSource(getters, [numCol], dateCol);

  const lineDef: ChartDefinition<string> = {
    ...DEFAULT_LINE_CHART_CONFIG,
    title: numCol.header ? { text: numCol.header } : {},
    dataSource,
  };

  const suggestions: SuggestedChart[] = [
    {
      title: _t("%(num)s over %(date)s", { num: numLabel, date: dateLabel }),
      description: _t("Show values over time as a line"),
      definition: lineDef,
    },
    {
      title: _t("%(num)s over %(date)s", { num: numLabel, date: dateLabel }),
      description: _t("Show area under the curve over time"),
      definition: {
        ...DEFAULT_LINE_CHART_CONFIG,
        fillArea: true,
        stacked: true,
        title: numCol.header ? { text: numCol.header } : {},
        dataSource,
      },
    },
    {
      title: _t("%(num)s over %(date)s", { num: numLabel, date: dateLabel }),
      description: _t("Compare values by time period with a bar chart"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: numCol.header ? { text: numCol.header } : {},
        dataSource,
      },
    },
  ];

  // Calendar heatmap: suggest when date range is available
  if (dateCol.rowCount >= 7) {
    suggestions.push({
      title: _t("%(num)s over %(date)s", { num: numLabel, date: dateLabel }),
      description: _t("Show values as a calendar heatmap"),
      definition: {
        type: "calendar",
        title: numCol.header ? { text: numCol.header } : {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "none",
        horizontalGroupBy: "day_of_week",
        verticalGroupBy: "month_number",
      },
    });
  }

  // KPI + Trend Carousel: scorecard (last value vs previous) + line chart
  const scorecard = buildScorecard(numCol, getters);
  if (scorecard) {
    suggestions.push({
      title: _t("%(num)s over %(date)s", { num: numLabel, date: dateLabel }),
      description: _t("KPI card with trend line in a carousel"),
      definition: scorecard,
      carouselDefinitions: [scorecard, lineDef],
    });
  }

  return suggestions;
}

// ─── Pattern H: [number, number] ──────────────────────────────────────────────
function patternH(
  col0: ColumnInfo,
  col1: ColumnInfo,
  getters: Getters,
  labelCol?: ColumnInfo
): SuggestedChart[] {
  const label0 = col0.header ?? _t("X");
  const label1 = col1.header ?? _t("Y");
  const rowCount = Math.max(col0.rowCount, col1.rowCount);

  const suggestions: SuggestedChart[] = [
    {
      title: _t("%(a)s vs %(b)s", { a: label1, b: label0 }),
      description: _t("Show the relationship between two numeric series"),
      definition: {
        type: "scatter",
        title: {},
        dataSource: {
          type: "range",
          dataSets: [{ dataRange: getUnboundRange(getters, col1.zone), dataSetId: "0" }],
          labelRange: getUnboundRange(getters, col0.zone),
          dataSetsHaveTitle: isDatasetTitled(getters, col1.zone),
        },
        dataSetStyles: {},
        labelsAsText: false,
        legendPosition: "none",
      },
    },
    {
      title: _t("%(a)s and %(b)s", { a: label0, b: label1 }),
      description: _t("Compare two numeric series side by side"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: {},
        dataSource: makeRangeDataSource(getters, [col0, col1], labelCol),
        legendPosition: "top",
      },
    },
    {
      title: _t("%(a)s and %(b)s", { a: label0, b: label1 }),
      description: _t("Show two numeric series as a combo chart"),
      definition: {
        type: "combo",
        title: {},
        dataSource: makeRangeDataSource(getters, [col0, col1], labelCol),
        dataSetStyles: {},
        legendPosition: "top",
      },
    },
  ];

  // Stacked area
  suggestions.push({
    title: _t("%(a)s and %(b)s", { a: label0, b: label1 }),
    description: _t("Show both series as a stacked area"),
    definition: {
      ...DEFAULT_LINE_CHART_CONFIG,
      fillArea: true,
      stacked: true,
      title: {},
      dataSource: makeRangeDataSource(getters, [col0, col1], labelCol),
      legendPosition: "top",
    },
  });

  // Radar: suppress if > 12 rows
  if (rowCount <= 12) {
    suggestions.push({
      title: _t("%(a)s and %(b)s", { a: label0, b: label1 }),
      description: _t("Compare two numeric series on a radar chart"),
      definition: {
        type: "radar",
        title: {},
        dataSource: makeRangeDataSource(getters, [col0, col1], labelCol),
        dataSetStyles: {},
        legendPosition: "top",
        stacked: false,
      },
    });
  }

  return suggestions;
}

// ─── Pattern I: [categorical, percentage] ────────────────────────────────────
function patternI(catCol: ColumnInfo, pctCol: ColumnInfo, getters: Getters): SuggestedChart[] {
  const catLabel = catCol.header ?? _t("Categories");
  const pctLabel = pctCol.header ?? _t("Percentage");
  const dataSource = makeRangeDataSource(getters, [pctCol], catCol);
  const rowCount = catCol.rowCount;

  const suggestions: SuggestedChart[] = [
    {
      title: _t("%(pct)s by %(cat)s", { pct: pctLabel, cat: catLabel }),
      description: _t("Compare percentages horizontally"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: pctCol.header ? { text: pctCol.header } : {},
        dataSource,
        horizontal: true,
        aggregated: true,
      },
    },
    {
      title: _t("%(pct)s by %(cat)s", { pct: pctLabel, cat: catLabel }),
      description: _t("Compare percentages with a bar chart"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: pctCol.header ? { text: pctCol.header } : {},
        dataSource,
        aggregated: true,
      },
    },
  ];

  // Radar: suppress if > 12 rows
  if (rowCount <= 12) {
    suggestions.push({
      title: _t("%(pct)s by %(cat)s", { pct: pctLabel, cat: catLabel }),
      description: _t("Compare percentages on a radar chart"),
      definition: {
        type: "radar",
        title: {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "none",
        stacked: false,
        aggregated: true,
      },
    });
  }

  // Pie: suppress if > 8 unique categories
  if (catCol.uniqueCount <= 8) {
    suggestions.push({
      title: _t("%(pct)s by %(cat)s", { pct: pctLabel, cat: catLabel }),
      description: _t("Show percentage distribution as a pie chart"),
      definition: {
        type: "pie",
        title: pctCol.header ? { text: pctCol.header } : {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "top",
        aggregated: true,
      },
    });
  }

  return suggestions;
}

// ─── Pattern J: [date, percentage] ───────────────────────────────────────────
function patternJ(dateCol: ColumnInfo, pctCol: ColumnInfo, getters: Getters): SuggestedChart[] {
  const dateLabel = dateCol.header ?? _t("Date");
  const pctLabel = pctCol.header ?? _t("Percentage");
  const dataSource = makeRangeDataSource(getters, [pctCol], dateCol);

  const lineDef: ChartDefinition<string> = {
    ...DEFAULT_LINE_CHART_CONFIG,
    title: pctCol.header ? { text: pctCol.header } : {},
    dataSource,
  };

  const suggestions: SuggestedChart[] = [
    {
      title: _t("%(pct)s over %(date)s", { pct: pctLabel, date: dateLabel }),
      description: _t("Show percentages over time as a line"),
      definition: lineDef,
    },
    {
      title: _t("%(pct)s over %(date)s", { pct: pctLabel, date: dateLabel }),
      description: _t("Show percentage area over time"),
      definition: {
        ...DEFAULT_LINE_CHART_CONFIG,
        fillArea: true,
        stacked: true,
        title: pctCol.header ? { text: pctCol.header } : {},
        dataSource,
      },
    },
    {
      title: _t("%(pct)s over %(date)s", { pct: pctLabel, date: dateLabel }),
      description: _t("Compare percentages by time period"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: pctCol.header ? { text: pctCol.header } : {},
        dataSource,
      },
    },
  ];

  // KPI + Trend Carousel: scorecard (last % + vs previous) + line chart
  const scorecard = buildScorecard(pctCol, getters);
  if (scorecard) {
    suggestions.push({
      title: _t("%(pct)s over %(date)s", { pct: pctLabel, date: dateLabel }),
      description: _t("KPI card with trend line in a carousel"),
      definition: scorecard,
      carouselDefinitions: [scorecard, lineDef],
    });
  }

  return suggestions;
}

// ─── Pattern K: [label, number] ───────────────────────────────────────────────
function patternK(labelCol: ColumnInfo, numCol: ColumnInfo, getters: Getters): SuggestedChart[] {
  const lbl = labelCol.header ?? _t("Labels");
  const numLabel = numCol.header ?? _t("Values");
  const dataSource = makeRangeDataSource(getters, [numCol], labelCol);
  const rowCount = labelCol.rowCount;

  const suggestions: SuggestedChart[] = [
    {
      title: _t("%(num)s by %(lbl)s", { num: numLabel, lbl: lbl }),
      description: _t("Compare values horizontally"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: numCol.header ? { text: numCol.header } : {},
        dataSource,
        horizontal: true,
      },
    },
    {
      title: _t("%(num)s by %(lbl)s", { num: numLabel, lbl: lbl }),
      description: _t("Compare values with a bar chart"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: numCol.header ? { text: numCol.header } : {},
        dataSource,
      },
    },
  ];

  // Radar: suppress if > 12 rows
  if (rowCount <= 12) {
    suggestions.push({
      title: _t("%(num)s by %(lbl)s", { num: numLabel, lbl: lbl }),
      description: _t("Compare values on a radar chart"),
      definition: {
        type: "radar",
        title: {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "none",
        stacked: false,
      },
    });
  }

  return suggestions;
}

// ─── Pattern L: [categorical, categorical] ────────────────────────────────────
function patternL(cat0: ColumnInfo, cat1: ColumnInfo, getters: Getters): SuggestedChart[] {
  const label0 = cat0.header ?? _t("Category 1");
  const label1 = cat1.header ?? _t("Category 2");

  // For sunburst/treemap, use both columns as datasets (hierarchical)
  const hierarchicalDataSource: ChartRangeDataSource<string> = {
    type: "range",
    dataSets: [
      { dataRange: getUnboundRange(getters, cat0.zone), dataSetId: "0" },
      { dataRange: getUnboundRange(getters, cat1.zone), dataSetId: "1" },
    ],
    dataSetsHaveTitle: isDatasetTitled(getters, cat0.zone) || isDatasetTitled(getters, cat1.zone),
  };

  // Suppress sunburst/treemap if too many unique leaves (>50 per plan Section 5)
  const suppressHierarchical = cat1.uniqueCount > 50;

  const suggestions: SuggestedChart[] = [];

  if (!suppressHierarchical) {
    suggestions.push(
      {
        title: _t("%(a)s and %(b)s", { a: label0, b: label1 }),
        description: _t("Show hierarchy as a sunburst chart"),
        definition: {
          type: "sunburst",
          title: {},
          dataSource: hierarchicalDataSource,
          dataSetStyles: {},
          legendPosition: "none",
        },
      },
      {
        title: _t("%(a)s and %(b)s", { a: label0, b: label1 }),
        description: _t("Show hierarchy as a treemap"),
        definition: {
          type: "treemap",
          title: {},
          dataSource: hierarchicalDataSource,
          dataSetStyles: {},
          legendPosition: "none",
        },
      }
    );
  }

  suggestions.push({
    title: _t("%(a)s counts by %(b)s", { a: label0, b: label1 }),
    description: _t("Compare category combinations with a bar chart"),
    definition: {
      ...DEFAULT_BAR_CHART_CONFIG,
      title: {},
      dataSource: makeRangeDataSource(getters, [cat1], cat0),
      aggregated: true,
      legendPosition: "top",
    },
  });

  return suggestions;
}

// ─── Pattern M: [categorical, number+] ───────────────────────────────────────
function patternM(catCol: ColumnInfo, numCols: ColumnInfo[], getters: Getters): SuggestedChart[] {
  const catLabel = catCol.header ?? _t("Categories");
  const dataSource = makeRangeDataSource(getters, numCols, catCol);
  const rowCount = catCol.rowCount;

  const groupedBarDef: ChartDefinition<string> = {
    ...DEFAULT_BAR_CHART_CONFIG,
    title: {},
    dataSource,
    aggregated: true,
    legendPosition: "top",
  };

  const suggestions: SuggestedChart[] = [
    {
      title: catLabel,
      description: _t("Compare multiple series across categories"),
      definition: groupedBarDef,
    },
    {
      title: catLabel,
      description: _t("Show stacked contributions per category"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: {},
        dataSource,
        stacked: true,
        aggregated: true,
        legendPosition: "top",
      },
    },
    {
      title: catLabel,
      description: _t("Show multiple series as lines"),
      definition: {
        ...DEFAULT_LINE_CHART_CONFIG,
        title: {},
        dataSource,
        aggregated: true,
        legendPosition: "top",
      },
    },
    {
      title: catLabel,
      description: _t("Show multiple series as a stacked area"),
      definition: {
        ...DEFAULT_LINE_CHART_CONFIG,
        fillArea: true,
        stacked: true,
        title: {},
        dataSource,
        aggregated: true,
        legendPosition: "top",
      },
    },
  ];

  // Radar: suppress if > 12 rows
  if (rowCount <= 12) {
    suggestions.push({
      title: catLabel,
      description: _t("Compare multiple metrics on a radar chart"),
      definition: {
        type: "radar",
        title: {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "top",
        stacked: false,
        aggregated: true,
      },
    });
  }

  // Overview Carousel: one scorecard per numeric column + grouped bar
  const scorecards = numCols
    .slice(0, 6)
    .map((c) => buildScorecard(c, getters))
    .filter((s): s is ChartDefinition<string> => s !== null);
  if (scorecards.length >= 2) {
    suggestions.push({
      title: catLabel,
      description: _t("KPI cards per metric with overview bar chart in a carousel"),
      definition: scorecards[0],
      carouselDefinitions: [...scorecards, groupedBarDef],
    });
  }

  return suggestions;
}

// ─── Pattern N: [date, number+] ───────────────────────────────────────────────
function patternN(dateCol: ColumnInfo, numCols: ColumnInfo[], getters: Getters): SuggestedChart[] {
  const dateLabel = dateCol.header ?? _t("Date");
  const dataSource = makeRangeDataSource(getters, numCols, dateCol);

  const multiLineDef: ChartDefinition<string> = {
    ...DEFAULT_LINE_CHART_CONFIG,
    title: {},
    dataSource,
    legendPosition: "top",
  };

  const suggestions: SuggestedChart[] = [
    {
      title: dateLabel,
      description: _t("Show multiple series over time"),
      definition: multiLineDef,
    },
    {
      title: dateLabel,
      description: _t("Show stacked area over time"),
      definition: {
        ...DEFAULT_LINE_CHART_CONFIG,
        fillArea: true,
        stacked: true,
        title: {},
        dataSource,
        legendPosition: "top",
      },
    },
    {
      title: dateLabel,
      description: _t("Compare multiple series by time period"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: {},
        dataSource,
        legendPosition: "top",
      },
    },
  ];

  // Combo chart (first series as bar, others as lines)
  if (numCols.length >= 2) {
    suggestions.push({
      title: dateLabel,
      description: _t("Show one series as bars, another as a line"),
      definition: {
        type: "combo",
        title: {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "top",
      },
    });
  }

  // KPI + Trend Carousel: one Scorecard per metric + multi-series line
  const scorecards = numCols
    .slice(0, 6)
    .map((c) => buildScorecard(c, getters))
    .filter((s): s is ChartDefinition<string> => s !== null);
  if (scorecards.length >= 1) {
    suggestions.push({
      title: dateLabel,
      description: _t("KPI cards per metric with trend chart in a carousel"),
      definition: scorecards[0],
      carouselDefinitions: [...scorecards, multiLineDef],
    });
  }

  return suggestions;
}

// ─── Pattern O: [categorical, categorical, number] ────────────────────────────
function patternO(
  cat0: ColumnInfo,
  cat1: ColumnInfo,
  numCol: ColumnInfo,
  getters: Getters
): SuggestedChart[] {
  const label0 = cat0.header ?? _t("Category 1");
  const label1 = cat1.header ?? _t("Category 2");

  const sunburstDataSource: ChartRangeDataSource<string> = {
    type: "range",
    dataSets: [
      { dataRange: getUnboundRange(getters, cat0.zone), dataSetId: "0" },
      { dataRange: getUnboundRange(getters, cat1.zone), dataSetId: "1" },
    ],
    dataSetsHaveTitle: isDatasetTitled(getters, cat0.zone) || isDatasetTitled(getters, cat1.zone),
    labelRange: getUnboundRange(getters, numCol.zone),
  };

  // Suppress sunburst/treemap if too many unique leaves (>50 per plan Section 5)
  const suppressHierarchical = cat1.uniqueCount > 50;

  const suggestions: SuggestedChart[] = [];

  if (!suppressHierarchical) {
    suggestions.push(
      {
        title: _t("%(a)s / %(b)s", { a: label0, b: label1 }),
        description: _t("Show hierarchical data as a sunburst"),
        definition: {
          type: "sunburst",
          title: {},
          dataSource: sunburstDataSource,
          dataSetStyles: {},
          legendPosition: "none",
        },
      },
      {
        title: _t("%(a)s / %(b)s", { a: label0, b: label1 }),
        description: _t("Show hierarchical data as a treemap"),
        definition: {
          type: "treemap",
          title: {},
          dataSource: sunburstDataSource,
          dataSetStyles: {},
          legendPosition: "none",
        },
      }
    );
  }

  suggestions.push(
    {
      title: _t("%(a)s / %(b)s", { a: label0, b: label1 }),
      description: _t("Compare grouped values with a bar chart"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: {},
        dataSource: makeRangeDataSource(getters, [numCol], cat0),
        aggregated: true,
        legendPosition: "top",
      },
    },
    {
      title: _t("%(a)s / %(b)s", { a: label0, b: label1 }),
      description: _t("Show stacked contributions per outer category"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: {},
        dataSource: makeRangeDataSource(getters, [numCol], cat0),
        stacked: true,
        aggregated: true,
        legendPosition: "top",
      },
    }
  );

  return suggestions;
}

// ─── Pattern P: [categorical, date, number] ───────────────────────────────────
function patternP(
  catCol: ColumnInfo,
  dateCol: ColumnInfo,
  numCol: ColumnInfo,
  getters: Getters
): SuggestedChart[] {
  const catLabel = catCol.header ?? _t("Categories");
  const dateLabel = dateCol.header ?? _t("Date");
  const numLabel = numCol.header ?? _t("Values");

  return [
    {
      title: _t("%(num)s over %(date)s by %(cat)s", {
        num: numLabel,
        date: dateLabel,
        cat: catLabel,
      }),
      description: _t("Show trends over time by category"),
      definition: {
        ...DEFAULT_LINE_CHART_CONFIG,
        title: {},
        dataSource: makeRangeDataSource(getters, [numCol], dateCol),
        legendPosition: "top",
      },
    },
    {
      title: _t("%(num)s over %(date)s by %(cat)s", {
        num: numLabel,
        date: dateLabel,
        cat: catLabel,
      }),
      description: _t("Show stacked area over time by category"),
      definition: {
        ...DEFAULT_LINE_CHART_CONFIG,
        fillArea: true,
        stacked: true,
        title: {},
        dataSource: makeRangeDataSource(getters, [numCol], dateCol),
        legendPosition: "top",
      },
    },
    {
      title: _t("%(num)s by %(cat)s", { num: numLabel, cat: catLabel }),
      description: _t("Compare values grouped by category"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: {},
        dataSource: makeRangeDataSource(getters, [numCol], catCol),
        aggregated: true,
        legendPosition: "top",
      },
    },
    {
      title: _t("%(num)s by %(cat)s", { num: numLabel, cat: catLabel }),
      description: _t("Show stacked composition by category"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: {},
        dataSource: makeRangeDataSource(getters, [numCol], catCol),
        stacked: true,
        aggregated: true,
        legendPosition: "top",
      },
    },
  ];
}

// ─── Pattern Q: [label, number+] ─────────────────────────────────────────────
function patternQ(labelCol: ColumnInfo, numCols: ColumnInfo[], getters: Getters): SuggestedChart[] {
  const lbl = labelCol.header ?? _t("Labels");
  const rowCount = labelCol.rowCount;
  const dataSource = makeRangeDataSource(getters, numCols, labelCol);

  const suggestions: SuggestedChart[] = [];

  // Radar first if row count allows
  if (rowCount <= 12) {
    suggestions.push({
      title: lbl,
      description: _t("Compare metrics per item on a radar chart"),
      definition: {
        type: "radar",
        title: {},
        dataSource,
        dataSetStyles: {},
        legendPosition: numCols.length > 1 ? "top" : "none",
        stacked: false,
      },
    });
  }

  suggestions.push({
    title: lbl,
    description: _t("Compare values horizontally"),
    definition: {
      ...DEFAULT_BAR_CHART_CONFIG,
      title: {},
      dataSource,
      horizontal: true,
      legendPosition: numCols.length > 1 ? "top" : "none",
    },
  });

  suggestions.push({
    title: lbl,
    description: _t("Compare values with a grouped bar chart"),
    definition: {
      ...DEFAULT_BAR_CHART_CONFIG,
      title: {},
      dataSource,
      legendPosition: numCols.length > 1 ? "top" : "none",
    },
  });

  // Scatter: exactly 2 numeric columns
  if (numCols.length === 2) {
    const label0 = numCols[0].header ?? _t("X");
    const label1 = numCols[1].header ?? _t("Y");
    suggestions.push({
      title: _t("%(a)s vs %(b)s", { a: label0, b: label1 }),
      description: _t("Show the relationship between two numeric series"),
      definition: {
        type: "scatter",
        title: {},
        dataSource: {
          type: "range",
          dataSets: [{ dataRange: getUnboundRange(getters, numCols[1].zone), dataSetId: "0" }],
          labelRange: getUnboundRange(getters, numCols[0].zone),
          dataSetsHaveTitle: isDatasetTitled(getters, numCols[1].zone),
        },
        dataSetStyles: {},
        labelsAsText: false,
        legendPosition: "none",
      },
    });
  }

  // Bubble: exactly 3 numeric columns
  if (numCols.length === 3) {
    suggestions.push({
      title: lbl,
      description: _t("Show three numeric dimensions as a bubble chart"),
      definition: {
        type: "bubble",
        title: {},
        xRange: getUnboundRange(getters, numCols[0].zone),
        yRanges: [getUnboundRange(getters, numCols[1].zone)],
        sizeRange: getUnboundRange(getters, numCols[2].zone),
        labelRange: getUnboundRange(getters, labelCol.zone),
        dataSetsHaveTitle: isDatasetTitled(getters, numCols[0].zone),
        labelsAsText: false,
        legendPosition: "none",
        bubbleColor: { color: "multiple" },
        verticalAxisPosition: "left",
      },
    });
  }

  return suggestions;
}

// ─── Pattern R: [categorical, number, number] — population pyramid ─────────────
function patternR(
  catCol: ColumnInfo,
  numCol0: ColumnInfo,
  numCol1: ColumnInfo,
  getters: Getters
): SuggestedChart[] {
  const catLabel = catCol.header ?? _t("Categories");
  const label0 = numCol0.header ?? _t("Series 1");
  const label1 = numCol1.header ?? _t("Series 2");
  const dataSource = makeRangeDataSource(getters, [numCol0, numCol1], catCol);

  const isPyramid =
    isPyramidPair(numCol0.header, numCol1.header) ||
    hasPredomNegativeValues(getters, numCol0.zone) ||
    hasPredomNegativeValues(getters, numCol1.zone);

  const suggestions: SuggestedChart[] = [];

  if (isPyramid) {
    suggestions.push({
      title: _t("%(a)s vs %(b)s by %(cat)s", { a: label0, b: label1, cat: catLabel }),
      description: _t("Show symmetric opposing values as a population pyramid"),
      definition: {
        type: "pyramid",
        title: {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "top",
        stacked: false,
        aggregated: true,
        humanize: true,
      },
    });
  }

  suggestions.push({
    title: catLabel,
    description: _t("Compare two series across categories"),
    definition: {
      ...DEFAULT_BAR_CHART_CONFIG,
      title: {},
      dataSource,
      aggregated: true,
      legendPosition: "top",
    },
  });

  suggestions.push({
    title: catLabel,
    description: _t("Show two series as a stacked bar chart"),
    definition: {
      ...DEFAULT_BAR_CHART_CONFIG,
      title: {},
      dataSource,
      stacked: true,
      aggregated: true,
      legendPosition: "top",
    },
  });

  suggestions.push({
    title: catLabel,
    description: _t("Show one series as bars, another as a line"),
    definition: {
      type: "combo",
      title: {},
      dataSource,
      dataSetStyles: {},
      legendPosition: "top",
      aggregated: true,
    },
  });

  return suggestions;
}

// ─── Pattern S: [number+] ────────────────────────────────────────────────────
function patternS(numCols: ColumnInfo[], getters: Getters): SuggestedChart[] {
  const dataSource = makeRangeDataSource(getters, numCols, undefined);
  const rowCount = Math.max(...numCols.map((c) => c.rowCount));

  const barDef: ChartDefinition<string> = {
    ...DEFAULT_BAR_CHART_CONFIG,
    title: {},
    dataSource,
    legendPosition: "top",
  };

  // KPI Scorecard Carousel: one scorecard per column + grouped bar (first suggestion per plan)
  const scorecards = numCols
    .slice(0, 6)
    .map((c) => buildScorecard(c, getters))
    .filter((s): s is ChartDefinition<string> => s !== null);

  const suggestions: SuggestedChart[] = [];

  if (scorecards.length >= 2) {
    suggestions.push({
      title: _t("Values"),
      description: _t("KPI cards per metric with overview bar chart in a carousel"),
      definition: scorecards[0],
      carouselDefinitions: [...scorecards, barDef],
    });
  }

  suggestions.push({
    title: _t("Values"),
    description: _t("Compare multiple numeric series with a bar chart"),
    definition: barDef,
  });

  // Radar: suppress if > 12 rows
  if (rowCount <= 12) {
    suggestions.push({
      title: _t("Values"),
      description: _t("Compare multiple series on a radar chart"),
      definition: {
        type: "radar",
        title: {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "none",
        stacked: false,
      },
    });
  }

  return suggestions;
}

// ─── Pattern T: [hierarchy] ───────────────────────────────────────────────────
function patternT(col: ColumnInfo, getters: Getters): SuggestedChart[] {
  const label = col.header ?? _t("Hierarchy");
  const dataSource: ChartRangeDataSource<string> = {
    type: "range",
    dataSets: [{ dataRange: getUnboundRange(getters, col.zone), dataSetId: "0" }],
    dataSetsHaveTitle: isDatasetTitled(getters, col.zone),
  };

  // Suppress sunburst/treemap if hierarchy is too deep (>3 levels) or too many unique leaves (>50)
  const suppressHierarchical = getMaxHierarchyDepth(getters, col.zone) > 3 || col.uniqueCount > 50;

  if (suppressHierarchical) {
    return [];
  }

  return [
    {
      title: label,
      description: _t("Show hierarchy as a sunburst chart"),
      definition: {
        type: "sunburst",
        title: col.header ? { text: col.header } : {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "none",
      },
    },
    {
      title: label,
      description: _t("Show hierarchy as a treemap"),
      definition: {
        type: "treemap",
        title: col.header ? { text: col.header } : {},
        dataSource,
        dataSetStyles: {},
        legendPosition: "none",
      },
    },
  ];
}

// ─── Pattern U: [hierarchy, number] ──────────────────────────────────────────
function patternU(hierCol: ColumnInfo, numCol: ColumnInfo, getters: Getters): SuggestedChart[] {
  const hierLabel = hierCol.header ?? _t("Hierarchy");
  const numLabel = numCol.header ?? _t("Values");
  const dataSource: ChartRangeDataSource<string> = {
    type: "range",
    dataSets: [{ dataRange: getUnboundRange(getters, hierCol.zone), dataSetId: "0" }],
    dataSetsHaveTitle: isDatasetTitled(getters, hierCol.zone),
    labelRange: getUnboundRange(getters, numCol.zone),
  };

  // Suppress sunburst/treemap if hierarchy is too deep (>3 levels) or too many leaves (>50)
  const suppressHierarchical =
    getMaxHierarchyDepth(getters, hierCol.zone) > 3 || hierCol.uniqueCount > 50;

  const suggestions: SuggestedChart[] = [];

  if (!suppressHierarchical) {
    suggestions.push(
      {
        title: _t("%(num)s in %(hier)s", { num: numLabel, hier: hierLabel }),
        description: _t("Show hierarchical values as a sunburst"),
        definition: {
          type: "sunburst",
          title: {},
          dataSource,
          dataSetStyles: {},
          legendPosition: "none",
        },
      },
      {
        title: _t("%(num)s in %(hier)s", { num: numLabel, hier: hierLabel }),
        description: _t("Show hierarchical values as a treemap"),
        definition: {
          type: "treemap",
          title: {},
          dataSource,
          dataSetStyles: {},
          legendPosition: "none",
        },
      }
    );
  }

  suggestions.push(
    {
      title: _t("%(num)s in %(hier)s (leaf level)", { num: numLabel, hier: hierLabel }),
      description: _t("Compare leaf-level values with a bar chart"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: {},
        dataSource: makeRangeDataSource(getters, [numCol], hierCol),
      },
    },
    {
      title: _t("%(num)s in %(hier)s (top level)", { num: numLabel, hier: hierLabel }),
      description: _t("Compare top-level aggregated values with a stacked bar chart"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: {},
        dataSource: makeRangeDataSource(getters, [numCol], hierCol),
        stacked: true,
        legendPosition: "top",
      },
    }
  );

  return suggestions;
}

// ─── Fallback ─────────────────────────────────────────────────────────────────
function fallback(cols: ColumnInfo[], getters: Getters): SuggestedChart[] {
  const firstNumericIdx = cols.findIndex((c) => c.type === "number" || c.type === "percentage");
  const labelIdx = firstNumericIdx > 0 ? 0 : -1;

  const numericCols =
    firstNumericIdx >= 0 ? cols.slice(firstNumericIdx) : cols.filter((c) => c.type !== "empty");
  const labelCol = labelIdx >= 0 ? cols[labelIdx] : undefined;

  const dataSource = makeRangeDataSource(getters, numericCols, labelCol);

  return [
    {
      title: _t("Chart"),
      description: _t("Show data as a bar chart"),
      definition: {
        ...DEFAULT_BAR_CHART_CONFIG,
        title: {},
        dataSource,
        legendPosition: numericCols.length > 1 ? "top" : "none",
      },
    },
    {
      title: _t("Chart"),
      description: _t("Show data as a line chart"),
      definition: {
        ...DEFAULT_LINE_CHART_CONFIG,
        title: {},
        dataSource,
        legendPosition: numericCols.length > 1 ? "top" : "none",
      },
    },
  ];
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Analyzes selected zones and returns a list of pre-configured chart suggestions.
 */
export function getSuggestedCharts(zones: Zone[], getters: Getters): SuggestedChart[] {
  const allColumns = categorizeColumns(zones, getters);
  const columns = allColumns.filter((c) => c.type !== "empty");

  if (columns.length === 0) {
    return fallback(allColumns, getters);
  }

  // ── Single column ──────────────────────────────────────────────────────────
  if (columns.length === 1) {
    const [col] = columns;
    switch (col.type) {
      case "number":
        return patternA(col, getters);
      case "percentage":
        return patternB(col, getters);
      case "date":
        return patternC(col, getters);
      case "categorical":
        return patternD(col, getters);
      case "boolean":
        return patternD(col, getters); // treat booleans like categorical
      case "hierarchy":
        return patternT(col, getters);
      case "label":
        return []; // Pattern E: no suggestions for unique label columns
      default:
        return fallback(columns, getters);
    }
  }

  // ── Two columns ────────────────────────────────────────────────────────────
  if (columns.length === 2) {
    const [c0, c1] = columns;

    if (c0.type === "categorical" && c1.type === "number") {
      return patternF(c0, c1, getters);
    }
    if (c0.type === "date" && c1.type === "number") {
      return patternG(c0, c1, getters);
    }
    if (c0.type === "number" && c1.type === "number") {
      return patternH(c0, c1, getters);
    }
    if (c0.type === "categorical" && c1.type === "percentage") {
      return patternI(c0, c1, getters);
    }
    if (c0.type === "date" && c1.type === "percentage") {
      return patternJ(c0, c1, getters);
    }
    if (c0.type === "label" && c1.type === "number") {
      return patternK(c0, c1, getters);
    }
    if (c0.type === "categorical" && c1.type === "categorical") {
      return patternL(c0, c1, getters);
    }
    if (c0.type === "hierarchy" && c1.type === "number") {
      return patternU(c0, c1, getters);
    }
    if (c0.type === "label" && c1.type === "percentage") {
      // Treat label+percentage similar to categorical+percentage but without aggregation
      return patternK(c0, c1, getters);
    }

    return fallback(columns, getters);
  }

  // ── 3+ columns ─────────────────────────────────────────────────────────────
  const [first, ...rest] = columns;

  // Pattern O: [categorical, categorical, number]
  if (
    columns.length === 3 &&
    first.type === "categorical" &&
    columns[1].type === "categorical" &&
    columns[2].type === "number"
  ) {
    return patternO(first, columns[1], columns[2], getters);
  }

  // Pattern P: [categorical, date, number]
  if (
    columns.length === 3 &&
    first.type === "categorical" &&
    columns[1].type === "date" &&
    columns[2].type === "number"
  ) {
    return patternP(first, columns[1], columns[2], getters);
  }

  // Pattern M: [categorical, number+] — with population pyramid check for exactly 2 numbers
  if (first.type === "categorical" && rest.every((c) => c.type === "number")) {
    if (columns.length === 3) {
      const isPyramid =
        isPyramidPair(columns[1].header, columns[2].header) ||
        hasPredomNegativeValues(getters, columns[1].zone) ||
        hasPredomNegativeValues(getters, columns[2].zone);
      if (isPyramid) {
        return patternR(first, columns[1], columns[2], getters);
      }
    }
    return patternM(first, rest, getters);
  }

  // Pattern N: [date, number+]
  if (first.type === "date" && rest.every((c) => c.type === "number")) {
    return patternN(first, rest, getters);
  }

  // Pattern Q: [label, number+]
  if (first.type === "label" && rest.every((c) => c.type === "number")) {
    return patternQ(first, rest, getters);
  }

  // Pattern S: [number+]
  if (columns.every((c) => c.type === "number")) {
    return patternS(columns, getters);
  }

  return fallback(columns, getters);
}
