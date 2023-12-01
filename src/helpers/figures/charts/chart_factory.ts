import {
  DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
  DEFAULT_SCORECARD_BASELINE_COLOR_UP,
  DEFAULT_SCORECARD_BASELINE_MODE,
} from "../../../constants";
import { chartRegistry } from "../../../registries/chart_types";
import { _t } from "../../../translation";
import {
  AddColumnsRowsCommand,
  CellValueType,
  CommandResult,
  RemoveColumnsRowsCommand,
  UID,
  Zone,
} from "../../../types";
import {
  ChartCreationContext,
  ChartDefinition,
  ChartRuntime,
  ChartType,
} from "../../../types/chart/chart";
import { CoreGetters, Getters } from "../../../types/getters";
import { Validator } from "../../../types/validator";
import { getZoneArea, zoneToXc } from "../../zones";
import { AbstractChart } from "./abstract_chart";
import { canChartParseLabels } from "./chart_common_line_scatter";

/**
 * Create a function used to create a Chart based on the definition
 */
export function chartFactory(getters: CoreGetters) {
  const builders = chartRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
  function createChart(id: UID, definition: ChartDefinition, sheetId: UID): AbstractChart {
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
  definition: ChartDefinition,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): ChartDefinition {
  const transformation = chartRegistry.getAll().find((factory) => factory.match(definition.type));
  if (!transformation) {
    throw new Error("Unknown chart type.");
  }
  return transformation.transformDefinition(definition, executed);
}

/**
 * Get an empty definition based on the given context and the given type
 */
export function getChartDefinitionFromContextCreation(
  context: ChartCreationContext,
  type: ChartType
) {
  const chartClass = chartRegistry.get(type);
  return chartClass.getChartDefinitionFromContextCreation(context);
}

export function getChartTypes(): Record<string, string> {
  const result = {};
  for (const key of chartRegistry.getKeys()) {
    result[key] = chartRegistry.get(key).name;
  }
  return result;
}

/**
 * Return a "smart" chart definition in the given zone. The definition is "smart" because it will
 * use the best type of chart to display the data of the zone.
 *
 * It will also try to find labels and datasets in the range, and try to find title for the datasets.
 *
 * The type of chart will be :
 * - If the zone is a single non-empty cell, returns a scorecard
 * - If the all the labels are numbers/date, returns a line chart
 * - Else returns a bar chart
 */
export function getSmartChartDefinition(zone: Zone, getters: Getters): ChartDefinition {
  let dataSetZone = zone;
  if (zone.left !== zone.right) {
    dataSetZone = { ...zone, left: zone.left + 1 };
  }
  const dataSets = [zoneToXc(dataSetZone)];
  const sheetId = getters.getActiveSheetId();

  const topLeftCell = getters.getCell({ sheetId, col: zone.left, row: zone.top });
  if (getZoneArea(zone) === 1 && topLeftCell?.content) {
    return {
      type: "scorecard",
      title: "",
      background: topLeftCell.style?.fillColor || undefined,
      keyValue: zoneToXc(zone),
      baselineMode: DEFAULT_SCORECARD_BASELINE_MODE,
      baselineColorUp: DEFAULT_SCORECARD_BASELINE_COLOR_UP,
      baselineColorDown: DEFAULT_SCORECARD_BASELINE_COLOR_DOWN,
    };
  }

  let title = "";
  const cellsInFirstRow = getters.getEvaluatedCellsInZone(sheetId, {
    ...dataSetZone,
    bottom: dataSetZone.top,
  });
  const dataSetsHaveTitle = !!cellsInFirstRow.find(
    (cell) => cell.type !== CellValueType.empty && cell.type !== CellValueType.number
  );

  if (dataSetsHaveTitle) {
    const texts = cellsInFirstRow
      .filter((cell) => cell.type !== CellValueType.error && cell.type !== CellValueType.empty)
      .map((cell) => cell.formattedValue);

    const lastElement = texts.splice(-1)[0];
    title = texts.join(", ");
    if (lastElement) {
      title += (title ? " " + _t("and") + " " : "") + lastElement;
    }
  }

  let labelRangeXc: string | undefined;
  if (zone.left !== zone.right) {
    labelRangeXc = zoneToXc({
      ...zone,
      right: zone.left,
    });
  }
  // Only display legend for several datasets.
  const newLegendPos = dataSetZone.right === dataSetZone.left ? "none" : "top";

  const labelRange = labelRangeXc ? getters.getRangeFromSheetXC(sheetId, labelRangeXc) : undefined;
  if (canChartParseLabels(labelRange, getters)) {
    return {
      title,
      dataSets,
      labelsAsText: false,
      stacked: false,
      aggregated: false,
      cumulative: false,
      labelRange: labelRangeXc,
      type: "line",
      dataSetsHaveTitle,
      verticalAxisPosition: "left",
      legendPosition: newLegendPos,
    };
  }
  return {
    title,
    dataSets,
    labelRange: labelRangeXc,
    type: "bar",
    stacked: false,
    aggregated: false,
    dataSetsHaveTitle,
    verticalAxisPosition: "left",
    legendPosition: newLegendPos,
  };
}
