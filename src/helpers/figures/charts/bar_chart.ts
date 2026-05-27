import type { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { BarChartRuntime } from "../../../types/chart/bar_chart";
import { CommandResult } from "../../../types/commands";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { AbstractChart } from "./abstract_chart";
import { chartFontColor, getDefinedAxis } from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getBarChartData } from "./runtime/chart_data_extractor";
import { getBarChartDatasets } from "./runtime/chartjs_dataset";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getBarChartLegend } from "./runtime/chartjs_legend";
import { getBarChartScales } from "./runtime/chartjs_scales";
import { getChartShowValues } from "./runtime/chartjs_show_values";
import { getChartTitle } from "./runtime/chartjs_title";
import { getBarChartTooltip } from "./runtime/chartjs_tooltip";

export const BarChart: ChartTypeBuilder<"bar"> = {
  sequence: 10,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "horizontal",
    "axesDesign",
    "stacked",
    "aggregated",
    "showValues",
    "showTotalLine",
    "zoomable",
  ] as const,

  fromStrDefinition: (definition) => ({
    ...definition,
    zoomable: definition.horizontal ? undefined : definition.zoomable,
  }),

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
      type: "bar",
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      showTotalLine: context.showTotalLine,
      horizontal: context.horizontal,
      zoomable: context.zoomable,
      humanize: context.humanize,
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

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): BarChartRuntime {
    const data = extractData();
    const chartData = getBarChartData(definition, data, getters);
    const config: ChartConfiguration<"bar" | "line"> = {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: getBarChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        indexAxis: definition.horizontal ? "y" : "x",
        layout: getChartLayout(definition, chartData),
        scales: getBarChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getBarChartLegend(definition, chartData),
          tooltip: getBarChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
          background: { color: chartData.background },
        },
        ...eventHandlers,
      },
    };

    return {
      chartJsConfig: config,
      customizableSeries: chartData.dataSetsValues.map(({ label, dataSetId }) => ({
        dataSetId,
        label,
      })),
    };
  },
};
