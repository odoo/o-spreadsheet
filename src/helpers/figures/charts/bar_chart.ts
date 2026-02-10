import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  getDataSourceFromContextCreation,
  getDefinedAxis,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartTypeBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { BarChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import { CommandResult } from "@odoo/o-spreadsheet-engine/types/commands";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import type { ChartConfiguration } from "chart.js";
import {
  getBarChartData,
  getBarChartDatasets,
  getBarChartLegend,
  getBarChartScales,
  getBarChartTooltip,
  getChartShowValues,
  getChartTitle,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

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

  getDefinitionFromContextCreation(context) {
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "bar",
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      horizontal: context.horizontal,
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

  getRuntime(getters, definition, { extractData }): BarChartRuntime {
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
        },
      },
    };

    return {
      chartJsConfig: config,
      background: definition.background || BACKGROUND_CHART_COLOR,
      customisableSeries: chartData.dataSetsValues.map(({ label, dataSetId }) => ({
        dataSetId,
        label,
      })),
    };
  },
};
