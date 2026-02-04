import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartDataSourceHandler } from "@odoo/o-spreadsheet-engine/registries/chart_data_source_registry";
import { ChartTypeBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { ChartRangeDataSource } from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { TreeMapChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/tree_map_chart";
import { ChartConfiguration } from "chart.js";
import { CommandResult } from "../../../types";
import {
  getChartTitle,
  getHierarchalChartData,
  getTreeMapChartDatasets,
  getTreeMapChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export const TreeMapChart: ChartTypeBuilder<"treemap"> = {
  sequence: 100,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showHeaders",
    "headerDesign",
    "showLabels",
    "valuesDesign",
    "coloringOptions",
    "showValues",
  ],

  fromStrDefinition: (definition) => definition,

  toStrDefinition: (definition) => definition,

  copyInSheetId: (definition) => definition,

  duplicateInDuplicatedSheet: (definition) => definition,

  transformDefinition: (definition) => definition,

  validateDefinition: () => CommandResult.Success,

  updateRanges: (definition) => definition,

  getDefinitionFromContextCreation(context) {
    let dataSource: ChartRangeDataSource<string> = {
      type: "range",
      dataSets: [],
      dataSetsHaveTitle: context.dataSource?.dataSetsHaveTitle ?? false,
      labelRange: context.dataSource?.dataSets?.[0]?.dataRange,
    };
    if (context.hierarchicalDataSource?.dataSets.length) {
      dataSource = context.hierarchicalDataSource;
    } else if (context.auxiliaryRange) {
      dataSource = {
        ...dataSource,
        dataSets: [{ dataRange: context.auxiliaryRange, dataSetId: "0" }],
      };
    }
    return {
      background: context.background,
      dataSetStyles: context.dataSetStyles ?? {},
      dataSource,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "treemap",
      showValues: context.showValues,
      showHeaders: context.showHeaders,
      headerDesign: context.headerDesign,
      showLabels: context.showLabels,
      valuesDesign: context.valuesDesign,
      coloringOptions: context.treemapColoringOptions,
      humanize: context.humanize,
    };
  },

  getContextCreation(definition, dataSourceHandler, dataSource) {
    return {
      ...definition,
      treemapColoringOptions: definition.coloringOptions,
      ...dataSourceHandler.getHierarchicalContextCreation(dataSource),
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(getters, definition, dataSource: ChartDataSourceHandler): TreeMapChartRuntime {
    const data = dataSource.extractHierarchicalData(getters);
    const chartData = getHierarchalChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "treemap",
      data: {
        labels: chartData.labels,
        datasets: getTreeMapChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: { display: false },
          tooltip: getTreeMapChartTooltip(definition, chartData),
        },
      },
    };

    return {
      chartJsConfig: config,
      background: definition.background || BACKGROUND_CHART_COLOR,
    };
  },
};
