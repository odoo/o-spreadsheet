import type { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { PieChartRuntime } from "../../../types/chart/pie_chart";
import { CommandResult } from "../../../types/commands";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { AbstractChart } from "./abstract_chart";
import { chartFontColor } from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getPieChartData } from "./runtime/chart_data_extractor";
import { getPieChartDatasets } from "./runtime/chartjs_dataset";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getPieChartLegend } from "./runtime/chartjs_legend";
import { getChartShowValues } from "./runtime/chartjs_show_values";
import { getChartTitle } from "./runtime/chartjs_title";
import { getPieChartTooltip } from "./runtime/chartjs_tooltip";

export const PieChart: ChartTypeBuilder<"pie"> = {
  sequence: 30,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "aggregated",
    "isDoughnut",
    "pieHolePercentage",
    "showValues",
    "slicesColors",
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
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "pie",
      aggregated: context.aggregated ?? false,
      isDoughnut: context.isDoughnut,
      pieHolePercentage: context.pieHolePercentage,
      showValues: context.showValues,
      humanize: context.humanize,
      slicesColors: context.slicesColors,
    };
  },

  getDefinitionForExcel(getters, definition, { dataSets, labelRanges }) {
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(definition.background || "#FFFFFF"),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRanges,
    };
  },

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): PieChartRuntime {
    const data = extractData();
    const chartData = getPieChartData(definition, data, getters);

    const config: ChartConfiguration<"doughnut" | "pie"> = {
      type: definition.isDoughnut ? "doughnut" : "pie",
      data: {
        labels: chartData.labels,
        datasets: getPieChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        cutout:
          definition.isDoughnut && definition.pieHolePercentage !== undefined
            ? definition.pieHolePercentage + "%"
            : undefined,
        layout: getChartLayout(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getPieChartLegend(definition, chartData),
          tooltip: getPieChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
          background: { color: chartData.background },
        },
        ...eventHandlers,
      },
    };

    return { chartJsConfig: config };
  },
};
