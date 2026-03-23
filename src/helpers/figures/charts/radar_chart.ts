import { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { CommandResult } from "../../../types";
import { RadarChartRuntime } from "../../../types/chart/radar_chart";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { AbstractChart } from "./abstract_chart";
import { chartFontColor } from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import {
  getChartShowValues,
  getChartTitle,
  getRadarChartData,
  getRadarChartDatasets,
  getRadarChartLegend,
  getRadarChartScales,
  getRadarChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export const RadarChart: ChartTypeBuilder<"radar"> = {
  sequence: 80,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showValues",
    "aggregated",
    "stacked",
    "fillArea",
    "hideDataMarkers",
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
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "radar",
      fillArea: context.fillArea ?? false,
      showValues: context.showValues ?? false,
      hideDataMarkers: context.hideDataMarkers,
      humanize: context.humanize,
    };
  },

  getDefinitionForExcel(getters, definition, { dataSets, labelRange }) {
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(definition.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRange,
    };
  },

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): RadarChartRuntime {
    const data = extractData();
    const chartData = getRadarChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "radar",
      data: {
        labels: chartData.labels,
        datasets: getRadarChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getRadarChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getRadarChartLegend(definition, chartData),
          tooltip: getRadarChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
          background: { color: definition.background },
        },
        ...eventHandlers,
      },
    };

    return {
      chartJsConfig: config,
      customizableSeries: chartData.dataSetsValues.map(({ dataSetId, label }) => ({
        dataSetId,
        label,
      })),
    };
  },
};
