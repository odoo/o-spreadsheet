import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";

import { ChartTypeBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { WaterfallChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import type { ChartConfiguration } from "chart.js";
import { CommandResult } from "../../../types";
import {
  getBarChartData,
  getChartTitle,
  getWaterfallChartLegend,
  getWaterfallChartScales,
  getWaterfallChartShowValues,
  getWaterfallChartTooltip,
  getWaterfallDatasetAndLabels,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export const WaterfallChart: ChartTypeBuilder<"waterfall"> = {
  sequence: 70,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "verticalAxisPosition",
    "aggregated",
    "showSubTotals",
    "showConnectorLines",
    "firstValueAsSubtotal",
    "positiveValuesColor",
    "negativeValuesColor",
    "subTotalValuesColor",
    "zoomable",
    "axesDesign",
    "showValues",
  ],

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
      dataSetStyles: context.dataSetStyles ? context.dataSetStyles : {},
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "waterfall",
      verticalAxisPosition: "left",
      showSubTotals: context.showSubTotals ?? false,
      showConnectorLines: context.showConnectorLines ?? true,
      firstValueAsSubtotal: context.firstValueAsSubtotal ?? false,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      zoomable: context.zoomable ?? false,
      humanize: context.humanize,
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(getters, definition, { extractData }, sheetId, eventHandlers): WaterfallChartRuntime {
    const data = extractData();
    const chartData = getBarChartData(definition, data, getters);

    const { labels, datasets } = getWaterfallDatasetAndLabels(definition, chartData);
    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels,
        datasets,
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getWaterfallChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getWaterfallChartLegend(definition, chartData),
          tooltip: getWaterfallChartTooltip(definition, chartData),
          chartShowValuesPlugin: getWaterfallChartShowValues(definition, chartData),
          waterfallLinesPlugin: { showConnectorLines: definition.showConnectorLines },
          background: { color: definition.background },
        },
        ...eventHandlers,
      },
    };

    return { chartJsConfig: config };
  },
};
