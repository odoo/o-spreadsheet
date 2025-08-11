import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { CellValueType, ChartDefinition, EvaluatedCell, Getters, UID, Zone } from "../../../types";
import { isDateTimeFormat } from "../../format/format";
import { recomputeZones } from "../../recompute_zones";
import { getZoneArea, getZonesByColumns, zoneToXc } from "../../zones";

type ColumnType = "number" | "text" | "date" | "empty";
type ColumnInfo = {
  zone: Zone;
  type: ColumnType;
  values: string[];
};

class SmartChartAnalyzer {
  public sheetId: UID;
  private rawZones: Zone[];
  public getters: Getters;
  public columns: ColumnInfo[];

  constructor(zones: Zone[], getters: Getters) {
    this.sheetId = getters.getActiveSheetId();
    this.rawZones = zones;
    this.getters = getters;
    this.columns = this.analyzeZones();
  }

  private analyzeZones(): ColumnInfo[] {
    return this.rawZones
      .map((zone) => {
        const cells = this.getters.getEvaluatedCellsInZone(this.sheetId, zone);
        const values = this.getValues(cells);
        const type = this.detectType(cells);
        if (type === "empty") return null;
        return { zone, type, values };
      })
      .filter(Boolean) as ColumnInfo[];
  }

  private getValues(cells: EvaluatedCell[]): string[] {
    return cells.map((c) => c.formattedValue ?? "").filter((v) => v !== "");
  }

  private detectType(cells: EvaluatedCell[]): ColumnType {
    const counts = { number: 0, text: 0, date: 0 };
    for (const cell of cells) {
      if (cell.type === CellValueType.number) {
        if (cell.format && isDateTimeFormat(cell.format)) counts.date++;
        else counts.number++;
      } else if (cell.type === CellValueType.text) counts.text++;
    }
    const total = counts.number + counts.text + counts.date;
    if (total === 0) return "empty";
    return Object.entries(counts).reduce((a, b) => (b[1] > a[1] ? b : a))[0] as ColumnType;
  }

  public getColumnsByType(type: ColumnType) {
    return this.columns.filter((c) => c.type === type);
  }

  public getUnboundRange(zone: Zone): string {
    return zoneToXc(this.getters.getUnboundedZone(this.sheetId, zone));
  }
}

function buildScorecard(zone: Zone, analyzer: SmartChartAnalyzer): ChartDefinition {
  const cell = analyzer.getters.getCell({
    sheetId: analyzer["sheetId"],
    col: zone.left,
    row: zone.top,
  });
  return {
    type: "scorecard",
    title: {},
    keyValue: analyzer.getUnboundRange(zone),
    background: cell?.style?.fillColor,
    baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
    baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
    baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  };
}

function fallbackBarChart(zone: Zone, analyzer: SmartChartAnalyzer): ChartDefinition {
  return {
    type: "bar",
    title: {},
    dataSets: [{ dataRange: analyzer.getUnboundRange(zone), yAxisId: "y" }],
    labelRange: undefined,
    stacked: false,
    dataSetsHaveTitle: false,
    legendPosition: "none",
  };
}

function isCyclicData(values: string[]): boolean {
  const threshold = 0.5;
  const cycles = [
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
    [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ],
    ["spring", "summer", "autumn", "fall", "winter"],
  ];
  const normalize = values.map((v) => v.toLowerCase().trim());
  const unique = [...new Set(normalize)];

  return cycles.some((items) => {
    const matchCount = items.filter((item) =>
      unique.some((val) => val === item || item.startsWith(val) || val.startsWith(item))
    ).length;
    return matchCount / items.length >= threshold;
  });
}

