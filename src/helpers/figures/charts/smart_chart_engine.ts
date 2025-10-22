import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { CellValueType, ChartDefinition, EvaluatedCell, Getters, Zone } from "../../../types";
import { BarChartDefinition, LineChartDefinition } from "../../../types/chart";
import { isDateTimeFormat } from "../../format/format";
import { getZoneArea, getZonesByColumns, zoneToXc } from "../../zones";

type ColumnType = "number" | "text" | "date" | "percentage" | "empty";

const DEFAULT_BAR_CHART_CONFIG: BarChartDefinition = {
  type: "bar",
  title: {},
  dataSets: [],
  legendPosition: "none",
  dataSetsHaveTitle: false,
  stacked: false,
};

const DEFAULT_LINE_CHART_CONFIG: LineChartDefinition = {
  type: "line",
  title: {},
  dataSets: [],
  legendPosition: "none",
  dataSetsHaveTitle: false,
  stacked: false,
  cumulative: false,
  labelsAsText: false,
};

interface ColumnInfo {
  zone: Zone;
  type: ColumnType;
}

function getUnboundRange(getters: Getters, zone: Zone): string {
  return zoneToXc(getters.getUnboundedZone(getters.getActiveSheetId(), zone));
}

function detectColumnType(cells: EvaluatedCell[]): ColumnType {
  if (!cells.length) {
    return "empty";
  }
  const counts = { number: 0, text: 0, date: 0, percentage: 0 };
  let max = 0;
  let detectedType: ColumnType = "empty";
  for (const cell of cells) {
    let type: ColumnType | null = null;
    if (cell.type === CellValueType.number) {
      if (cell.format && isDateTimeFormat(cell.format)) {
        type = "date";
      } else if (cell.format?.includes("%")) {
        type = "percentage";
      } else {
        type = "number";
      }
    } else if (cell.type === CellValueType.text) {
      type = "text";
    }
    if (type) {
      const newCount = ++counts[type];
      if (newCount > max) {
        max = newCount;
        detectedType = type;
      }
    }
  }
  return detectedType;
}

function categorizeColumns(zones: Zone[], getters: Getters): ColumnInfo[] {
  const columns: ColumnInfo[] = [];
  for (const zone of getZonesByColumns(zones)) {
    const cells = getters.getEvaluatedCellsInZone(getters.getActiveSheetId(), zone);
    columns.push({ zone, type: detectColumnType(cells) });
  }
  return columns;
}

function getCellStats(getters: Getters, zone: Zone) {
  const cells = getters.getEvaluatedCellsInZone(getters.getActiveSheetId(), zone);
  const values = cells.map((c) => c.value?.toString().trim() || "").filter((s) => s);
  return {
    uniqueCount: new Set(values).size,
    totalCount: values.length,
  };
}

function isDatasetTitled(getters: Getters, column: ColumnInfo): boolean {
  const titleCell = getters.getEvaluatedCell({
    sheetId: getters.getActiveSheetId(),
    col: column.zone.left,
    row: column.zone.top,
  });
  return ![CellValueType.number, CellValueType.empty].includes(titleCell.type);
}

/**
 * Builds a chart definition for a single column selection. The logic to detect the chart type is as follows:
 * - If the column contains a single cell, create a scorecard.
 * - If the column type is "percentage", create a pie chart.
 * - If the column type is "text", create a pie chart
 * - If the column type is "date", create a line chart.
 * - Otherwise, create a bar chart.
 */
