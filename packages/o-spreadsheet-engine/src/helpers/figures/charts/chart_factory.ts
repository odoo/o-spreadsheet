import { ChartConfiguration } from "chart.js";
import { chartRegistry } from "../../../registries/chart_registry";
import { ChartDefinition, ChartRuntime } from "../../../types/chart";
import { CommandResult } from "../../../types/commands";
import { CoreGetters } from "../../../types/core_getters";
import { Getters } from "../../../types/getters";
import { RangeAdapter, UID } from "../../../types/misc";
import { Validator } from "../../../types/validator";
import { AbstractChart } from "./abstract_chart";
import { generateMasterChartConfig } from "./runtime/chart_zoom";

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
    const runtime = builder.getChartRuntime(chart, getters);
    const definition = chart.getDefinition();
    if ("chartJsConfig" in runtime && /line|combo|bar|scatter|waterfall/.test(definition.type)) {
      const chartJsConfig = runtime.chartJsConfig as ChartConfiguration<any>;
      runtime["masterChartConfig"] = generateMasterChartConfig(chartJsConfig);
    }
    return runtime;
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
  const allowedKeys = new Set(validators.allowedDefinitionKeys);
  const hasExtraKeys = !new Set(Object.keys(definition)).isSubsetOf(allowedKeys);
  if (hasExtraKeys) {
    return CommandResult.InvalidChartDefinition;
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
