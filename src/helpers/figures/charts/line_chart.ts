import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { LineChartRuntime } from "../../../types/chart/line_chart";
import { CommandResult } from "../../../types/commands";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { AbstractChart } from "./abstract_chart";
import { chartFontColor, getDefinedAxis } from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getLineChartData } from "./runtime/chart_data_extractor";
import { getLineChartDatasets } from "./runtime/chartjs_dataset";
import { getChartGroupedLabels } from "./runtime/chartjs_grouped_labels";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getLineChartLegend } from "./runtime/chartjs_legend";
import { getLineChartScales } from "./runtime/chartjs_scales";
import { getChartShowValues } from "./runtime/chartjs_show_values";
import { getChartTitle } from "./runtime/chartjs_title";
import { getLineChartTooltip } from "./runtime/chartjs_tooltip";

export const LineChart: ChartTypeBuilder<"line"> = {
  sequence: 20,

  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "labelsAsText",
    "stacked",
    "aggregated",
    "cumulative",
    "axesDesign",
    "fillArea",
    "showValues",
    "hideDataMarkers",
    "zoomable",
    "groupBySecondaryLabels",
  ] as const,

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
      type: "line",
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      cumulative: context.cumulative ?? false,
      axesDesign: context.axesDesign,
      fillArea: context.fillArea,
      showValues: context.showValues,
      hideDataMarkers: context.hideDataMarkers,
      zoomable: context.zoomable,
      humanize: context.humanize,
      groupBySecondaryLabels: context.groupBySecondaryLabels,
    };
  },

  getDefinitionForExcel(getters, definition, { dataSets, labelRanges }) {
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(definition.background || "#FFFFFF"),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRanges,
      verticalAxis: getDefinedAxis(definition),
    };
  },

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): LineChartRuntime {
    const data = extractData();
    const chartData = getLineChartData(definition, data, getters);

    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: getLineChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getLineChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getLineChartLegend(definition, chartData),
          tooltip: getLineChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
          chartGroupedLabelsPlugin: getChartGroupedLabels(chartData, definition.background),
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
