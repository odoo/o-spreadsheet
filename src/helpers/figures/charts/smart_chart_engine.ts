import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { CellValueType, ChartDefinition, Getters, Zone } from "../../../types";
import { isDateTimeFormat } from "../../format/format";
import { recomputeZones } from "../../recompute_zones";
import { getZoneArea, zoneToXc } from "../../zones";

type ColumnType = "number" | "text" | "date" | "empty";

const getUnboundRange = (zone: Zone, getters: Getters) => {
  const sheetId = getters.getActiveSheetId();
  return zoneToXc(getters.getUnboundedZone(sheetId, zone));
};

function getCount(value, list) {
  return list.reduce((count, item) => count + (item === value ? 1 : 0), 0);
}

function getUniqueCount<T>(values: T[]) {
  return new Set(values).size;
}

/**
 * Detects the dominant data type (number, text, or date) in a single zone.
 * @param zone
 * @param getters
 * @returns
 */
function getTypeFromZone(zone: Zone, getters: Getters): ColumnType {
  const cells = getters.getEvaluatedCellsInZone(getters.getActiveSheetId(), zone);
  const counts = { number: 0, text: 0, date: 0 };
  for (const cell of cells) {
    if (cell.type === CellValueType.number) {
      if (cell.format && isDateTimeFormat(cell.format)) {
        counts.date++;
      } else {
        counts.number++;
      }
    } else if (cell.type === CellValueType.text) {
      counts.text++;
    }
  }
  const total = counts.number + counts.text + counts.date;
  if (total === 0) return "empty"; // No data in the column
  return Object.entries(counts).reduce((a, b) => (b[1] > a[1] ? b : a))[0] as ColumnType;
}

/**
 * Separate zones column-wise and returns the main data type for each column.
 * @param zones
 * @param getters
 * @returns
 */
function getTypesFromZones(
  zones: Zone[],
  getters: Getters
): Array<{ type: ColumnType; zone: Zone }> {
  const columnZones: Zone[] = [];
  for (const { left, right, top, bottom } of zones) {
    for (let col = left; col <= right; col++) {
      const existing = columnZones.find((z) => z.left === col && z.right === col);
      if (existing) {
        existing.top = Math.min(existing.top, top);
        existing.bottom = Math.max(existing.bottom, bottom);
      } else {
        columnZones.push({ left: col, right: col, top, bottom });
      }
    }
  }
  return columnZones
    .map((zone) => {
      const type = getTypeFromZone(zone, getters);
      return type === "empty" ? null : { type, zone };
    })
    .filter(Boolean) as Array<{ type: ColumnType; zone: Zone }>;
}

function isCyclicData(values: string[]): boolean {
  const cycles = [
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
  ];
  const lowerValues = values.map((v) => v.toLowerCase().trim());
  return cycles.some((cycle) => cycle.every((val) => lowerValues.includes(val.toLowerCase())));
}

function buildChartForSingleColumn(
  zone: Zone,
  type: ColumnType,
  getters: Getters
): ChartDefinition {
  const sheetId = getters.getActiveSheetId();
  const topLeftCell = getters.getCell({ sheetId, col: zone.left, row: zone.top });
  if (getZoneArea(zone) === 1 && topLeftCell?.content) {
    return {
      type: "scorecard",
      title: {},
      keyValue: getUnboundRange(zone, getters),
      background: topLeftCell?.style?.fillColor,
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
    };
  }

  const values = getters
    .getEvaluatedCellsInZone(sheetId, zone)
    .map((cell) => cell.value ?? "")
    .filter((v) => v !== "");
  const dataSets = [{ dataRange: getUnboundRange(zone, getters) }];
  if (type === "number") {
    const total = values
      .map(Number)
      .filter((v) => !isNaN(v))
      .reduce((sum, v) => sum + v, 0);
    const firstDataCell = getters.getEvaluatedCell({
      sheetId,
      col: zone.left,
      row: zone.top,
    });
    const dataSetsHaveTitle =
      firstDataCell.type !== CellValueType.empty &&
      firstDataCell.type !== CellValueType.number &&
      getCount(firstDataCell.formattedValue, values) === 1;
    const isDoughnut = total < 100;
    if (total <= 100) {
      return {
        type: "pie",
        title: {},
        dataSets,
        dataSetsHaveTitle,
        isDoughnut,
        legendPosition: "none",
      };
    }
    return {
      type: "bar",
      title: {},
      dataSets,
      dataSetsHaveTitle,
      stacked: false,
      legendPosition: "none",
    };
  }

  const firstDataCell = getters.getEvaluatedCell({
    sheetId,
    col: zone.left,
    row: zone.top,
  });
  const dataSetsHaveTitle = getCount(firstDataCell.formattedValue, values) === 1;
  if (type === "text") {
    if (getUniqueCount(values) <= 6) {
      return {
        type: "pie",
        title: {},
        dataSets,
        labelRange: dataSets[0].dataRange,
        dataSetsHaveTitle,
        aggregated: true,
        legendPosition: "none",
      };
    }
    return {
      type: "bar",
      title: {},
      dataSets,
      dataSetsHaveTitle,
      aggregated: true,
      stacked: false,
      legendPosition: "none",
    };
  }
  return {
    type: "line",
    title: {},
    dataSets,
    labelRange: dataSets[0].dataRange,
    dataSetsHaveTitle,
    stacked: false,
    labelsAsText: true,
    cumulative: false,
    legendPosition: "none",
  };
}

