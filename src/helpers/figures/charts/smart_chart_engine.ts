import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "@odoo/o-spreadsheet-engine/constants";
import { isDateTimeFormat } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import { recomputeZones } from "@odoo/o-spreadsheet-engine/helpers/recompute_zones";
import { getZoneArea, getZonesByColumns, zoneToXc } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { CellValueType, ChartDefinition, EvaluatedCell, Getters, Zone } from "../../../types";

type ColumnType = "number" | "text" | "date" | "percentage" | "empty";

interface ColumnInfo {
  zone: Zone;
  type: ColumnType;
}

const CHART_LIMITS = {
  MAX_PIE_CATEGORIES: 7,
  MAX_PIE_CATEGORIES_NO_TITLE: 6,
  MIN_RADAR_CATEGORIES: 3,
  MAX_RADAR_CATEGORIES: 12,
  PERCENTAGE_THRESHOLD: 100,
} as const;

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

function categorizeColumns(
  zones: Zone[],
  getters: Getters
): Record<"number" | "text" | "date", ColumnInfo[]> {
  const columns: Record<"number" | "text" | "date", ColumnInfo[]> = {
    number: [],
    text: [],
    date: [],
  };
  for (const zone of getZonesByColumns(zones)) {
    const cells = getters.getEvaluatedCellsInZone(getters.getActiveSheetId(), zone);
    const type = detectColumnType(cells);
    if (type !== "empty") {
      const targetType = type === "percentage" ? "number" : type;
      columns[targetType].push({ zone, type });
    }
  }
  return columns;
}

function getCellStats(getters: Getters, zone: Zone) {
  const cells = getters.getEvaluatedCellsInZone(getters.getActiveSheetId(), zone);
  const uniqueValues = new Set<string>();
  let totalCount = 0;
  let percentageSum = 0;
  for (let i = 0; i < cells.length; i++) {
    const { value } = cells[i];
    const str = value?.toString().trim();
    if (!str) {
      continue;
    }
    uniqueValues.add(str);
    totalCount++;
    const num = Number(value);
    if (!isNaN(num)) {
      percentageSum += Math.abs(num) * 100;
    }
  }
  return {
    uniqueCount: uniqueValues.size,
    totalCount,
    percentageSum,
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

function createBaseChart(
  type: string,
  dataSets: any[],
  options: Partial<ChartDefinition> = {}
): ChartDefinition {
  return {
    type,
    title: {},
    dataSets,
    legendPosition: "none",
    ...options,
  } as ChartDefinition;
}

function buildSingleColumnChart(column: ColumnInfo, getters: Getters): ChartDefinition {
  const { type, zone } = column;
  const sheetId = getters.getActiveSheetId();
  const dataSetsHaveTitle = isDatasetTitled(getters, column);
  const dataRange = getUnboundRange(getters, zone);
  const titleCell = getters.getEvaluatedCell({ sheetId, col: zone.left, row: zone.top });

  switch (type) {
    case "percentage":
      const { percentageSum } = getCellStats(getters, zone);
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
        legendPosition: "top",
      });

    // TODO: Handle date column with matrix chart when matrix chart is supported
    case "date":
      return createBaseChart("line", [{ dataRange }], {
        labelRange: dataRange,
        dataSetsHaveTitle,
        cumulative: false,
        labelsAsText: false,
      });
  }
  return createBaseChart("bar", [{ dataRange }], { dataSetsHaveTitle });
}

