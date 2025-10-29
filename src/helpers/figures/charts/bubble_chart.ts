import { CellErrorType, CoreGetters, rangeReference, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  adaptChartRange,
  duplicateLabelRangeInDuplicatedSheet,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { adaptStringRange } from "@odoo/o-spreadsheet-engine/helpers/formulas";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  AxesDesign,
  ChartCreationContext,
  DatasetDesign,
  ExcelChartDefinition,
  LegendPosition,
  VerticalAxisPosition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import {
  BubbleChartDefinition,
  BubbleChartRuntime,
  BubbleColorMode,
} from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { BubbleDataPoint, ChartConfiguration } from "chart.js";
import {
  ApplyRangeChange,
  ChartRuntimeGenerationArgs,
  Color,
  CommandResult,
  Getters,
  Range,
  RangeAdapter,
  UID,
} from "../../../types";
import { getBubbleChartDataset, getChartShowValues, getChartTitle } from "./runtime";
import { getBubbleChartData } from "./runtime/chart_data_extractor";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getBubbleChartLegend } from "./runtime/chartjs_legend";
import { getBubbleChartScales } from "./runtime/chartjs_scales";
import { getBubbleChartTooltip } from "./runtime/chartjs_tooltip";

export interface BubbleChartData extends ChartRuntimeGenerationArgs {
  bubblePoints: BubbleDataPoint[];
}

function checkRanges(definition: BubbleChartDefinition): CommandResult {
  if (definition.labelRange) {
    const invalidRanges =
      !rangeReference.test(definition.labelRange || "") ||
      !rangeReference.test(definition.xRange || "") ||
      !rangeReference.test(definition.sizeRange || "") ||
      !rangeReference.test(definition.yRange || "");
    if (invalidRanges) {
      return CommandResult.InvalidChartDefinition;
    }
  }
  return CommandResult.Success;
}

export class BubbleChart extends AbstractChart {
  readonly labelRange?: Range | undefined;
  readonly xRange?: Range | undefined;
  readonly yRange?: Range | undefined;
  readonly sizeRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly type = "bubble";
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly zoomable?: boolean;
  readonly colorMode: BubbleColorMode;
  readonly verticalAxisPosition: VerticalAxisPosition;

  constructor(definition: BubbleChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.yRange = createValidRange(this.getters, sheetId, definition.yRange);
    this.labelRange = createValidRange(this.getters, sheetId, definition.labelRange);
    this.xRange = createValidRange(this.getters, sheetId, definition.xRange);
    this.sizeRange = createValidRange(this.getters, sheetId, definition.sizeRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.axesDesign = definition.axesDesign;
    this.showValues = definition.showValues;
    this.colorMode = definition.colorMode;
    this.verticalAxisPosition = definition.verticalAxisPosition;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: BubbleChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkRanges, checkBubbleChartAdditionalRanges);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: BubbleChartDefinition,
    applyChange: RangeAdapter
  ): BubbleChartDefinition {
    const adaptedXRange = definition.xRange
      ? adaptStringRange(chartSheetId, definition.xRange, applyChange)
      : undefined;
    const adaptedSizeRange = definition.sizeRange
      ? adaptStringRange(chartSheetId, definition.sizeRange, applyChange)
      : undefined;
    const adaptedYRange = definition.yRange
      ? adaptStringRange(chartSheetId, definition.yRange, applyChange)
      : undefined;
    const adaptedLabelRange = definition.labelRange
      ? adaptStringRange(chartSheetId, definition.labelRange, applyChange)
      : undefined;
    return {
      ...definition,
      type: "bubble",
      xRange:
        adaptedXRange && adaptedXRange !== CellErrorType.InvalidReference
          ? adaptedXRange
          : undefined,
      sizeRange:
        adaptedSizeRange && adaptedSizeRange !== CellErrorType.InvalidReference
          ? adaptedSizeRange
          : undefined,
      yRange:
        adaptedYRange && adaptedYRange !== CellErrorType.InvalidReference
          ? adaptedYRange
          : undefined,
      labelRange:
        adaptedLabelRange && adaptedLabelRange !== CellErrorType.InvalidReference
          ? adaptedLabelRange
          : undefined,
    };
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): BubbleChartDefinition {
    return {
      background: context.background,
      yRange: context.range?.[0]?.dataRange ?? "",
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "bubble",
      labelRange: context.auxiliaryRange || undefined,
      xRange: context.bubbleXRange || undefined,
      sizeRange: context.bubbleSizeRange || undefined,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      humanize: context.humanize,
      colorMode: context.bubbleColorMode || "multiple",
      verticalAxisPosition: "left",
    };
  }