function buildChartForTwoColumns(
  zone1: Zone,
  type1: ColumnType,
  zone2: Zone,
  type2: ColumnType,
  getters: Getters
): ChartDefinition {
  const sheetId = getters.getActiveSheetId();
  let labelZone = zone1,
    labelType = type1,
    dataZone = zone2,
    dataType = type2;
  if ((type2 === "text" || type2 === "date") && type1 === "number") {
    labelZone = zone2;
    labelType = type2;
    dataZone = zone1;
    dataType = type1;
  }

  const labelRange = getUnboundRange(labelZone, getters);
  const dataSets = [{ dataRange: getUnboundRange(dataZone, getters) }];
  const firstDataCell = getters.getEvaluatedCell({
    sheetId,
    col: dataZone.left,
    row: dataZone.top,
  });
  const dataSetsHaveTitle =
    firstDataCell.type !== CellValueType.empty && firstDataCell.type !== CellValueType.number;

  // If both columns are numeric, we can build a scatter chart
  if (labelType === "number" && dataType === "number") {
    return {
      type: "scatter",
      title: {},
      dataSets,
      labelRange,
      dataSetsHaveTitle: dataSetsHaveTitle,
      labelsAsText: false,
      legendPosition: "none",
    };
  }
  if (labelType === "date" && dataType === "number") {
    return {
      type: "line",
      title: {},
      dataSets,
      labelRange,
      dataSetsHaveTitle,
      aggregated: false,
      stacked: false,
      cumulative: false,
      labelsAsText: false,
      legendPosition: "none",
    };
  }
  if (labelType === "text" && dataType === "number") {
    const labelValues = getters
      .getEvaluatedCellsInZone(sheetId, labelZone)
      .map((c) => c.formattedValue);
    if (getUniqueCount(labelValues) <= 6) {
      return {
        type: "pie",
        title: {},
        dataSets,
        labelRange,
        dataSetsHaveTitle,
        aggregated: true,
        legendPosition: "top",
      };
    }
  }
  return {
    type: "bar",
    title: {},
    dataSets,
    labelRange,
    dataSetsHaveTitle,
    aggregated: true,
    stacked: false,
    legendPosition: "none",
  };
}

function buildChartForMultipleColumns(
  typedColumns: Array<{ type: ColumnType; zone: Zone }>,
  getters: Getters
): ChartDefinition {
  //first find text columns and numeric columns and date columns
  const sheetId = getters.getActiveSheetId();
  const textColumns = typedColumns.filter((c) => c.type === "text").map((c) => c.zone);
  const numericColumns = typedColumns.filter((c) => c.type === "number").map((c) => c.zone);
  const dateColumns = typedColumns.filter((c) => c.type === "date").map((c) => c.zone);

  const getRange = (zone: Zone) => zoneToXc(getters.getUnboundedZone(sheetId, zone));
  const dataSetsHaveTitle = numericColumns.some((zone) => {
    const cell = getters.getEvaluatedCell({ sheetId, col: zone.left, row: zone.top });
    return cell.type !== CellValueType.empty && cell.type !== CellValueType.number;
  });

  // Case: Treemap / Sunburst
  if (textColumns.length >= 2 && numericColumns.length === 1) {
    const dataSets = recomputeZones(textColumns).map((zone) => ({ dataRange: getRange(zone) }));
    const labelRange = getRange(numericColumns[0]);
    return {
      type: textColumns.length >= 3 ? "sunburst" : "treemap",
      title: {},
      dataSets,
      labelRange,
      dataSetsHaveTitle,
      legendPosition: "none",
    };
  }

  // Case: Line Chart
  const dataSets = recomputeZones(numericColumns).map((zone) => ({ dataRange: getRange(zone) }));
  if (dateColumns.length === 1 && numericColumns.length > 1) {
    return {
      type: "line",
      title: {},
      dataSets,
      labelRange: getRange(dateColumns[0]),
      dataSetsHaveTitle,
      stacked: false,
      cumulative: false,
      labelsAsText: false,
      legendPosition: "top",
    };
  }

  // Case: Radar Chart (cyclic categories)
  if (textColumns.length === 1 && numericColumns.length >= 2) {
    const labelValues = getters
      .getEvaluatedCellsInZone(sheetId, textColumns[0])
      .map((c) => c.formattedValue);
    if (isCyclicData(labelValues)) {
      return {
        type: "radar",
        title: {},
        dataSets,
        labelRange: getRange(textColumns[0]),
        dataSetsHaveTitle,
        stacked: false,
        legendPosition: "top",
      };
    }
  }
  const labelRange = getRange(textColumns[0] ?? dateColumns[0] ?? numericColumns[0]);
  if (textColumns.length === 0 && dateColumns.length === 0) {
    return {
      type: "line",
      title: {},
      dataSets: dataSets.slice(0, 1),
      labelRange,
      dataSetsHaveTitle,
      stacked: false,
      labelsAsText: false,
      cumulative: false,
      legendPosition: "top",
    };
  }
  return {
    type: "bar",
    title: {},
    dataSets,
    labelRange,
    dataSetsHaveTitle,
    stacked: false,
    legendPosition: "top",
  };
}

