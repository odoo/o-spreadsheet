import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { CommandResult } from "../../../types";
import { TreeMapChartRuntime } from "../../../types/chart/tree_map_chart";
import { AbstractChart } from "./abstract_chart";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
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

  getDefinitionFromContextCreation(context, dataSourceBuilder) {
    return {
      background: context.background,
      dataSetStyles: context.dataSetStyles ?? {},
      dataSource: dataSourceBuilder.fromHierarchicalContextCreation(context),
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
      annotationText: context.annotationText,
      annotationLink: context.annotationLink,
    };
  },

  getContextCreation(definition, dataSourceBuilder, dataSource) {
    return {
      ...definition,
      treemapColoringOptions: definition.coloringOptions,
      ...dataSourceBuilder.getHierarchicalContextCreation(dataSource),
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(
    getters,
    definition,
    { extractHierarchicalData },
    sheetId,
    eventHandlers
  ): TreeMapChartRuntime {
    const data = extractHierarchicalData();
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
          background: { color: definition.background },
        },
        ...eventHandlers,
      },
    };

    return { chartJsConfig: config };
  },
};
