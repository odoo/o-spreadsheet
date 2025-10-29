import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { ChartRuntimeGenerationArgs, CommandResult, Range } from "../../../types";
import { ChartCreationContext } from "../../../types/chart";
import { BubbleChartDefinition } from "../../../types/chart/bubble_chart";
import { isDefined } from "../../misc";
import { createValidRange } from "../../range";
import { rangeReference } from "../../references";
import { AbstractChart } from "./abstract_chart";
import { adaptChartRange, duplicateLabelRangeInDuplicatedSheet } from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getBubbleChartDataset, getChartShowValues, getChartTitle } from "./runtime";
import { getBubbleChartData } from "./runtime/chart_data_extractor";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getBubbleChartLegend } from "./runtime/chartjs_legend";
import { getBubbleChartScales } from "./runtime/chartjs_scales";
import { getBubbleChartTooltip } from "./runtime/chartjs_tooltip";

export interface BubbleChartData extends ChartRuntimeGenerationArgs {
  bubbleSizes: (number | undefined)[];
  bubbleLabels: string[];
}

function checkRanges(definition: BubbleChartDefinition): CommandResult {
  if (definition.yRanges.length && !rangeReference.test(definition.yRanges[0])) {
    return CommandResult.InvalidYRange;
  }
  if (definition.xRange && !rangeReference.test(definition.xRange)) {
    return CommandResult.InvalidXRange;
  }
  if (definition.labelRange && !rangeReference.test(definition.labelRange)) {
    return CommandResult.InvalidLabelRange;
  }
  if (definition.sizeRange && !rangeReference.test(definition.sizeRange)) {
    return CommandResult.InvalidBubbleSizeRange;
  }
  return CommandResult.Success;
}

export const BubbleChart: ChartTypeBuilder<"bubble"> = {
  sequence: 40,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "yRanges",
    "xRange",
    "labelRange",
    "sizeRange",
    "dataSetsHaveTitle",
    "verticalAxisPosition",
    "labelsAsText",
    "bubbleColor",
    "legendPosition",
    "axesDesign",
    "showValues",
  ],

  fromStrDefinition(definition, sheetId, getters) {
    const yRanges = definition.yRanges
      .map((yRange) => createValidRange(getters, sheetId, yRange))
      .filter(isDefined);
    const xRange = createValidRange(getters, sheetId, definition.xRange);
    const labelRange = createValidRange(getters, sheetId, definition.labelRange);
    const sizeRange = createValidRange(getters, sheetId, definition.sizeRange);
    const rangeDefinition: BubbleChartDefinition<Range> = {
      ...definition,
      yRanges,
      xRange,
      labelRange,
      sizeRange,
    };
    return rangeDefinition;
  },

  toStrDefinition(definition, sheetId, getters) {
    return {
      ...definition,
      yRanges: definition.yRanges.map((yRange) => getters.getRangeString(yRange, sheetId)),
      xRange: definition.xRange ? getters.getRangeString(definition.xRange, sheetId) : undefined,
      labelRange: definition.labelRange
        ? getters.getRangeString(definition.labelRange, sheetId)
        : undefined,
      sizeRange: definition.sizeRange
        ? getters.getRangeString(definition.sizeRange, sheetId)
        : undefined,
    };
  },

  validateDefinition(validator, definition) {
    return validator.checkValidations(definition, checkRanges);
  },

  transformDefinition(definition, chartSheetId, { adaptRangeString }): BubbleChartDefinition {
    const adaptRange = (range: string | undefined): string | undefined => {
      if (!range) {
        return undefined;
      }
      const { changeType, range: adaptedRange } = adaptRangeString(chartSheetId, range);
      return changeType !== "REMOVE" ? adaptedRange : undefined;
    };
    return {
      ...definition,
      yRanges: definition.yRanges.map(adaptRange).filter(isDefined),
      xRange: adaptRange(definition.xRange),
      sizeRange: adaptRange(definition.sizeRange),
      labelRange: adaptRange(definition.labelRange),
    };
  },

  getDefinitionFromContextCreation(context, dataSourceBuilder): BubbleChartDefinition {
    const isDataSourceRange = context.dataSource?.type === "range";
    return {
      background: context.background,
      yRanges: isDataSourceRange
        ? context.dataSource.dataSets?.map((ds) => ds.dataRange) ?? []
        : [],
      verticalAxisPosition: context.dataSetStyles?.[0]?.verticalAxisPosition,
      dataSetsHaveTitle: isDataSourceRange ? context.dataSource.dataSetsHaveTitle ?? false : false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "bubble",
      labelRange: context.bubbleLabelRange || undefined,
      labelsAsText: context.labelsAsText ?? false,
      xRange: context.auxiliaryRange || undefined,
      sizeRange: context.bubbleSizeRange || undefined,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      humanize: context.humanize,
      bubbleColor: context.bubbleColorMode || { color: "multiple" },
    };
  },

  getContextCreation(definition, dataSource): ChartCreationContext {
    return {
      ...definition,
      dataSource: {
        type: "range",
        dataSets: definition.yRanges.map((range, i) => ({
          dataSetId: `${i}`,
          dataRange: range,
        })),
      },
      bubbleLabelRange: definition.labelRange,
      auxiliaryRange: definition.xRange,
      bubbleSizeRange: definition.sizeRange,
      bubbleColorMode: definition.bubbleColor,
    };
  },

  getDefinitionForExcel: () => undefined,

  updateRanges(definition, adapterFunctions) {
    const adaptedYRanges = definition.yRanges
      .map((yRange) => adaptChartRange(yRange, adapterFunctions))
      .filter(isDefined);
    const adaptedXRange = adaptChartRange(definition.xRange, adapterFunctions);
    const adaptedLabelRange = adaptChartRange(definition.labelRange, adapterFunctions);
    const adaptedSizeRange = adaptChartRange(definition.sizeRange, adapterFunctions);
    return {
      ...definition,
      yRanges: adaptedYRanges,
      xRange: adaptedXRange,
      labelRange: adaptedLabelRange,
      sizeRange: adaptedSizeRange,
    };
  },

  duplicateInDuplicatedSheet(definition, sheetIdFrom, sheetIdTo): BubbleChartDefinition<Range> {
    const adaptRange = (range) =>
      duplicateLabelRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, range);
    return {
      ...definition,
      yRanges: definition.yRanges.map(adaptRange).filter(isDefined),
      xRange: adaptRange(definition.xRange),
      labelRange: adaptRange(definition.labelRange),
      sizeRange: adaptRange(definition.sizeRange),
    };
  },

  copyInSheetId: (definition) => definition,

  getRuntime(getters, definition) {
    const chartData = getBubbleChartData(definition, getters);
    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        datasets: getBubbleChartDataset(definition, chartData),
        labels: chartData.labels,
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getBubbleChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getBubbleChartLegend(definition, chartData),
          tooltip: getBubbleChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
          background: { color: definition.background },
        },
      },
    };
    return {
      chartJsConfig: config,
    };
  },
};
