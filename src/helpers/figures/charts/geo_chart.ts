import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { GeoChartRuntime } from "../../../types/chart/geo_chart";
import { CommandResult } from "../../../types/commands";
import { AbstractChart } from "./abstract_chart";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getGeoChartData } from "./runtime/chart_data_extractor";
import { getGeoChartDatasets } from "./runtime/chartjs_dataset";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getGeoChartScales } from "./runtime/chartjs_scales";
import { getChartTitle } from "./runtime/chartjs_title";
import { getGeoChartTooltip } from "./runtime/chartjs_tooltip";

export const GeoChart: ChartTypeBuilder<"geo"> = {
  sequence: 90,
  dataSeriesLimit: 1,

  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "colorScale",
    "missingValueColor",
    "region",
  ],

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
      type: "geo",
      humanize: context.humanize,
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): GeoChartRuntime {
    const data = extractData();
    const chartData = getGeoChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "choropleth",
      data: {
        datasets: getGeoChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getGeoChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          tooltip: getGeoChartTooltip(definition, chartData),
          legend: { display: false },
          background: { color: chartData.background },
        },
        ...eventHandlers,
      },
    };

    return { chartJsConfig: config };
  },
};