function buildSingleColumnChart(column: ColumnInfo, getters: Getters): ChartDefinition {
  const { type, zone } = column;
  const sheetId = getters.getActiveSheetId();
  const dataSetsHaveTitle = isDatasetTitled(getters, column);
  const dataRange = getUnboundRange(getters, zone);
  const titleCell = getters.getEvaluatedCell({ sheetId, col: zone.left, row: zone.top });

  if (getZoneArea(zone) === 1) {
    return buildScorecard(zone, getters);
  }

  switch (type) {
    case "percentage":
      return {
        type: "pie",
        title: dataSetsHaveTitle ? { text: String(titleCell.value) } : {},
        dataSets: [{ dataRange }],
        legendPosition: "none",
        dataSetsHaveTitle,
      };

    case "text":
      const cells = getters.getEvaluatedCellsInZone(sheetId, zone);
      const titleCount = cells.reduce(
        (count, cell) => (cell.value === titleCell.value ? count + 1 : count),
        0
      );
      const hasUniqueTitle = titleCell.value !== null && titleCount === 1;
      return {
        type: "pie",
        title: hasUniqueTitle ? { text: String(titleCell.value) } : {},
        dataSets: [{ dataRange }],
        labelRange: dataRange,
        dataSetsHaveTitle: hasUniqueTitle,
        aggregated: true,
        legendPosition: "top",
      };

    case "date":
      return {
        ...DEFAULT_LINE_CHART_CONFIG,
        type: "line",
        title: dataSetsHaveTitle ? { text: String(titleCell.value) } : {},
        dataSets: [{ dataRange }],
        dataSetsHaveTitle,
      };
  }
  return {
    ...DEFAULT_BAR_CHART_CONFIG,
    title: dataSetsHaveTitle ? { text: String(titleCell.value) } : {},
    dataSets: [{ dataRange }],
    dataSetsHaveTitle,
  };
}

/**
 * Builds a chart definition for a selection of two columns. The logic to detect the chart type always consider the
 * columns left to right, and is as follows:
 * - any type + percentage columns: pie chart
 * - number + number columns: scatter chart
 * - date + number columns: line chart
 * - text + number columns: treemap if repetition in labels
 * - any other combination: bar chart
 */
function buildTwoColumnChart(columns: ColumnInfo[], getters: Getters): ChartDefinition {
  if (columns.length !== 2) {
    throw new Error("buildTwoColumnChart expects exactly two columns");
  }

  if (columns[1].type === "percentage") {
    return {
      type: "pie",
      title: {},
      dataSets: [{ dataRange: getUnboundRange(getters, columns[1].zone) }],
      labelRange: getUnboundRange(getters, columns[0].zone),
      dataSetsHaveTitle: isDatasetTitled(getters, columns[1]),
      aggregated: true,
      legendPosition: "none",
    };
  }

  if (columns[0].type === "number" && columns[1].type === "number") {
    return {
      type: "scatter",
      title: {},
      dataSets: [{ dataRange: getUnboundRange(getters, columns[1].zone) }],
      labelRange: getUnboundRange(getters, columns[0].zone),
      dataSetsHaveTitle: isDatasetTitled(getters, columns[1]),
      labelsAsText: false,
      legendPosition: "none",
    };
  }

  // TODO: Handle date + number with calendar chart when implemented (and change the docstring)
  if (columns[0].type === "date" && columns[1].type === "number") {
    return {
      ...DEFAULT_LINE_CHART_CONFIG,
      type: "line",
      dataSets: [{ dataRange: getUnboundRange(getters, columns[1].zone) }],
      labelRange: getUnboundRange(getters, columns[0].zone),
      dataSetsHaveTitle: isDatasetTitled(getters, columns[0]),
    };
  }

  if (columns[0].type === "text" && columns[1].type === "number") {
    const textColumn = columns[0];
    const numberColumn = columns[1];

    const { uniqueCount, totalCount } = getCellStats(getters, textColumn.zone);
    const dataSetsHaveTitle = isDatasetTitled(getters, numberColumn);

    if (uniqueCount !== totalCount) {
      return {
        type: "treemap",
        title: {},
        dataSets: [{ dataRange: getUnboundRange(getters, textColumn.zone) }],
        labelRange: getUnboundRange(getters, numberColumn.zone),
        dataSetsHaveTitle,
        legendPosition: "none",
      };
    }
  }

  return {
    ...DEFAULT_BAR_CHART_CONFIG,
    dataSets: [{ dataRange: getUnboundRange(getters, columns[1].zone) }],
    labelRange: getUnboundRange(getters, columns[0].zone),
    dataSetsHaveTitle: isDatasetTitled(getters, columns[1]),
  };
}

