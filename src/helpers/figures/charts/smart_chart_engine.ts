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
interface Analysisctx {
  sheetId: UID;
  getters: Getters;
  numberColumns: ColumnInfo[];
  textColumns: ColumnInfo[];
  dateColumns: ColumnInfo[];
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

  cells.forEach((cell) => {
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
  });
  const totalCells = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
  if (!totalCells) return "empty";

  return (Object.entries(typeCounts) as [ColumnType, number][]).reduce((max, [type, count]) =>
    count > max[1] ? [type, count] : max
  )[0];
}

function categorizeColumns(zones: Zone[], getters: Getters, sheetId: UID): Analysisctx {
  const numberColumns: ColumnInfo[] = [];
  const textColumns: ColumnInfo[] = [];
  const dateColumns: ColumnInfo[] = [];

  getZonesByColumns(zones).forEach((zone) => {
    const cells = getters.getEvaluatedCellsInZone(sheetId, zone);
    const type = detectColumnType(cells);
    if (type === "empty") return;
    const columnInfo = { zone, type };
    switch (type) {
      case "number":
      case "percentage":
        numberColumns.push(columnInfo);
        break;
      case "text":
        textColumns.push(columnInfo);
        break;
      case "date":
        dateColumns.push(columnInfo);
        break;
    }
  });
  return {
    sheetId,
    getters,
    numberColumns,
    textColumns,
    dateColumns,
  };
}

function computePercentageSum(getters: Getters, sheetId: UID, column: ColumnInfo): number {
  return getters.getEvaluatedCellsInZone(sheetId, column.zone).reduce((sum, cell) => {
    if (cell.value === null) return sum;
    const value = +cell.value;
    return !isNaN(value) ? sum + value * 100 : sum;
  }, 0);
}

function getUniqueValueCount(getters: Getters, sheetId: UID, zone: Zone): number {
  const uniqueValues = new Set();
  getters.getEvaluatedCellsInZone(sheetId, zone).forEach(({ value }) => {
    if (value !== null && String(value).trim()) {
      uniqueValues.add(String(value));
    }
  });
  return uniqueValues.size;
}

function getTotalValueCount(getters: Getters, sheetId: UID, zone: Zone): number {
  return getters
    .getEvaluatedCellsInZone(sheetId, zone)
    .filter(({ value }) => value !== null && String(value).trim()).length;
}

