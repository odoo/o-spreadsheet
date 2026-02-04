import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import { getDataSourceFromContextCreation } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { FunnelChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";

import { ChartTypeBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { ChartConfiguration } from "chart.js";
import { CommandResult } from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getFunnelChartData,
  getFunnelChartDatasets,
  getFunnelChartScales,
  getFunnelChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export const FunnelChart: ChartTypeBuilder<"funnel"> = {
  sequence: 100,
  dataSeriesLimit: 1,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "dataSetStyles",
    "axesDesign",
    "legendPosition",
    "horizontal",
    "aggregated",
    "showValues",
    "funnelColors",
    "cumulative",
  ],

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
      aggregated: context.aggregated ?? false,
      legendPosition: "none",
      title: context.title || { text: "" },
      type: "funnel",
      showValues: context.showValues,
      axesDesign: context.axesDesign,
      funnelColors: context.funnelColors,
      horizontal: true,
      cumulative: context.cumulative,
      humanize: context.humanize,
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(getters, definition, dataSource): FunnelChartRuntime {
    const data = dataSource.extractData(getters);
    const chartData = getFunnelChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "funnel",
      data: {
        labels: chartData.labels,
        datasets: getFunnelChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        indexAxis: "y",
        layout: getChartLayout(definition, chartData),
        scales: getFunnelChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: { display: false },
          tooltip: getFunnelChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
        },
      },
    };

    return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
  },
};
