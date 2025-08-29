import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { CellValueType, ChartDefinition, EvaluatedCell, Getters, UID, Zone } from "../../../types";
import { isDateTimeFormat } from "../../format/format";
import { recomputeZones } from "../../recompute_zones";
import { getZoneArea, getZonesByColumns, zoneToXc } from "../../zones";

type ColumnType = "number" | "text" | "date" | "percentage" | "empty";

interface ColumnInfo {
  zone: Zone;
  type: ColumnType;
}
interface AnalysisCtx {
  sheetId: UID;
  getters: Getters;
  columns: Record<"number" | "text" | "date", ColumnInfo[]>;
}

const CHART_LIMITS = {
  MAX_PIE_CATEGORIES: 7,
  MAX_PIE_CATEGORIES_NO_TITLE: 6,
  MAX_RADAR_LABELS: 12,
  PERCENTAGE_THRESHOLD: 100,
  MIN_RADAR_CATEGORIES: 3,
} as const;
const CHART_DEFAULTS = {
  LEGEND_POSITION: "none" as const,
  LEGEND_POSITION_TOP: "top" as const,
  STACKED: false,
  CUMULATIVE: false,
  LABELS_AS_TEXT: false,
} as const;

function getUnboundRange(getters: Getters, sheetId: UID, zone: Zone): string {
  return zoneToXc(getters.getUnboundedZone(sheetId, zone));
}

function detectColumnType(cells: EvaluatedCell[]): ColumnType {
  if (!cells.length) return "empty";
  const typeCounts = { number: 0, text: 0, date: 0, percentage: 0 };
  for (const cell of cells) {
    if (cell.type === CellValueType.number) {
      if (cell.format && isDateTimeFormat(cell.format)) {
        typeCounts.date++;
      } else if (cell.format?.includes("%")) {
        typeCounts.percentage++;
      } else {
        typeCounts.number++;
      }
    } else if (cell.type === CellValueType.text) {
      typeCounts.text++;
    }
  }
  return (Object.entries(typeCounts) as [ColumnType, number][]).reduce(
    (max, [type, count]) => (count > max[1] ? [type, count] : max),
    ["empty", 0]
  )[0];
}

function categorizeColumns(zones: Zone[], getters: Getters, sheetId: UID): AnalysisCtx {
  const columns: Record<"number" | "text" | "date", ColumnInfo[]> = {
    number: [],
    text: [],
    date: [],
  };
  for (const zone of getZonesByColumns(zones)) {
    const cells = getters.getEvaluatedCellsInZone(sheetId, zone);
    const type = detectColumnType(cells);
    if (type !== "empty") {
      const targetType = type === "percentage" ? "number" : type;
      columns[targetType].push({ zone, type });
    }
  }
  return { sheetId, getters, columns };
}

function getCellStats(getters: Getters, sheetId: UID, zone: Zone) {
  const cells = getters.getEvaluatedCellsInZone(sheetId, zone);
  const uniqueValues = new Set<string>();
  let totalCount = 0,
    percentageSum = 0;
  cells.forEach(({ value }) => {
    const str = value?.toString().trim();
    if (!str) return;

    uniqueValues.add(str);
    totalCount++;

    const num = Number(value);
    if (!isNaN(num)) percentageSum += Math.abs(num) * 100;
  });
  return {
    uniqueCount: uniqueValues.size,
    totalCount,
    percentageSum,
  };
}

function hasDatasetTitle(ctx: AnalysisCtx, column: ColumnInfo): boolean {
  const titleCell = ctx.getters.getEvaluatedCell({
    sheetId: ctx.sheetId,
    col: column.zone.left,
    row: column.zone.top,
  });
  return ![CellValueType.number, CellValueType.empty].includes(titleCell.type);
}

function createBaseChart(
  type: string,
  dataSets: any[],
  options: Partial<ChartDefinition> = {}
): ChartDefinition {
  return {
    type,
    title: {},
    dataSets,
    legendPosition: CHART_DEFAULTS.LEGEND_POSITION,
    ...options,
  } as ChartDefinition;
}

