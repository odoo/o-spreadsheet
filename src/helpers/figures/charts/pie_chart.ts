import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  getDataSourceFromContextCreation,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartTypeBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { PieChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/pie_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import type { ChartConfiguration } from "chart.js";
import { CommandResult } from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getPieChartData,
  getPieChartDatasets,
  getPieChartLegend,
  getPieChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

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
  ] as const,

  fromStrDefinition: (definition) => definition,

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
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "pie",
      aggregated: context.aggregated ?? false,
      isDoughnut: context.isDoughnut,
      pieHolePercentage: context.pieHolePercentage,
      showValues: context.showValues,
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

  getRuntime(getters, definition, dataSource): PieChartRuntime {
    const data = dataSource.extractData(getters);
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
        },
      },
    };

    return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
  },
};