function hasDatasetTitle(ctx: Analysisctx, column: ColumnInfo): boolean {
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

function buildSingleColumnChart(column: ColumnInfo, ctx: Analysisctx): ChartDefinition {
  const { type, zone } = column;
  const { sheetId, getters } = ctx;
  const dataRange = getUnboundRange(getters, sheetId, zone);
  const dataSets = [{ dataRange }];
  const dataSetsHaveTitle = hasDatasetTitle(ctx, column);

  switch (type) {
    case "percentage":
      const sum = computePercentageSum(getters, sheetId, column);
      if (sum > 0 && sum <= CHART_LIMITS.PERCENTAGE_THRESHOLD) {
        const title = dataSetsHaveTitle
          ? {
              text: getters.getEvaluatedCell({ sheetId, col: zone.left, row: zone.top })
                .formattedValue,
            }
          : {};
        return createBaseChart("pie", [{ dataRange }], {
          title,
          dataSetsHaveTitle: false,
          isDoughnut: sum < CHART_LIMITS.PERCENTAGE_THRESHOLD,
        });
      }
      break;
    case "text":
      const cells = getters.getEvaluatedCellsInZone(sheetId, zone);
      const [firstCell, ...dataCells] = cells;
      const hasUniqueTitle =
        firstCell?.value &&
        !dataCells.some((cell) => cell.value?.toString() === firstCell.value.toString());

      const title = hasUniqueTitle
        ? { text: firstCell.formattedValue || firstCell.value.toString() }
        : {};

      const dataZone = hasUniqueTitle ? { ...zone, top: zone.top + 1 } : zone;
      const adjustedDataRange = getUnboundRange(getters, sheetId, dataZone);

      return createBaseChart("pie", [{ dataRange: adjustedDataRange }], {
        title,
        labelRange: adjustedDataRange,
        dataSetsHaveTitle: false,
        isDoughnut: false,
        aggregated: true,
        legendPosition: CHART_DEFAULTS.LEGEND_POSITION_TOP,
      });
    // TODO: Handle date column with matrix chart when matrix chart is supported
    case "date":
      return createBaseChart("line", dataSets, {
        labelRange: dataRange,
        dataSetsHaveTitle,
        cumulative: CHART_DEFAULTS.CUMULATIVE,
        labelsAsText: CHART_DEFAULTS.LABELS_AS_TEXT,
      });
  }
  return createBaseChart("bar", dataSets, { dataSetsHaveTitle });
}

function buildTwoColumnChart(ctx: Analysisctx): ChartDefinition {
  const { sheetId, getters, numberColumns, textColumns, dateColumns } = ctx;

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
    const uniqueCount = getUniqueValueCount(getters, sheetId, textColumn.zone);
    const totalCount = getTotalValueCount(getters, sheetId, textColumn.zone);
    const dataSetsHaveTitle = hasDatasetTitle(ctx, numberColumn);
    const maxCategories = dataSetsHaveTitle
      ? CHART_LIMITS.MAX_PIE_CATEGORIES
      : CHART_LIMITS.MAX_PIE_CATEGORIES_NO_TITLE;
    const labelRange = getUnboundRange(getters, sheetId, textColumn.zone);
    const dataRange = getUnboundRange(getters, sheetId, numberColumn.zone);

    if (uniqueCount <= maxCategories) {
      const sum = computePercentageSum(getters, sheetId, numberColumn);
      return createBaseChart("pie", [{ dataRange }], {
        labelRange,
        dataSetsHaveTitle,
        isDoughnut: numberColumn.type === "percentage" && sum < CHART_LIMITS.PERCENTAGE_THRESHOLD,
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

function buildMultiColumnChart(ctx: Analysisctx): ChartDefinition {
  const { sheetId, getters, numberColumns, textColumns, dateColumns } = ctx;
  const hasDatasetTitles = numberColumns.some((col) => hasDatasetTitle(ctx, col));

  if (textColumns.length >= 2 && numberColumns.length === 1) {
    const sortedTextColumns = textColumns.sort(
      (colA, colB) =>
        getUniqueValueCount(getters, sheetId, colA.zone) -
        getUniqueValueCount(getters, sheetId, colB.zone)
    );
    const dataSets = sortedTextColumns.map(({ zone }) => ({
      dataRange: getUnboundRange(getters, sheetId, zone),
    }));
    return createBaseChart(textColumns.length >= 3 ? "sunburst" : "treemap", dataSets, {
      labelRange: getUnboundRange(getters, sheetId, numberColumns[0].zone),
      dataSetsHaveTitle: hasDatasetTitles,
    });
  }
  const dataSets = recomputeZones(numberColumns.map((col) => col.zone)).map((zone) => ({
    dataRange: getUnboundRange(getters, sheetId, zone),
  }));
  if (dateColumns.length === 1 && numberColumns.length > 1) {
    return createBaseChart("line", dataSets, {
      labelRange: getUnboundRange(getters, sheetId, dateColumns[0].zone),
      dataSetsHaveTitle: hasDatasetTitles,
      cumulative: CHART_DEFAULTS.CUMULATIVE,
      labelsAsText: CHART_DEFAULTS.LABELS_AS_TEXT,
      legendPosition: CHART_DEFAULTS.LEGEND_POSITION_TOP,
    });
  }
  if (textColumns.length === 1 && numberColumns.length >= 2) {
    const [textColumn] = textColumns;
    const uniqueCount = getUniqueValueCount(getters, sheetId, textColumn.zone);
    const totalCount = getTotalValueCount(getters, sheetId, textColumn.zone);
    const expectedDataCount =
      uniqueCount * numberColumns.length + (hasDatasetTitles ? numberColumns.length : 0);
    const actualDataCount = numberColumns.reduce(
      (sum, dataCol) => sum + getTotalValueCount(getters, sheetId, dataCol.zone),
      0
    );
    if (
      uniqueCount === totalCount &&
      uniqueCount >= CHART_LIMITS.MIN_RADAR_CATEGORIES &&
      uniqueCount <= CHART_LIMITS.MAX_RADAR_LABELS &&
      expectedDataCount === actualDataCount
    ) {
      return createBaseChart("radar", dataSets, {
        labelRange: getUnboundRange(getters, sheetId, textColumn.zone),
        dataSetsHaveTitle: hasDatasetTitles,
        legendPosition: CHART_DEFAULTS.LEGEND_POSITION_TOP,
      });
    }
  }
  const labelColumn = textColumns[0] || dateColumns[0] || numberColumns[0];
  return createBaseChart("bar", dataSets, {
    labelRange: dataSets.length ? getUnboundRange(getters, sheetId, labelColumn.zone) : "",
    dataSetsHaveTitle: hasDatasetTitles,
    aggregated: true,
    legendPosition: CHART_DEFAULTS.LEGEND_POSITION_TOP,
  });
}

function buildScorecard(zone: Zone, ctx: Analysisctx): ChartDefinition {
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
  const columnCount = ctx.numberColumns.length + ctx.textColumns.length + ctx.dateColumns.length;

  switch (columnCount) {
    case 0:
      return createBaseChart(
        "bar",
        [{ dataRange: getUnboundRange(getters, ctx.sheetId, zones[0]) }],
        {
          dataSetsHaveTitle: false,
        }
      );
    case 1:
      const singleColumn = ctx.numberColumns[0] || ctx.textColumns[0] || ctx.dateColumns[0];
      return getZoneArea(singleColumn.zone) === 1
        ? buildScorecard(singleColumn.zone, ctx)
        : buildSingleColumnChart(singleColumn, ctx);
    case 2:
      return buildTwoColumnChart(ctx);
    default:
      return buildMultiColumnChart(ctx);
  }
}
