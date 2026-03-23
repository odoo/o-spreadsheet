import { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { CommandResult } from "../../../types";
import { LineChartRuntime } from "../../../types/chart";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { AbstractChart } from "./abstract_chart";
import { chartFontColor, getDefinedAxis } from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import {
  getChartShowValues,
  getChartTitle,
  getLineChartData,
  getLineChartDatasets,
  getLineChartLegend,
  getLineChartScales,
  getLineChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

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
    };
  },

  getDefinitionForExcel(getters, definition, { dataSets, labelRange }) {
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(definition.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRange,
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
