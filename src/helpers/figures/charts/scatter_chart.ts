import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { ScatterChartRuntime } from "../../../types/chart/scatter_chart";
import { CommandResult } from "../../../types/commands";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { AbstractChart } from "./abstract_chart";
import { chartFontColor, getDataSourceRanges, getDefinedAxis } from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getLineChartData } from "./runtime/chart_data_extractor";
import { getScatterChartDatasets } from "./runtime/chartjs_dataset";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getScatterChartLegend } from "./runtime/chartjs_legend";
import { getScatterChartScales } from "./runtime/chartjs_scales";
import { getChartShowValues } from "./runtime/chartjs_show_values";
import { getChartTitle } from "./runtime/chartjs_title";
import { getLineChartTooltip } from "./runtime/chartjs_tooltip";

export const ScatterChart: ChartTypeBuilder<"scatter"> = {
  sequence: 60,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showValues",
    "labelsAsText",
    "aggregated",
    "axesDesign",
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
      labelsAsText: context.labelsAsText ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "scatter",
      aggregated: context.aggregated ?? false,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      humanize: context.humanize,
      annotationLink: context.annotationLink,
      annotationText: context.annotationText,
    };
  },

  getDefinitionForExcel(getters, definition, { dataSets, labelRange }) {
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(definition.background || "#FFFFFF"),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRange,
      verticalAxis: getDefinedAxis(definition),
    };
  },

  getRanges: (definition) => getDataSourceRanges(definition.dataSource),

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): ScatterChartRuntime {
    const data = extractData();
    const chartData = getLineChartData(definition, data, getters);

    const config: ChartConfiguration<"line"> = {
      // use chartJS line chart and disable the lines instead of chartJS scatter chart. This is because the scatter chart
      // have less options than the line chart (it only works with linear labels)
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: getScatterChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getScatterChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getScatterChartLegend(definition, chartData),
          tooltip: getLineChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
          background: { color: chartData.background },
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
