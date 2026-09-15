import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { ChartCreationContext } from "../../../types/chart/chart";
import {
  HeatmapChartDefinition,
  HeatmapChartRuntime,
  heatMapRangeKeys,
  INVALID_RANGE_RESULTS,
} from "../../../types/chart/heatmap_chart";
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

function checkRanges(definition: HeatmapChartDefinition<string>): CommandResult {
  for (const key of heatMapRangeKeys) {
    if (definition[key] && !rangeReference.test(definition[key])) {
      return INVALID_RANGE_RESULTS[key];
    }
  }
  return CommandResult.Success;
}

export const HeatmapChart: ChartTypeBuilder<"heatmap"> = {
  sequence: 120,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    ...heatMapRangeKeys,
    "dataSetsHaveTitle",
    "legendPosition",
    "colorScale",
    "missingValueColor",
    "axesDesign",
    "showValues",
  ],

  fromStrDefinition(definition, sheetId, getters) {
    return {
      ...definition,
      xRange: createValidRange(getters, sheetId, definition.xRange),
      yRange: createValidRange(getters, sheetId, definition.yRange),
      sizeRange: createValidRange(getters, sheetId, definition.sizeRange),
    };
  },

  toStrDefinition(definition, sheetId, getters) {
    const toStr = (range: Range | undefined) =>
      range ? getters.getRangeString(range, sheetId) : undefined;
    return {
      ...definition,
      xRange: toStr(definition.xRange),
      yRange: toStr(definition.yRange),
      sizeRange: toStr(definition.sizeRange),
    };
  },

  validateDefinition(validator: Validator, definition: HeatmapChartDefinition<string>) {
    return validator.checkValidations(definition, checkRanges);
  },

  transformDefinition(
    definition,
    chartSheetId,
    { adaptRangeString }
  ): HeatmapChartDefinition<string> {
    const adaptRange = (range: string | undefined): string | undefined => {
      if (!range) {
        return undefined;
      }
      const { changeType, range: adaptedRange } = adaptRangeString(chartSheetId, range);
      return changeType !== "REMOVE" ? adaptedRange : undefined;
    };
    return {
      ...definition,
      xRange: adaptRange(definition.xRange),
      yRange: adaptRange(definition.yRange),
      sizeRange: adaptRange(definition.sizeRange),
    };
  },

  updateRanges(definition, adapterFunctions): HeatmapChartDefinition<Range> {
    return {
      ...definition,
      xRange: adaptChartRange(definition.xRange, adapterFunctions),
      yRange: adaptChartRange(definition.yRange, adapterFunctions),
      sizeRange: adaptChartRange(definition.sizeRange, adapterFunctions),
    };
  },

  duplicateInDuplicatedSheet(definition, sheetIdFrom, sheetIdTo): HeatmapChartDefinition<Range> {
    const adaptRange = (range: Range | undefined) =>
      duplicateLabelRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, range);
    return {
      ...definition,
      xRange: adaptRange(definition.xRange),
      yRange: adaptRange(definition.yRange),
      sizeRange: adaptRange(definition.sizeRange),
    };
  },

  copyInSheetId: (definition) => definition,

  getContextCreation(definition): ChartCreationContext {
    return {
      ...definition,
      dataSource: {
        type: "range",
        dataSets: definition.yRange ? [{ dataSetId: "0", dataRange: definition.yRange }] : [],
        dataSetsHaveTitle: definition.dataSetsHaveTitle,
      },
      auxiliaryRange: definition.xRange,
      sizeRange: definition.sizeRange,
    };
  },

  getFormulas: () => [],

  getDefinitionFromContextCreation(context): HeatmapChartDefinition<string> {
    const isDataSourceRange = context.dataSource?.type === "range";
    return {
      background: context.background,
      title: context.title || { text: "" },
      type: "heatmap",
      dataSetsHaveTitle: isDataSourceRange ? context.dataSource.dataSetsHaveTitle ?? false : false,
      xRange: context.auxiliaryRange || undefined,
      yRange: isDataSourceRange
        ? context.dataSource.dataSets?.[0]?.dataRange || undefined
        : undefined,
      sizeRange: context.sizeRange || undefined,
      legendPosition: context.legendPosition ?? "none",
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
    chartDataExtractors,
    sheetId,
    eventHandlers,
    colorThemeName: ColorThemeName
  ): HeatmapChartRuntime {
    const chartData = getHeatmapChartData(definition, getters, colorThemeName);
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
          tooltip: getColorGridChartTooltip(definition, chartData),
          chartShowValuesPlugin: getColorGridChartShowValues(definition, chartData),
          chartColorScalePlugin: getColorScaleLegend(definition, chartData),
          background: { color: chartData.background },
        },
      },
    };

    return { chartJsConfig: config };
  },
};
