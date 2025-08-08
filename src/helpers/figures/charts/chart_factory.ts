import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { isEvaluationError } from "../../../functions/helpers";
import { chartRegistry } from "../../../registries/chart_types";
import { CellValueType, CommandResult, RangeAdapter, UID, Zone } from "../../../types";
import { LineChartDefinition, SunburstChartDefinition } from "../../../types/chart";
import { ChartDefinition, ChartRuntime } from "../../../types/chart/chart";
import { CoreGetters, Getters } from "../../../types/getters";
import { Validator } from "../../../types/validator";
import { getZoneArea, zoneToDimension, zoneToXc } from "../../zones";
import { AbstractChart } from "./abstract_chart";
import { createDataSets } from "./chart_common";
import { LineChart } from "./line_chart";
import { canChartParseLabels, getData } from "./runtime";

/**
 * Create a function used to create a Chart based on the definition
 */
export function chartFactory(getters: CoreGetters) {
  const builders = chartRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
  function createChart(figureId: UID, definition: ChartDefinition, sheetId: UID): AbstractChart {
    const builder = builders.find((builder) => builder.match(definition.type));
    if (!builder) {
      throw new Error(`No builder for this chart: ${definition.type}`);
    }
    return builder.createChart(definition, sheetId, getters);
  }

  return createChart;
}

/**
 * Create a function used to create a Chart Runtime based on the chart class
 * instance
 */
export function chartRuntimeFactory(getters: Getters) {
  const builders = chartRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
  function createRuntimeChart(chart: AbstractChart): ChartRuntime {
    const builder = builders.find((builder) => builder.match(chart.type));
    if (!builder) {
      throw new Error("No runtime builder for this chart.");
    }
    return builder.getChartRuntime(chart, getters);
  }
  return createRuntimeChart;
}

/**
 * Validate the chart definition given in arguments
 */
export function validateChartDefinition(
  validator: Validator,
  definition: ChartDefinition
): CommandResult | CommandResult[] {
  const validators = chartRegistry.getAll().find((validator) => validator.match(definition.type));
  if (!validators) {
    throw new Error("Unknown chart type.");
  }
  return validators.validateChartDefinition(validator, definition);
}

/**
 * Get a new chart definition transformed with the executed command. This
 * functions will be called during operational transform process
 */
export function transformDefinition(
  chartSheetId: UID,
  definition: ChartDefinition,
  applyrange: RangeAdapter
): ChartDefinition {
  const transformation = chartRegistry.getAll().find((factory) => factory.match(definition.type));
  if (!transformation) {
    throw new Error("Unknown chart type.");
  }
  return transformation.transformDefinition(chartSheetId, definition, applyrange);
}

/**
 * Return a "smart" chart definition in the given zone. The definition is "smart" because it will
 * use the best type of chart to display the data of the zone.
 *
 * It will also try to find labels and datasets in the range, and try to find title for the datasets.
 *
 * The type of chart will be :
 * - If the zone is a single non-empty cell, returns a scorecard
 * - If the dataset starts with multiple string columns, returns a sunburst chart
 * - If the all the labels are numbers/date, returns a line chart
 * - Else returns a bar chart
 */
