import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  getDataSourceFromContextCreation,
  getDefinedAxis,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import {
  ComboChartDataSetStyle,
  ComboChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/combo_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import { CommandResult } from "../../../types";
import {
  getBarChartData,
  getBarChartScales,
  getBarChartTooltip,
  getChartShowValues,
  getChartTitle,
  getComboChartDatasets,
  getComboChartLegend,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export const ComboChart: ChartBuilder<"combo"> = {
  sequence: 15,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "aggregated",
    "axesDesign",
    "showValues",
    "hideDataMarkers",
    "zoomable",
  ] as const,

  copyInSheetId: (definition) => definition,

  duplicateInDuplicatedSheet: (definition) => definition,

  transformDefinition: (chartSheetId, definition, rangeAdapters) => definition,

  validateChartDefinition: (validator, definition) => CommandResult.Success,

  updateRanges: (definition, rangeAdapters) => definition,

  postProcess: (getters, sheetId, definition) => definition,

  getContextCreation: (dataSource, definition) => definition,

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

  getChartDefinitionFromContextCreation(context) {
    const dataSetStyles: ComboChartDataSetStyle = {};
    const firstDataSetId = context.dataSource?.dataSets?.[0]?.dataSetId;
    for (const dataSet of context.dataSource?.dataSets || []) {
      dataSetStyles[dataSet.dataSetId] = {
        ...(context.dataSetStyles?.[dataSet.dataSetId] || {}),
        type: dataSet.dataSetId === firstDataSetId ? "bar" : "line",
      };
    }
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles,
      aggregated: context.aggregated,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "combo",
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      hideDataMarkers: context.hideDataMarkers,
      zoomable: context.zoomable,
      humanize: context.humanize,
    };
  },

  getRuntime(getters, definition, dataSource): ComboChartRuntime {
    const data = dataSource.extractData(getters);
    const chartData = getBarChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: getComboChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getBarChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getComboChartLegend(definition, chartData),
          tooltip: getBarChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
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