function buildSingleColumnChart(column: ColumnInfo, ctx: AnalysisCtx): ChartDefinition {
  const { type, zone } = column;
  const { sheetId, getters } = ctx;
  const dataRange = getUnboundRange(getters, sheetId, zone);
  const dataSetsHaveTitle = hasDatasetTitle(ctx, column);
  const titleCell = getters.getEvaluatedCell({ sheetId, col: zone.left, row: zone.top });

  switch (type) {
    case "percentage":
      const { percentageSum } = getCellStats(getters, sheetId, zone);
      return createBaseChart("pie", [{ dataRange }], {
        title: dataSetsHaveTitle ? { text: String(titleCell.value) } : {},
        dataSetsHaveTitle,
        isDoughnut: percentageSum < CHART_LIMITS.PERCENTAGE_THRESHOLD,
      });

    case "text":
      const cells = getters.getEvaluatedCellsInZone(sheetId, zone);
      const titleCount = cells.reduce(
        (count, cell) => (cell.value === titleCell.value ? count + 1 : count),
        0
      );
      const hasUniqueTitle = titleCell.value !== null && titleCount === 1;
      return createBaseChart("pie", [{ dataRange }], {
        title: hasUniqueTitle ? { text: String(titleCell.value) } : {},
        labelRange: dataRange,
        dataSetsHaveTitle: hasUniqueTitle,
        isDoughnut: false,
        aggregated: true,
        legendPosition: CHART_DEFAULTS.LEGEND_POSITION_TOP,
      });

    // TODO: Handle date column with matrix chart when matrix chart is supported
    case "date":
      return createBaseChart("line", [{ dataRange }], {
        labelRange: dataRange,
        dataSetsHaveTitle,
        cumulative: CHART_DEFAULTS.CUMULATIVE,
        labelsAsText: CHART_DEFAULTS.LABELS_AS_TEXT,
      });
  }
  return createBaseChart("bar", [{ dataRange }], { dataSetsHaveTitle });
}

function buildTwoColumnChart(ctx: AnalysisCtx): ChartDefinition {
  const { sheetId, getters, columns } = ctx;
  const { number: numberColumns, text: textColumns, date: dateColumns } = columns;

  if (numberColumns.length === 2) {
    return createBaseChart(
      "scatter",
      [{ dataRange: getUnboundRange(getters, sheetId, numberColumns[1].zone) }],
      {
        labelRange: getUnboundRange(getters, sheetId, numberColumns[0].zone),
        dataSetsHaveTitle: hasDatasetTitle(ctx, numberColumns[1]),
        labelsAsText: CHART_DEFAULTS.LABELS_AS_TEXT,
      }
    );
  }

  // TODO: Handle date + number with matrix chart when matrix chart is supported
  if (dateColumns.length === 1 && numberColumns.length === 1) {
    return createBaseChart(
      "line",
      [{ dataRange: getUnboundRange(getters, sheetId, numberColumns[0].zone) }],
      {
        labelRange: getUnboundRange(getters, sheetId, dateColumns[0].zone),
        dataSetsHaveTitle: hasDatasetTitle(ctx, numberColumns[0]),
        aggregated: false,
        cumulative: CHART_DEFAULTS.CUMULATIVE,
        labelsAsText: CHART_DEFAULTS.LABELS_AS_TEXT,
      }
    );
  }

  if (textColumns.length === 1 && numberColumns.length === 1) {
    const [textColumn] = textColumns;
    const [numberColumn] = numberColumns;
    const { uniqueCount, totalCount } = getCellStats(getters, sheetId, textColumn.zone);
    const dataSetsHaveTitle = hasDatasetTitle(ctx, numberColumn);
    const maxCategories = dataSetsHaveTitle
      ? CHART_LIMITS.MAX_PIE_CATEGORIES
      : CHART_LIMITS.MAX_PIE_CATEGORIES_NO_TITLE;
    const labelRange = getUnboundRange(getters, sheetId, textColumn.zone);
    const dataRange = getUnboundRange(getters, sheetId, numberColumn.zone);

    if (uniqueCount <= maxCategories) {
      const { percentageSum } = getCellStats(getters, sheetId, numberColumn.zone);
      return createBaseChart("pie", [{ dataRange }], {
        labelRange,
        dataSetsHaveTitle,
        isDoughnut:
          numberColumn.type === "percentage" && percentageSum < CHART_LIMITS.PERCENTAGE_THRESHOLD,
        aggregated: true,
        legendPosition: CHART_DEFAULTS.LEGEND_POSITION_TOP,
      });
    }

    // Use treemap when categories repeat, as pie chart would be cluttered
    if (uniqueCount !== totalCount) {
      return createBaseChart("treemap", [{ dataRange: labelRange }], {
        labelRange: dataRange,
        dataSetsHaveTitle,
      });
    }

    return createBaseChart("bar", [{ dataRange }], {
      labelRange,
      dataSetsHaveTitle,
    });
  }

  const labelColumn = textColumns[0] || dateColumns[0] || numberColumns[0];
  const dataColumn = numberColumns[0] || textColumns[0] || dateColumns[0];
  return createBaseChart(
    "line",
    [{ dataRange: getUnboundRange(getters, sheetId, dataColumn.zone) }],
    {
      labelRange: getUnboundRange(getters, sheetId, labelColumn.zone),
      dataSetsHaveTitle: hasDatasetTitle(ctx, dataColumn),
      cumulative: CHART_DEFAULTS.CUMULATIVE,
      labelsAsText: true,
    }
  );
}