  getDefinition(): BubbleChartDefinition {
    return this.getDefinitionWithSpecificDataSets(
      this.yRange,
      this.labelRange,
      this.xRange,
      this.sizeRange
    );
  }

  private getDefinitionWithSpecificDataSets(
    yRange: Range | undefined,
    labelRange: Range | undefined,
    xRange: Range | undefined,
    sizeRange: Range | undefined,
    targetSheetId?: UID
  ): BubbleChartDefinition {
    return {
      type: "bubble",
      background: this.background,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      xRange: xRange
        ? this.getters.getRangeString(xRange, targetSheetId || this.sheetId)
        : undefined,
      sizeRange: sizeRange
        ? this.getters.getRangeString(sizeRange, targetSheetId || this.sheetId)
        : undefined,
      yRange: yRange
        ? this.getters.getRangeString(yRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      axesDesign: this.axesDesign,
      showValues: this.showValues,
      humanize: this.humanize,
      colorMode: this.colorMode,
      verticalAxisPosition: this.verticalAxisPosition,
    };
  }

  getContextCreation(): ChartCreationContext {
    const ranges = this.yRange
      ? [
          {
            dataRange: this.getters.getRangeString(this.yRange, this.sheetId),
          },
        ]
      : undefined;
    return {
      ...this,
      ranges,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
      bubbleXRange: this.xRange
        ? this.getters.getRangeString(this.xRange, this.sheetId)
        : undefined,
      bubbleSizeRange: this.sizeRange
        ? this.getters.getRangeString(this.sizeRange, this.sheetId)
        : undefined,
      bubbleColorMode: this.colorMode,
    };
  }

  updateRanges(applyChange: ApplyRangeChange): BubbleChart {
    let xRange = this.xRange;
    const adaptedXRange = adaptChartRange(this.xRange, applyChange);
    if (adaptedXRange !== this.xRange) {
      xRange = adaptedXRange;
    }
    let sizeRange = this.sizeRange;
    const adaptedSizeRange = adaptChartRange(this.sizeRange, applyChange);
    if (adaptedSizeRange !== this.sizeRange) {
      sizeRange = adaptedSizeRange;
    }
    let labelRange = this.labelRange;
    const adaptedLabelRange = adaptChartRange(this.labelRange, applyChange);
    if (adaptedLabelRange !== this.labelRange) {
      labelRange = adaptedLabelRange;
    }
    let yRange = this.yRange;
    const adaptedYRange = adaptChartRange(this.yRange, applyChange);
    if (adaptedYRange !== this.yRange) {
      yRange = adaptedYRange;
    }
    if (
      xRange === this.xRange &&
      sizeRange === this.sizeRange &&
      labelRange === this.labelRange &&
      yRange === this.yRange
    ) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(
      yRange,
      labelRange,
      xRange,
      sizeRange
    );
    return new BubbleChart(definition, this.sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  duplicateInDuplicatedSheet(newSheetId: UID): BubbleChart {
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const xRange = duplicateLabelRangeInDuplicatedSheet(this.sheetId, newSheetId, this.xRange);
    const yRange = duplicateLabelRangeInDuplicatedSheet(this.sheetId, newSheetId, this.yRange);
    const sizeRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.sizeRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(
      yRange,
      labelRange,
      xRange,
      sizeRange,
      newSheetId
    );
    return new BubbleChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): BubbleChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.yRange,
      this.labelRange,
      this.xRange,
      this.sizeRange,
      sheetId
    );
    return new BubbleChart(definition, sheetId, this.getters);
  }
}

export function createBubbleChartRuntime(chart: BubbleChart, getters: Getters): BubbleChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getBubbleChartData(chart, getters);
  const config: ChartConfiguration<"bubble"> = {
    type: "bubble",
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
      },
    },
  };

  return {
    chartJsConfig: config,
    background: chart.background || BACKGROUND_CHART_COLOR,
  };
}

function checkBubbleChartAdditionalRanges(definition: BubbleChartDefinition): CommandResult {
  if (definition.xRange && !rangeReference.test(definition.xRange)) {
    return CommandResult.InvalidLabelRange;
  }
  if (definition.sizeRange && !rangeReference.test(definition.sizeRange)) {
    return CommandResult.InvalidLabelRange;
  }
  return CommandResult.Success;
}