function buildTwoColumnChart(
  columns: Record<"number" | "text" | "date", ColumnInfo[]>,
  getters: Getters
): ChartDefinition {
  const { number: numberColumns, text: textColumns, date: dateColumns } = columns;

  if (numberColumns.length === 2) {
    return createBaseChart(
      "scatter",
      [{ dataRange: getUnboundRange(getters, numberColumns[1].zone) }],
      {
        labelRange: getUnboundRange(getters, numberColumns[0].zone),
        dataSetsHaveTitle: isDatasetTitled(getters, numberColumns[1]),
        labelsAsText: false,
      }
    );
  }

  // TODO: Handle date + number with matrix chart when matrix chart is supported
  if (dateColumns.length === 1 && numberColumns.length === 1) {
    return createBaseChart(
      "line",
      [{ dataRange: getUnboundRange(getters, numberColumns[0].zone) }],
      {
        labelRange: getUnboundRange(getters, dateColumns[0].zone),
        dataSetsHaveTitle: isDatasetTitled(getters, numberColumns[0]),
        aggregated: false,
        cumulative: false,
        labelsAsText: false,
      }
    );
  }

  if (textColumns.length === 1 && numberColumns.length === 1) {
    const [textColumn] = textColumns;
    const [numberColumn] = numberColumns;
    const { uniqueCount, totalCount } = getCellStats(getters, textColumn.zone);
    const dataSetsHaveTitle = isDatasetTitled(getters, numberColumn);
    const maxCategories = dataSetsHaveTitle
      ? CHART_LIMITS.MAX_PIE_CATEGORIES
      : CHART_LIMITS.MAX_PIE_CATEGORIES_NO_TITLE;
    const labelRange = getUnboundRange(getters, textColumn.zone);
    const dataRange = getUnboundRange(getters, numberColumn.zone);

    if (uniqueCount <= maxCategories) {
      const { percentageSum } = getCellStats(getters, numberColumn.zone);
      return createBaseChart("pie", [{ dataRange }], {
        labelRange,
        dataSetsHaveTitle,
        isDoughnut:
          numberColumn.type === "percentage" && percentageSum < CHART_LIMITS.PERCENTAGE_THRESHOLD,
        aggregated: true,
        legendPosition: "top",
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

  return createBaseChart("line", [{ dataRange: getUnboundRange(getters, dataColumn.zone) }], {
    labelRange: getUnboundRange(getters, labelColumn.zone),
    dataSetsHaveTitle: isDatasetTitled(getters, dataColumn),
    cumulative: false,
    labelsAsText: true,
  });
}

function buildMultiColumnChart(
  columns: Record<"number" | "text" | "date", ColumnInfo[]>,
  getters: Getters
): ChartDefinition {
  const { number: numberColumns, text: textColumns, date: dateColumns } = columns;
  const dataSetsHaveTitle = numberColumns.some((col) => isDatasetTitled(getters, col));

  if (textColumns.length >= 2 && numberColumns.length === 1) {
    const sortedTextColumns = textColumns.sort(
      (colA, colB) =>
        getCellStats(getters, colA.zone).uniqueCount - getCellStats(getters, colB.zone).uniqueCount
    );
    const dataSets = sortedTextColumns.map(({ zone }) => ({
      dataRange: getUnboundRange(getters, zone),
    }));
    return createBaseChart(textColumns.length >= 3 ? "sunburst" : "treemap", dataSets, {
      labelRange: getUnboundRange(getters, numberColumns[0].zone),
      dataSetsHaveTitle,
    });
  }

  const dataSets = recomputeZones(numberColumns.map((col) => col.zone)).map((zone) => ({
    dataRange: getUnboundRange(getters, zone),
  }));

  if (dateColumns.length === 1 && numberColumns.length > 1) {
    return createBaseChart("line", dataSets, {
      labelRange: getUnboundRange(getters, dateColumns[0].zone),
      dataSetsHaveTitle,
      cumulative: false,
      labelsAsText: false,
      legendPosition: "top",
    });
  }

  if (textColumns.length === 1 && numberColumns.length >= 2) {
    const [textColumn] = textColumns;
    const firstCell = getters.getEvaluatedCell({
      sheetId: getters.getActiveSheetId(),
      row: textColumn.zone.top,
      col: textColumn.zone.left,
    });
    const { uniqueCount, totalCount } = getCellStats(getters, textColumn.zone);
    const categoryCount = dataSetsHaveTitle && firstCell.value ? uniqueCount - 1 : uniqueCount;
    const expectedDataCount =
      categoryCount * numberColumns.length + (dataSetsHaveTitle ? numberColumns.length : 0);
    const actualDataCount = numberColumns.reduce(
      (sum, dataCol) => sum + getCellStats(getters, dataCol.zone).totalCount,
      0
    );

    if (
      uniqueCount === totalCount &&
      uniqueCount >= CHART_LIMITS.MIN_RADAR_CATEGORIES &&
      uniqueCount <= CHART_LIMITS.MAX_RADAR_CATEGORIES &&
      expectedDataCount === actualDataCount
    ) {
      return createBaseChart("radar", dataSets, {
        title: dataSetsHaveTitle && firstCell.value ? { text: String(firstCell.value) } : {},
        labelRange: getUnboundRange(getters, textColumn.zone),
        dataSetsHaveTitle,
        legendPosition: "top",
      });
    }
  }

  const labelColumn = textColumns[0] || dateColumns[0] || numberColumns[0];
  return createBaseChart("bar", dataSets, {
    labelRange: dataSets.length ? getUnboundRange(getters, labelColumn.zone) : "",
    dataSetsHaveTitle,
    aggregated: true,
    legendPosition: "top",
  });
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
  const { number: numberColumns, text: textColumns, date: dateColumns } = columns;

  const columnCount = numberColumns.length + textColumns.length + dateColumns.length;
  switch (columnCount) {
    case 0:
      return createBaseChart("bar", [{ dataRange: getUnboundRange(getters, zones[0]) }], {
        dataSetsHaveTitle: false,
      });
    case 1:
      const singleColumn = numberColumns[0] || textColumns[0] || dateColumns[0];
      return getZoneArea(singleColumn.zone) === 1
        ? buildScorecard(singleColumn.zone, getters)
        : buildSingleColumnChart(singleColumn, getters);
    case 2:
      return buildTwoColumnChart(columns, getters);
    default:
      return buildMultiColumnChart(columns, getters);
  }
}