function buildMultiColumnChart(ctx: AnalysisCtx): ChartDefinition {
  const { sheetId, getters, columns } = ctx;
  const { number: numberColumns, text: textColumns, date: dateColumns } = columns;
  const dataSetsHaveTitle = numberColumns.some((col) => hasDatasetTitle(ctx, col));

  if (textColumns.length >= 2 && numberColumns.length === 1) {
    const sortedTextColumns = textColumns.sort(
      (colA, colB) =>
        getCellStats(getters, sheetId, colA.zone).uniqueCount -
        getCellStats(getters, sheetId, colB.zone).uniqueCount
    );
    const dataSets = sortedTextColumns.map(({ zone }) => ({
      dataRange: getUnboundRange(getters, sheetId, zone),
    }));
    return createBaseChart(textColumns.length >= 3 ? "sunburst" : "treemap", dataSets, {
      labelRange: getUnboundRange(getters, sheetId, numberColumns[0].zone),
      dataSetsHaveTitle,
    });
  }

  const dataSets = recomputeZones(numberColumns.map((col) => col.zone)).map((zone) => ({
    dataRange: getUnboundRange(getters, sheetId, zone),
  }));

  if (dateColumns.length === 1 && numberColumns.length > 1) {
    return createBaseChart("line", dataSets, {
      labelRange: getUnboundRange(getters, sheetId, dateColumns[0].zone),
      dataSetsHaveTitle,
      cumulative: CHART_DEFAULTS.CUMULATIVE,
      labelsAsText: CHART_DEFAULTS.LABELS_AS_TEXT,
      legendPosition: CHART_DEFAULTS.LEGEND_POSITION_TOP,
    });
  }

  if (textColumns.length === 1 && numberColumns.length >= 2) {
    const [textColumn] = textColumns;
    const firstCell = getters.getEvaluatedCell({
      sheetId,
      row: textColumn.zone.top,
      col: textColumn.zone.left,
    });
    const { uniqueCount, totalCount } = getCellStats(getters, sheetId, textColumn.zone);
    const categoryCount = dataSetsHaveTitle && firstCell.value ? uniqueCount - 1 : uniqueCount;
    const expectedDataCount =
      categoryCount * numberColumns.length + (dataSetsHaveTitle ? numberColumns.length : 0);
    const actualDataCount = numberColumns.reduce(
      (sum, dataCol) => sum + getCellStats(getters, sheetId, dataCol.zone).totalCount,
      0
    );

    if (
      uniqueCount === totalCount &&
      uniqueCount >= CHART_LIMITS.MIN_RADAR_CATEGORIES &&
      uniqueCount <= CHART_LIMITS.MAX_RADAR_LABELS &&
      expectedDataCount === actualDataCount
    ) {
      return createBaseChart("radar", dataSets, {
        title: dataSetsHaveTitle && firstCell.value ? { text: String(firstCell.value) } : {},
        labelRange: getUnboundRange(getters, sheetId, textColumn.zone),
        dataSetsHaveTitle,
        legendPosition: CHART_DEFAULTS.LEGEND_POSITION_TOP,
      });
    }
  }

  const labelColumn = textColumns[0] || dateColumns[0] || numberColumns[0];
  return createBaseChart("bar", dataSets, {
    labelRange: dataSets.length ? getUnboundRange(getters, sheetId, labelColumn.zone) : "",
    dataSetsHaveTitle,
    aggregated: true,
    legendPosition: CHART_DEFAULTS.LEGEND_POSITION_TOP,
  });
}

function buildScorecard(zone: Zone, ctx: AnalysisCtx): ChartDefinition {
  const cell = ctx.getters.getCell({
    sheetId: ctx.sheetId,
    col: zone.left,
    row: zone.top,
  });
  return {
    type: "scorecard",
    title: {},
    keyValue: getUnboundRange(ctx.getters, ctx.sheetId, zone),
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
  const ctx = categorizeColumns(zones, getters, getters.getActiveSheetId());
  const { number: numberColumns, text: textColumns, date: dateColumns } = ctx.columns;

  const columnCount = numberColumns.length + textColumns.length + dateColumns.length;
  switch (columnCount) {
    case 0:
      return createBaseChart(
        "bar",
        [{ dataRange: getUnboundRange(getters, ctx.sheetId, zones[0]) }],
        { dataSetsHaveTitle: false }
      );
    case 1:
      const singleColumn = numberColumns[0] || textColumns[0] || dateColumns[0];
      return getZoneArea(singleColumn.zone) === 1
        ? buildScorecard(singleColumn.zone, ctx)
        : buildSingleColumnChart(singleColumn, ctx);
    case 2:
      return buildTwoColumnChart(ctx);
    default:
      return buildMultiColumnChart(ctx);
  }
}
