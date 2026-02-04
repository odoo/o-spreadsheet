import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import { getDataSourceFromContextCreation } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartTypeBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { GeoChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { ChartConfiguration } from "chart.js";
import { CommandResult } from "../../../types";
import {
  getChartTitle,
  getGeoChartData,
  getGeoChartDatasets,
  getGeoChartScales,
  getGeoChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export const GeoChart: ChartTypeBuilder<"geo"> = {
  sequence: 90,
  dataSeriesLimit: 1,

  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "colorScale",
    "missingValueColor",
    "region",
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
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "geo",
      humanize: context.humanize,
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(getters, definition, dataSource): GeoChartRuntime {
    const data = dataSource.extractData(getters);
    const chartData = getGeoChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "choropleth",
      data: {
        datasets: getGeoChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getGeoChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          tooltip: getGeoChartTooltip(definition, chartData),
          legend: { display: false },
        },
      },
    };

    return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
  },
};
