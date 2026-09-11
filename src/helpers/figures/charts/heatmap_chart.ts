import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { HeatmapChartDefinition, HeatmapChartRuntime } from "../../../types/chart/heatmap_chart";
import { CommandResult } from "../../../types/commands";
import { Range } from "../../../types/range";
import { ColorThemeName } from "../../../types/rendering";
import { Validator } from "../../../types/validator";
import { createValidRange } from "../../range";
import { rangeReference } from "../../references";
import { AbstractChart } from "./abstract_chart";
import { adaptChartRange, duplicateLabelRangeInDuplicatedSheet } from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getHeatmapChartData } from "./runtime/chart_data_extractor";
import { getColorGridChartDatasetAndLabels } from "./runtime/chartjs_dataset";
import { getColorGridChartLayout } from "./runtime/chartjs_layout";
import { getColorGridChartScales, getColorScaleLegend } from "./runtime/chartjs_scales";
import { getColorGridChartShowValues } from "./runtime/chartjs_show_values";
import { getChartTitle } from "./runtime/chartjs_title";
import { getColorGridChartTooltip } from "./runtime/chartjs_tooltip";

function checkRowRange(definition: HeatmapChartDefinition<string>): CommandResult {
  if (definition.rowRange && !rangeReference.test(definition.rowRange)) {
    return CommandResult.InvalidHeatmapRowRange;
  }
  return CommandResult.Success;
}

export const HeatmapChart: ChartTypeBuilder<"heatmap"> = {
  sequence: 120,
  dataSeriesLimit: 1,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "rowRange",
    "dataSource",
    "dataSetStyles",
    "legendPosition",
    "colorScale",
    "missingValueColor",
    "axesDesign",
    "showValues",
  ],

  fromStrDefinition(definition, sheetId, getters) {
    return {
      ...definition,
      rowRange: createValidRange(getters, sheetId, definition.rowRange),
    };
  },

  toStrDefinition(definition, sheetId, getters) {
    return {
      ...definition,
      rowRange: definition.rowRange
        ? getters.getRangeString(definition.rowRange, sheetId)
        : undefined,
    };
  },

  validateDefinition(validator: Validator, definition: HeatmapChartDefinition<string>) {
    return validator.checkValidations(definition, checkRowRange);
  },

  transformDefinition(
    definition,
    chartSheetId,
    { adaptRangeString }
  ): HeatmapChartDefinition<string> {
    let rowRange = definition.rowRange;
    if (rowRange) {
      const { changeType, range: adaptedRange } = adaptRangeString(chartSheetId, rowRange);
      rowRange = changeType !== "REMOVE" ? adaptedRange : undefined;
    }
    return { ...definition, rowRange };
  },

  updateRanges(definition, adapterFunctions): HeatmapChartDefinition<Range> {
    return {
      ...definition,
      rowRange: adaptChartRange(definition.rowRange, adapterFunctions),
    };
  },

  duplicateInDuplicatedSheet(definition, sheetIdFrom, sheetIdTo): HeatmapChartDefinition<Range> {
    return {
      ...definition,
      rowRange: duplicateLabelRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, definition.rowRange),
    };
  },

  copyInSheetId: (definition) => definition,

  getContextCreation: (definition) => definition,

  getFormulas: () => [],

  getDefinitionFromContextCreation(context, dataSourceBuilder): HeatmapChartDefinition<string> {
    return {
      background: context.background,
      title: context.title || { text: "" },
      type: "heatmap",
      dataSource: dataSourceBuilder.fromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      rowRange: context.rowRange,
      legendPosition: context.legendPosition ?? "left",
      colorScale: context.colorScale,
      missingValueColor: context.missingValueColor,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      humanize: context.humanize,
      annotationText: context.annotationText,
      annotationLink: context.annotationLink,
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(
    getters,
    definition,
    { extractData },
    sheetId,
    eventHandlers,
    colorThemeName: ColorThemeName
  ): HeatmapChartRuntime {
    const data = extractData();
    const chartData = getHeatmapChartData(definition, data, getters, colorThemeName);
    const { labels, datasets } = getColorGridChartDatasetAndLabels(definition, chartData);

    const config: ChartConfiguration<"calendar"> = {
      type: "calendar",
      data: {
        labels,
        datasets,
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        indexAxis: "x",
        layout: getColorGridChartLayout(definition, chartData),
        scales: getColorGridChartScales(definition, datasets, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: { display: false },
          tooltip: getColorGridChartTooltip(chartData),
          chartShowValuesPlugin: getColorGridChartShowValues(definition, chartData, "heatmap"),
          chartColorScalePlugin: getColorScaleLegend(definition, chartData),
          background: { color: chartData.background },
        },
      },
    };

    return { chartJsConfig: config };
  },
};
