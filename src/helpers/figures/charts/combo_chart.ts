import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { ComboChartDataSetStyle, ComboChartRuntime } from "../../../types/chart/combo_chart";
import { CommandResult } from "../../../types/commands";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { AbstractChart } from "./abstract_chart";
import { chartFontColor, getDataSourceRanges, getDefinedAxis } from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getBarChartData } from "./runtime/chart_data_extractor";
import { getComboChartDatasets } from "./runtime/chartjs_dataset";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getComboChartLegend } from "./runtime/chartjs_legend";
import { getBarChartScales } from "./runtime/chartjs_scales";
import { getChartShowValues } from "./runtime/chartjs_show_values";
import { getChartTitle } from "./runtime/chartjs_title";
import { getBarChartTooltip } from "./runtime/chartjs_tooltip";

export const ComboChart: ChartTypeBuilder<"combo"> = {
  sequence: 15,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "aggregated",
    "axesDesign",
    "showValues",
    "hideDataMarkers",
    "zoomable",
  ] as const,

  fromStrDefinition: (definition) => definition,

  toStrDefinition: (definition) => definition,

  copyInSheetId: (definition) => definition,

  duplicateInDuplicatedSheet: (definition) => definition,

  transformDefinition: (definition) => definition,

  validateDefinition: () => CommandResult.Success,

  updateRanges: (definition) => definition,

  getContextCreation: (definition) => definition,

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

  getDefinitionFromContextCreation(context, dataSourceBuilder) {
    const dataSetStyles: ComboChartDataSetStyle = context.dataSetStyles ?? {};
    if (context.dataSource?.type === "range") {
      const firstDataSetId = context.dataSource?.dataSets?.[0]?.dataSetId;
      for (const dataSet of context.dataSource?.dataSets || []) {
        dataSetStyles[dataSet.dataSetId] = {
          ...(context.dataSetStyles?.[dataSet.dataSetId] || {}),
          type: dataSet.dataSetId === firstDataSetId ? "bar" : "line",
        };
      }
    }
    return {
      background: context.background,
      dataSource: dataSourceBuilder.fromContextCreation(context),
      dataSetStyles,
      aggregated: context.aggregated,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "combo",
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      hideDataMarkers: context.hideDataMarkers,
      zoomable: context.zoomable,
      humanize: context.humanize,
      annotationText: context.annotationText,
      annotationLink: context.annotationLink,
    };
  },

  getRanges: (definition) => getDataSourceRanges(definition.dataSource),

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): ComboChartRuntime {
    const data = extractData();
    const chartData = getBarChartData(definition, data, getters);

    const config: ChartConfiguration<"bar" | "line"> = {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: getComboChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getBarChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getComboChartLegend(definition, chartData),
          tooltip: getBarChartTooltip(definition, chartData),
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
