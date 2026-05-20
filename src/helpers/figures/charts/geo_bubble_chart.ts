import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { GeoChartRuntime } from "../../../types/chart/geo_chart";
import { CommandResult } from "../../../types/commands";
import { AbstractChart } from "./abstract_chart";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getGeoBubbleChartData } from "./runtime/chart_data_extractor";
import { getGeoBubbleChartDatasets } from "./runtime/chartjs_dataset";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getGeoBubbleChartScales } from "./runtime/chartjs_scales";
import { getChartTitle } from "./runtime/chartjs_title";
import { getGeoBubbleChartTooltip } from "./runtime/chartjs_tooltip";

export const GeoBubbleChart: ChartTypeBuilder<"geo_bubble"> = {
  sequence: 90,
  dataSeriesLimit: 1,

  allowedDefinitionKeys: [...AbstractChart.commonKeys, "dataSource", "legendPosition", "region"],

  fromStrDefinition: (definition) => definition,

  toStrDefinition: (definition) => definition,

  copyInSheetId: (definition) => definition,

  duplicateInDuplicatedSheet: (definition) => definition,

  transformDefinition: (definition) => definition,

  validateDefinition: () => CommandResult.Success,

  updateRanges: (definition) => definition,

  getContextCreation: (definition) => definition,

  getDefinitionFromContextCreation(context, dataSourceBuilder) {
    return {
      background: context.background,
      dataSource: dataSourceBuilder.fromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "geo_bubble",
      humanize: context.humanize,
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): GeoChartRuntime {
    const data = extractData();
    const chartData = getGeoBubbleChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "bubbleMap",
      data: {
        datasets: getGeoBubbleChartDatasets(definition, chartData),
        labels: chartData.labels,
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getGeoBubbleChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          tooltip: getGeoBubbleChartTooltip(definition, chartData),
          legend: { display: false },
          background: { color: chartData.background },
        },
        ...eventHandlers,
      },
    };

    return { chartJsConfig: config };
  },
};
