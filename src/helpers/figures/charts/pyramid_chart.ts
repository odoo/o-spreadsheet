import { getChartData } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { isNumberCell } from "@odoo/o-spreadsheet-engine/helpers/cells/cell_evaluation";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  getDataSourceFromContextCreation,
  getDefinedAxis,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartTypeBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { PyramidChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/pyramid_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import { CommandResult } from "../../../types";
import {
  getBarChartDatasets,
  getBarChartLegend,
  getChartTitle,
  getPyramidChartData,
  getPyramidChartScales,
  getPyramidChartShowValues,
  getPyramidChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

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

  getDefinitionFromContextCreation(context) {
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
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
    };
  },

  getDefinitionForExcel(getters, definition, { dataSets, labelRange }) {
    const data = getChartData(getters, definition.dataSource);
    const chartData = getPyramidChartData(definition, data, getters);
    const { dataSetsValues } = chartData;
    const maxValue = Math.max(
      ...dataSetsValues.map((dataSet) =>
        Math.max(
          ...dataSet.data.map((cell) => (isNumberCell(cell) ? Math.abs(cell.value) : -Infinity))
        )
      )
    );
    return {
      ...definition,
      horizontal: true,
      backgroundColor: toXlsxHexColor(definition.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRange,
      verticalAxis: getDefinedAxis(definition),
      maxValue,
    };
  },

  getRuntime(getters, definition, dataSource): PyramidChartRuntime {
    const data = dataSource.extractData(getters);
    const chartData = getPyramidChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: getBarChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        indexAxis: "y",
        layout: getChartLayout(definition, chartData),
        scales: getPyramidChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getBarChartLegend(definition, chartData),
          tooltip: getPyramidChartTooltip(definition, chartData),
          chartShowValuesPlugin: getPyramidChartShowValues(definition, chartData),
        },
      },
    };

    return {
      chartJsConfig: config,
      background: definition.background || BACKGROUND_CHART_COLOR,
      customisableSeries: chartData.dataSetsValues.map(({ dataSetId, label }) => ({
        dataSetId,
        label,
      })),
    };
  },
};