/**
 * Analyzes selected zones, detects column types,
 * returns the best chart type with smart labels and datasets based on data patterns.
 * It will also try to find labels and datasets in the range, and try to find title for the datasets.
 *
 * The type of chart will be :
 * ┌────────────────────────────┐
 * │    Number of Columns?      │
 * └────────────┬───────────────┘
 *              │
 *      ┌───────▼────────┐
 *      │  Only One Col  │
 *      └───────┬────────┘
 *              │
 *      ┌───────▼──────────────────────────────────────────────┐
 *      │ Is there only 1 non-empty cell?                      │
 *      └───────┬─────────────────────┬────────────────────────┘
 *              │                     │
 *          ┌───▼─────┐           ┌───▼─────────────────────────────┐
 *          │Scorecard│           │ What's the dominant column type?│
 *          └─────────┘           └─────────┬────────────────┬──────┘
 *                                          ▼                ▼
 *                                      Text Column     Number Column
 *                                          │                │
 *                         ┌────────────────▼────┐     ┌─────▼────────────────────────────┐
 *                         │ Unique values ≤ 6?  │     │ Total < 100 → Doughnut           │
 *                         └────┬───────────────┬┘     │ Total = 100 → Pie (special case) │
 *                              │               │      │ Else -> Bar                      │
 *                        ┌─────▼────┐     ┌────▼─────┐└──────────────────────────────────┘
 *                        │  Pie     │     │  Bar     │
 *                        └──────────┘     └──────────┘
 *
 * ┌──────────────────────┐
 * │  Two Selected Columns│
 * └────────────┬─────────┘
 *              │
 *       ┌──────▼──────────────────────┐
 *       │ Are both types are number?  | -> Scatter Chart
 *       └─────────────────────────────┘
 *
 *       ┌────────────────────────────────────────────┐
 *       │ Are types Date + Number or Text + Number?  │
 *       └───────┬────────────────────┬───────────────┘
 *               ▼                    ▼
 *         Date + Number         Text + Number
 *               │                    │
 *               ▼                    ▼
 *           Line Chart       ┌──────────────┐
 *                            │ Count unique │
 *                            │ text values  │
 *                            └──────┬───────┘
 *                                   ▼
 *                        ┌────── unique ≤ 6 ? ──────┐
 *                        ▼                          ▼
 *              ┌─────────────┐                 Bar Chart
 *              │  Check total │
 *              └──────┬───────┘
 *                     ▼
 *           ┌───── total < 100 ─────┐
 *           ▼                      ▼
 *       Doughnut Chart     Pie Chart (total = 100)
 *
 * ┌──────────────────────────────┐
 * │  3+ Columns Selected          │
 * └────────────┬─────────────────┘
 *              ▼
 *      ┌───────▼────────────┐
 *      │  ≥2 Text + 1 Number│────> Sunburst / Treemap
 *      └────────────────────┘
 *
 *      ┌─────────────────────┐
 *      │ 1 Text + ≥2 Numbers │────> Radar (if cyclic) else Bar
 *      └─────────────────────┘
 *
 *      ┌──────────────────────┐
 *      │ 1 Date + >1 Numbers  │────> Line Chart
 *      └──────────────────────┘
 *
 * [Fallback for all else → Bar Chart]
 *
 */
export function getSmartChartDefinition(zones: Zone[], getters: Getters): ChartDefinition {
  const typeWithZones = getTypesFromZones(recomputeZones(zones), getters);
  const totalColumn = typeWithZones.length;

  // Case no column with data
  if (totalColumn === 0) {
    const sheetId = getters.getActiveSheetId();
    return {
      type: "bar",
      title: {},
      dataSets: [
        { dataRange: zoneToXc(getters.getUnboundedZone(sheetId, zones[0])), yAxisId: "y" },
      ],
      labelRange: undefined,
      stacked: false,
      dataSetsHaveTitle: false,
      legendPosition: "none",
    };
  }
  // Case Single column:
  if (totalColumn === 1) {
    const [{ zone, type }] = typeWithZones;
    return buildChartForSingleColumn(zone, type, getters);
  }
  // Case 2 columns: if one is text, we can use it as labels
  else if (totalColumn === 2) {
    const [{ zone: zone1, type: type1 }, { zone: zone2, type: type2 }] = typeWithZones;
    return buildChartForTwoColumns(zone1, type1, zone2, type2, getters);
  }
  // Case more than 2 columns:
  return buildChartForMultipleColumns(typeWithZones, getters);
}