/**
 * Builds a chart definition for a selection more than two columns. The logic to detect the chart type always consider
 * the columns left to right, and is as follows:
 * - multiple text + single number/percentage columns: sunburst if 3+ text columns, treemap otherwise
 * - any type + multiple percentage columns: pie chart
 * - date + multiple number columns: line chart
 * - any other combination: bar chart
 */
function buildMultiColumnChart(columns: ColumnInfo[], getters: Getters): ChartDefinition {
  if (columns.length < 3) {
    throw new Error("buildMultiColumnChart expects at least three columns");
  }

  const dataSetsHaveTitle = columns.some(
    (col) => col.type !== "text" && isDatasetTitled(getters, col)
  );

  const lastColumn = columns[columns.length - 1];
  const columnsExceptLast = columns.slice(0, columns.length - 1);

  if (
    (lastColumn.type === "percentage" || lastColumn.type === "number") &&
    columnsExceptLast.every((col) => col.type === "text")
  ) {
    const dataSets = columnsExceptLast.map(({ zone }) => ({
      dataRange: getUnboundRange(getters, zone),
    }));
    return {
      type: columnsExceptLast.length >= 3 ? "sunburst" : "treemap",
      title: {},
      dataSets,
      labelRange: getUnboundRange(getters, lastColumn.zone),
      dataSetsHaveTitle,
      legendPosition: "none",
    };
  }

  const firstColumn = columns[0];
  const columnsExceptFirst = columns.slice(1);
  const rangesOfColumnsExceptFirst = columnsExceptFirst.map(({ zone }) => ({
    dataRange: getUnboundRange(getters, zone),
  }));

  if (columnsExceptFirst.every((col) => col.type === "percentage")) {
    return {
      type: "pie",
      title: {},
      dataSets: rangesOfColumnsExceptFirst,
      labelRange: getUnboundRange(getters, firstColumn.zone),
      dataSetsHaveTitle,
      aggregated: false,
      legendPosition: "top",
    };
  }

  if (firstColumn.type === "date" && columnsExceptFirst.every((col) => col.type === "number")) {
    return {
      ...DEFAULT_LINE_CHART_CONFIG,
      type: "line",
      dataSets: rangesOfColumnsExceptFirst,
      labelRange: getUnboundRange(getters, firstColumn.zone),
      dataSetsHaveTitle,
      legendPosition: "top",
    };
  }

  return {
    ...DEFAULT_BAR_CHART_CONFIG,
    dataSets: rangesOfColumnsExceptFirst,
    labelRange: getUnboundRange(getters, firstColumn.zone),
    dataSetsHaveTitle,
    legendPosition: "top",
  };
}

function buildScorecard(zone: Zone, getters: Getters): ChartDefinition {
  const cell = getters.getCell({
    sheetId: getters.getActiveSheetId(),
    col: zone.left,
    row: zone.top,
  });
  return {
    type: "scorecard",
    title: {},
    keyValue: getUnboundRange(getters, zone),
    background: cell?.style?.fillColor,
    baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
    baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
    baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  };
}

/**
 * Analyzes selected zones and intelligently determines the most suitable chart.
 */
export function getSmartChartDefinition(zones: Zone[], getters: Getters): ChartDefinition {
  const columns = categorizeColumns(zones, getters);

  if (columns.length === 0 || columns.every((col) => col.type === "empty")) {
    const dataSets = columns.map(({ zone }) => ({ dataRange: getUnboundRange(getters, zone) }));
    return { ...DEFAULT_BAR_CHART_CONFIG, dataSets };
  }

  const nonEmptyColumns = columns.filter((col) => col.type !== "empty");
  switch (nonEmptyColumns.length) {
    case 1:
      return buildSingleColumnChart(nonEmptyColumns[0], getters);
    case 2:
      return buildTwoColumnChart(nonEmptyColumns, getters);
    default:
      return buildMultiColumnChart(nonEmptyColumns, getters);
  }
}
