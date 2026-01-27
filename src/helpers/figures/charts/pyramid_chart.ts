import { ChartConfiguration, ChartDataset } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { PyramidChartRuntime } from "../../../types/chart/pyramid_chart";
import { CommandResult } from "../../../types/commands";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { isNumberResult } from "../../cells/cell_evaluation";
import { AbstractChart } from "./abstract_chart";
import { chartFontColor, getDefinedAxis } from "./chart_common";
import { getChartData } from "./chart_data_sources";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getPyramidChartData } from "./runtime/chart_data_extractor";
import { getBarChartDatasets } from "./runtime/chartjs_dataset";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getPyramidChartLegend } from "./runtime/chartjs_legend";
import { getPyramidChartScales } from "./runtime/chartjs_scales";
import { getPyramidChartShowValues } from "./runtime/chartjs_show_values";
import { getChartTitle } from "./runtime/chartjs_title";
import { getPyramidChartTooltip } from "./runtime/chartjs_tooltip";

export const PyramidChart: ChartTypeBuilder<"pyramid"> = {
  sequence: 80,
  dataSeriesLimit: 2,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showValues",
    "aggregated",
    "axesDesign",
    "stacked",
    "horizontal",
  ],

  fromStrDefinition: (definition) => ({
    ...definition,
    horizontal: true,
    stacked: true,
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
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "pyramid",
      axesDesign: context.axesDesign,
      horizontal: true,
      stacked: true,
      showValues: context.showValues,
      humanize: context.humanize,
      annotationLink: context.annotationLink,
      annotationText: context.annotationText,
    };
  },

  getDefinitionForExcel(getters, definition, { dataSets, labelRange }) {
    if (definition.dataSource.type !== "range") {
      return undefined;
    }
    const data = getChartData(getters, definition.dataSource);
    const chartData = getPyramidChartData(definition, data, getters);
    const { dataSetsValues } = chartData;
    const maxValue = Math.max(
      ...dataSetsValues.map((dataSet) =>
        Math.max(
          ...dataSet.data.map((cell) => (isNumberResult(cell) ? Math.abs(cell.value) : -Infinity))
        )
      )
    );
    return {
      ...definition,
      horizontal: true,
      backgroundColor: toXlsxHexColor(chartData.background || "#FFFFFF"),
      fontColor: toXlsxHexColor(chartFontColor(chartData.background)),
      dataSets,
      labelRange,
      verticalAxis: getDefinedAxis(definition),
      maxValue,
    };
  },

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): PyramidChartRuntime {
    const data = extractData();
    const chartData = getPyramidChartData(definition, data, getters);

    const config: ChartConfiguration<"bar"> = {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: getBarChartDatasets(definition, chartData) as ChartDataset<"bar">[],
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        indexAxis: "y",
        layout: getChartLayout(definition, chartData),
        scales: getPyramidChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getPyramidChartLegend(definition, chartData),
          tooltip: getPyramidChartTooltip(definition, chartData),
          chartShowValuesPlugin: getPyramidChartShowValues(definition, chartData),
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
