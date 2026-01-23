import { ChartConfiguration } from "chart.js";
import { chartRegistry } from "../../../registries/chart_registry";
import { ChartDefinition, ChartRuntime } from "../../../types/chart";
import { CoreGetters } from "../../../types/core_getters";
import { Getters } from "../../../types/getters";
import { RangeAdapterFunctions, UID } from "../../../types/misc";
import { MyChart } from "../chart";
import { generateMasterChartConfig } from "./runtime/chart_zoom";

/**
 * Create a function used to create a Chart based on the definition
 */
export function chartFactory(getters: CoreGetters) {
  const builders = chartRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
  function createChart(
    figureId: UID,
    definitionWithRangeStr: ChartDefinition<string>,
    sheetId: UID
  ): MyChart {
    const builder = builders.find((builder) => builder.match(definitionWithRangeStr.type));
    if (!builder) {
      throw new Error(`No builder for this chart: ${definitionWithRangeStr.type}`);
    }
    return MyChart.fromStrDefinition(getters, sheetId, definitionWithRangeStr);
  }
  return createChart;
}

/**
 * Create a function used to create a Chart Runtime based on the chart class
 * instance
 */
export function chartRuntimeFactory(getters: Getters) {
  const builders = chartRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
  function createRuntimeChart(chart: MyChart): ChartRuntime {
    const definition = chart.getRangeDefinition();
    const builder = builders.find((builder) => builder.match(definition.type));
    if (!builder) {
      throw new Error("No runtime builder for this chart.");
    }
    const data = builder.extractData(definition, chart.sheetId, getters);
    const runtime = builder.getChartRuntime(getters, chart.chartTypeHandler, data);
    if ("chartJsConfig" in runtime && /line|combo|bar|scatter|waterfall/.test(definition.type)) {
      const chartJsConfig = runtime.chartJsConfig as ChartConfiguration<any>;
      runtime["masterChartConfig"] = generateMasterChartConfig(chartJsConfig);
    }
    return runtime;
  }
  return createRuntimeChart;
}

/**
 * Get a new chart definition transformed with the executed command. This
 * functions will be called during operational transform process
 */
export function transformDefinition(
  chartSheetId: UID,
  definition: ChartDefinition,
  rangeAdapters: RangeAdapterFunctions
): ChartDefinition {
  const transformation = chartRegistry.getAll().find((factory) => factory.match(definition.type));
  if (!transformation) {
    throw new Error("Unknown chart type.");
  }
  return transformation.transformDefinition(chartSheetId, definition, rangeAdapters);
}
