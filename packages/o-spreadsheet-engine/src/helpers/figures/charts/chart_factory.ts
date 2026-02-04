import { ChartConfiguration } from "chart.js";
import { chartTypeRegistry } from "../../../registries/chart_registry";
import { ChartDefinition, ChartRuntime } from "../../../types/chart";
import { CoreGetters } from "../../../types/core_getters";
import { Getters } from "../../../types/getters";
import { UID } from "../../../types/misc";
import { MyChart } from "../chart";
import { generateMasterChartConfig } from "./runtime/chart_zoom";

/**
 * Create a function used to create a Chart based on the definition
 */
export function chartFactory(getters: CoreGetters) {
  function createChart(
    figureId: UID,
    definitionWithRangeStr: ChartDefinition<string>,
    sheetId: UID
  ): MyChart {
    const builder = chartTypeRegistry.get(definitionWithRangeStr.type);
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
  function createRuntimeChart(chart: MyChart): ChartRuntime {
    const definition = chart.getRangeDefinition();
    const builder = chartTypeRegistry.get(definition.type);
    if (!builder) {
      throw new Error("No runtime builder for this chart.");
    }
    const runtime = chart.getRuntime(getters);
    if ("chartJsConfig" in runtime && /line|combo|bar|scatter|waterfall/.test(definition.type)) {
      const chartJsConfig = runtime.chartJsConfig as ChartConfiguration<any>;
      runtime["masterChartConfig"] = generateMasterChartConfig(chartJsConfig);
    }
    return runtime;
  }
  return createRuntimeChart;
}
