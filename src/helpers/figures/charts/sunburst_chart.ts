import type { ChartConfiguration, ChartOptions } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { SunburstChartRuntime } from "../../../types/chart/sunburst_chart";
import { CommandResult } from "../../../types/commands";
import { AbstractChart } from "./abstract_chart";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getHierarchalChartData } from "./runtime/chart_data_extractor";
import { getSunburstChartDatasets } from "./runtime/chartjs_dataset";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getSunburstChartLegend } from "./runtime/chartjs_legend";
import { getSunburstShowValues } from "./runtime/chartjs_show_values";
import { getChartTitle } from "./runtime/chartjs_title";
import { getSunburstChartTooltip } from "./runtime/chartjs_tooltip";

export const SunburstChart: ChartTypeBuilder<"sunburst"> = {
  sequence: 30,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showValues",
    "showLabels",
    "valuesDesign",
    "groupColors",
    "pieHolePercentage",
  ],

  fromStrDefinition: (definition) => definition,

  toStrDefinition: (definition) => definition,

  copyInSheetId: (definition) => definition,

  duplicateInDuplicatedSheet: (definition) => definition,

  transformDefinition: (definition) => definition,

  validateDefinition: () => CommandResult.Success,

  updateRanges: (definition) => definition,

  getDefinitionFromContextCreation(context, dataSourceBuilder) {
    return {
      background: context.background,
      dataSetStyles: context.dataSetStyles ?? {},
      dataSource: dataSourceBuilder.fromHierarchicalContextCreation(context),
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "sunburst",
      showValues: context.showValues,
      showLabels: context.showLabels,
      valuesDesign: context.valuesDesign,
      groupColors: context.groupColors,
      humanize: context.humanize,
      pieHolePercentage: context.pieHolePercentage,
    };
  },

  getContextCreation(definition, dataSourceBuilder, dataSource) {
    return {
      ...definition,
      ...dataSourceBuilder.getHierarchicalContextCreation(dataSource),
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(
    getters,
    definition,
    { extractHierarchicalData },
    sheetId,
    eventHandlers
  ): SunburstChartRuntime {
    const data = extractHierarchicalData();
    const chartData = getHierarchalChartData(definition, data, getters);

    const config: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        datasets: getSunburstChartDatasets(definition, chartData),
      },
      options: {
        cutout:
          definition.pieHolePercentage === undefined ? "25%" : `${definition.pieHolePercentage}%`,
        ...(CHART_COMMON_OPTIONS as ChartOptions<"doughnut">),
        layout: getChartLayout(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getSunburstChartLegend(definition, chartData),
          tooltip: getSunburstChartTooltip(definition, chartData),
          sunburstLabelsPlugin: getSunburstShowValues(definition, chartData),
          sunburstHoverPlugin: { enabled: true },
          background: { color: chartData.background },
        },
        ...eventHandlers,
      },
    };

    return { chartJsConfig: config };
  },
};