function buildChartForSingleColumn(
  column: ColumnInfo,
  analyzer: SmartChartAnalyzer
): ChartDefinition {
  const { type, zone, values } = column;
  const dataRange = analyzer.getUnboundRange(zone);
  const dataSets = [{ dataRange }];
  const sum = values
    .map(Number)
    .filter((n) => !isNaN(n))
    .reduce((a, b) => a + b, 0);
  const titleCell = analyzer.getters.getEvaluatedCell({
    sheetId: analyzer["sheetId"],
    col: zone.left,
    row: zone.top,
  });
  const dataSetsHaveTitle =
    titleCell.type !== CellValueType.number && titleCell.type !== CellValueType.empty;

  if (type === "number") {
    if (sum <= 100) {
      return {
        type: "pie",
        title: {},
        dataSets,
        labelRange: dataRange,
        dataSetsHaveTitle,
        isDoughnut: sum < 100,
        legendPosition: "none",
      };
    }
    return {
      type: "bar",
      title: {},
      dataSets,
      labelRange: dataRange,
      dataSetsHaveTitle,
      stacked: false,
      legendPosition: "none",
    };
  } else if (type === "text") {
    let dataSetsHaveTitle = false;
    let uniqueCount = new Set(values).size;
    const allUnique = uniqueCount === values.length;
    if (!allUnique) {
      const firstValue = values[0];
      const restValues = values.slice(1);
      const firstIsUnique = !restValues.includes(firstValue);
      if (firstIsUnique) {
        dataSetsHaveTitle = true;
        uniqueCount -= 1;
      }
    }
    if (uniqueCount <= 6) {
      return {
        type: "pie",
        title: {},
        dataSets,
        labelRange: dataRange,
        dataSetsHaveTitle,
        aggregated: true,
        legendPosition: "none",
      };
    }
    return {
      type: "bar",
      title: {},
      dataSets,
      labelRange: dataRange,
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
    labelRange: dataRange,
    dataSetsHaveTitle,
    stacked: false,
    labelsAsText: true,
    cumulative: false,
    legendPosition: "none",
  };
}

function buildChartForTwoColumns(
  col1: ColumnInfo,
  col2: ColumnInfo,
  analyzer: SmartChartAnalyzer
): ChartDefinition {
  const getters = analyzer.getters;
  const sheetId = analyzer.sheetId;
  let labelCol = col1,
    dataCol = col2;

  if ((col2.type === "text" || col2.type === "date") && col1.type === "number") {
    labelCol = col2;
    dataCol = col1;
  }

  const labelRange = analyzer.getUnboundRange(labelCol.zone);
  const dataSets = [{ dataRange: analyzer.getUnboundRange(dataCol.zone) }];
  const firstDataCell = getters.getEvaluatedCell({
    sheetId,
    col: dataCol.zone.left,
    row: dataCol.zone.top,
  });
  const dataSetsHaveTitle =
    firstDataCell.type !== CellValueType.empty && firstDataCell.type !== CellValueType.number;

  // If both columns are numeric, we can build a scatter chart
  if (labelCol.type === "number" && dataCol.type === "number") {
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
  if (labelCol.type === "date" && dataCol.type === "number") {
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
  if (labelCol.type === "text" && dataCol.type === "number") {
    const uniqueCount = new Set(labelCol.values).size;
    const maxCategory = dataSetsHaveTitle ? 7 : 6;
    if (uniqueCount <= maxCategory) {
      return {
        type: "pie",
        title: {},
        dataSets,
        labelRange,
        dataSetsHaveTitle,
        aggregated: true,
        legendPosition: "top",
      };
    } else if (uniqueCount !== labelCol.values.length) {
      return {
        type: "treemap",
        title: {},
        dataSets: [{ dataRange: labelRange }],
        labelRange: dataSets[0].dataRange,
        dataSetsHaveTitle,
        legendPosition: "none",
      };
    }
    return {
      type: "bar",
      title: {},
      dataSets,
      labelRange,
      dataSetsHaveTitle,
      stacked: false,
      legendPosition: "none",
    };
  }
  return {
    type: "line",
    title: {},
    dataSets,
    labelRange,
    dataSetsHaveTitle,
    stacked: false,
    labelsAsText: true,
    cumulative: false,
    legendPosition: "none",
  };
}

function buildChartForMultipleColumns(analyzer: SmartChartAnalyzer): ChartDefinition {
  const sheetId = analyzer.sheetId;
  const textCols = analyzer.getColumnsByType("text");
  const numericCols = analyzer.getColumnsByType("number");
  const dateCols = analyzer.getColumnsByType("date");

  const dataSetsHaveTitle = numericCols.some((colInfo) => {
    const cell = analyzer.getters.getEvaluatedCell({
      sheetId,
      col: colInfo.zone.left,
      row: colInfo.zone.top,
    });
    return cell.type !== CellValueType.empty && cell.type !== CellValueType.number;
  });

  // Case: Treemap / Sunburst
  if (textCols.length >= 2 && numericCols.length === 1) {
    const dataSets = recomputeZones(textCols.map((z) => z.zone)).map((zone) => ({
      dataRange: analyzer.getUnboundRange(zone),
    }));
    const labelRange = analyzer.getUnboundRange(numericCols[0].zone);
    return {
      type: textCols.length >= 3 ? "sunburst" : "treemap",
      title: {},
      dataSets,
      labelRange,
      dataSetsHaveTitle,
      legendPosition: "none",
    };
  }

  const dataSets = recomputeZones(numericCols.map((z) => z.zone)).map((zone) => ({
    dataRange: analyzer.getUnboundRange(zone),
  }));
  // Case: Line Chart
  if (dateCols.length === 1 && numericCols.length > 1) {
    return {
      type: "line",
      title: {},
      dataSets,
      labelRange: analyzer.getUnboundRange(dateCols[0].zone),
      dataSetsHaveTitle,
      stacked: false,
      cumulative: false,
      labelsAsText: false,
      legendPosition: "top",
    };
  }

  // Case: Radar Chart (cyclic categories)
  const labelValues = textCols[0]?.values;
  if (
    textCols.length === 1 &&
    numericCols.length >= 2 &&
    isCyclicData(dataSetsHaveTitle ? labelValues.slice(1) : labelValues)
  ) {
    return {
      type: "radar",
      title: {},
      dataSets,
      labelRange: analyzer.getUnboundRange(textCols[0].zone),
      dataSetsHaveTitle,
      stacked: false,
      legendPosition: "top",
    };
  }
  const labelRange = analyzer.getUnboundRange(
    textCols[0]?.zone ?? dateCols[0]?.zone ?? numericCols[0]?.zone
  );
  if (textCols.length === 0 && dateCols.length === 0) {
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
 * Analyzes selected zones and intelligently determines the most suitable chart type.
 * It infers data types (number, text, date) for each column and chooses label ranges,
 * dataset ranges, and chart types accordingly.
 *
 * Chart type decision rules:
 *
 * 1. No valid data -> fallback bar chart.
 *
 * 2. One column:
 *    - If only one non-empty cell -> Scorecard.
 *    - If number column:
 *        - Sum < 100 -> Doughnut chart.
 *        - Sum = 100 -> Pie chart.
 *        - Else -> Bar chart.
 *    - If text column:
 *        - If unique values <= 6 -> Pie chart.
 *        - Else -> Bar chart.
 *    - else -> Line chart.
 *
 * 3. Two columns:
 *    - If both are numeric -> Scatter chart.
 *    - If date + number -> Line chart.
 *    - If text + number:
 *        - If unique text values <= 6 -> Pie chart.
 *        - If non-unique -> Treemap.
 *        - Else -> Bar chart.
 *    - All other combinations -> Line chart (text/date as labels).
 *
 * 4. Three or more columns:
 *    - If >=2 text columns + 1 number -> Treemap or Sunburst (if =>2 text columns).
 *    - If 1 text + >=2 numbers:
 *        - If text values are cyclic (e.g. days, months) -> Radar chart.
 *        - Else -> Bar chart.
 *    - If 1 date + >1 numbers -> Line chart.
 *    - If no text/date column -> Line chart (first numeric column as labels).
 *    - Fallback -> Bar chart.
 */
export function getSmartChartDefinition(zones: Zone[], getters: Getters): ChartDefinition {
  const analyzer = new SmartChartAnalyzer(getZonesByColumns(zones), getters);
  const { columns } = analyzer;

  switch (columns.length) {
    case 0:
      return fallbackBarChart(zones[0], analyzer);
    case 1:
      const col = columns[0];
      return getZoneArea(col.zone) === 1
        ? buildScorecard(col.zone, analyzer)
        : buildChartForSingleColumn(col, analyzer);
    case 2:
      return buildChartForTwoColumns(columns[0], columns[1], analyzer);
    default:
      return buildChartForMultipleColumns(analyzer);
  }
}