export function getSmartChartDefinition(zone: Zone, getters: Getters): ChartDefinition {
  const hierarchicalDefinition = tryToMakeHierarchicalChart(getters, zone);
  if (hierarchicalDefinition) {
    return hierarchicalDefinition;
  }
  const sheetId = getters.getActiveSheetId();
  let dataSetZone = zone;
  const singleColumn = zoneToDimension(zone).numberOfCols === 1;
  if (!singleColumn) {
    dataSetZone = { ...zone, left: zone.left + 1 };
  }
  const dataRange = zoneToXc(getters.getUnboundedZone(sheetId, dataSetZone));
  const dataSets = [{ dataRange, yAxisId: "y" }];

  const topLeftCell = getters.getCell({ sheetId, col: zone.left, row: zone.top });
  if (getZoneArea(zone) === 1 && topLeftCell?.content) {
    return {
      type: "scorecard",
      title: {},
      background: topLeftCell.style?.fillColor || undefined,
      keyValue: zoneToXc(zone),
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
    };
  }

  const cellsInFirstRow = getters.getEvaluatedCellsInZone(sheetId, {
    ...dataSetZone,
    bottom: dataSetZone.top,
  });
  const dataSetsHaveTitle = !!cellsInFirstRow.find(
    (cell) => cell.type !== CellValueType.empty && cell.type !== CellValueType.number
  );

  let labelRangeXc: string | undefined;
  if (!singleColumn) {
    labelRangeXc = zoneToXc(getters.getUnboundedZone(sheetId, { ...zone, right: zone.left }));
  }
  // Only display legend for several datasets.
  const newLegendPos = dataSetZone.right === dataSetZone.left ? "none" : "top";

  const lineChartDefinition: LineChartDefinition = {
    title: {},
    dataSets,
    labelsAsText: false,
    stacked: false,
    aggregated: false,
    cumulative: false,
    labelRange: labelRangeXc,
    type: "line",
    dataSetsHaveTitle,
    legendPosition: newLegendPos,
  };
  const chart = new LineChart(lineChartDefinition, sheetId, getters);
  if (canChartParseLabels(lineChartDefinition, chart.dataSets, chart.labelRange, getters)) {
    return lineChartDefinition;
  }
  const _dataSets = createDataSets(getters, dataSets, sheetId, dataSetsHaveTitle);
  if (
    singleColumn &&
    getData(getters, _dataSets[0]).every((e) => typeof e === "string" && !isEvaluationError(e))
  ) {
    return {
      title: {},
      dataSets: [{ dataRange }],
      aggregated: true,
      labelRange: dataRange,
      type: "pie",
      legendPosition: "top",
      dataSetsHaveTitle: false,
    };
  }
  return {
    title: {},
    dataSets,
    labelRange: labelRangeXc,
    type: "bar",
    stacked: false,
    aggregated: false,
    dataSetsHaveTitle,
    legendPosition: newLegendPos,
  };
}

/**
 * Return a sunburst chart definition if the data in the zone looks like hierarchical data.
 */
function tryToMakeHierarchicalChart(
  getters: Getters,
  zone: Zone
): SunburstChartDefinition | undefined {
  const sheetId = getters.getActiveSheetId();
  const numberOfCols = zoneToDimension(zone).numberOfCols;
  if (zone.top === zone.bottom || numberOfCols <= 2) {
    return undefined;
  }

  const firstCellOfValues = getters.getEvaluatedCell({ sheetId, col: zone.right, row: zone.top });
  const dataSetsHaveTitle = firstCellOfValues.type !== CellValueType.number;

  const getColumnType = (col: number) => {
    const cells = getters.getEvaluatedCellsInZone(sheetId, {
      ...zone,
      left: col,
      right: col,
      top: zone.top + (dataSetsHaveTitle ? 1 : 0),
    });
    if (cells.every((cell) => cell.type !== CellValueType.number)) {
      return "string";
    } else if (cells.every((cell) => cell.type !== CellValueType.text)) {
      return "number";
    }
    return undefined;
  };

  for (let col = zone.left; col < zone.right; col++) {
    const columnType = getColumnType(col);
    if (col !== zone.right && columnType !== "string") {
      return undefined;
    } else if (col === zone.right && columnType !== "number") {
      return undefined;
    }
  }

  const dataSetZone = { ...zone, right: zone.right - 1 };
  const labelsZone = { ...zone, left: zone.right };

  return {
    title: {},
    dataSets: [{ dataRange: zoneToXc(dataSetZone) }],
    type: "sunburst",
    legendPosition: "none",
    labelRange: zoneToXc(labelsZone),
    dataSetsHaveTitle: dataSetsHaveTitle,
  };
}
