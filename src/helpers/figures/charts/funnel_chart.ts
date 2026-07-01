import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { FunnelChartRuntime } from "../../../types/chart/funnel_chart";
import { CommandResult } from "../../../types/commands";
import { AbstractChart } from "./abstract_chart";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getFunnelChartData } from "./runtime/chart_data_extractor";
import { getFunnelChartDatasets } from "./runtime/chartjs_dataset";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getFunnelChartScales } from "./runtime/chartjs_scales";
import { getChartShowValues } from "./runtime/chartjs_show_values";
import { getChartTitle } from "./runtime/chartjs_title";
import { getFunnelChartTooltip } from "./runtime/chartjs_tooltip";

export const FunnelChart: ChartTypeBuilder<"funnel"> = {
  sequence: 100,
  dataSeriesLimit: 1,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "dataSetStyles",
    "axesDesign",
    "legendPosition",
    "horizontal",
    "aggregated",
    "showValues",
    "funnelColors",
    "cumulative",
  ],

  fromStrDefinition: (definition) => definition,

  toStrDefinition: (definition) => definition,

  copyInSheetId: (definition) => definition,

  duplicateInDuplicatedSheet: (definition) => definition,

  transformDefinition: (definition) => definition,

  validateDefinition: () => CommandResult.Success,

  updateRanges: (definition) => definition,

  getContextCreation: (definition) => definition,

  getFormulas: () => [],

  getDefinitionFromContextCreation(context, dataSourceBuilder) {
    return {
      background: context.background,
      dataSource: dataSourceBuilder.fromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      aggregated: context.aggregated ?? false,
      legendPosition: "none",
      title: context.title || { text: "" },
      type: "funnel",
      showValues: context.showValues,
      axesDesign: context.axesDesign,
      funnelColors: context.funnelColors,
      horizontal: true,
      cumulative: context.cumulative ?? true,
      humanize: context.humanize,
      annotationText: context.annotationText,
      annotationLink: context.annotationLink,
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): FunnelChartRuntime {
    const data = extractData();
    const chartData = getFunnelChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "funnel",
      data: {
        labels: chartData.labels,
        datasets: getFunnelChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        indexAxis: "y",
        layout: getChartLayout(definition, chartData),
        scales: getFunnelChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: { display: false },
          tooltip: getFunnelChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
          background: { color: chartData.background },
        },
        ...eventHandlers,
      },
    };

    return { chartJsConfig: config };
  },
};
