import { chartRegistry } from "../../registries/chart_types";
import { AddColumnsRowsCommand, CommandResult, RemoveColumnsRowsCommand, UID } from "../../types";
import {
  ChartCreationContext,
  ChartDefinition,
  ChartRuntime,
  ChartType,
} from "../../types/chart/chart";
import { CoreGetters, Getters } from "../../types/getters";
import { Validator } from "../../types/validator";
import { AbstractChart } from "./abstract_chart";

/**
 * Create a function used to create a Chart based on the definition
 */
export function chartFactory(getters: CoreGetters) {
  const builders = chartRegistry.getAll();
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
  const builders = chartRegistry.getAll();
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
