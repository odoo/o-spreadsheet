import { CellErrorType, CoreGetters, rangeReference, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  adaptChartRange,
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { adaptStringRange } from "@odoo/o-spreadsheet-engine/helpers/formulas";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  AxesDesign,
  ChartCreationContext,
  CustomizedDataSet,
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
  DataSet,
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

export class BubbleChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly xRange?: Range | undefined;
  readonly sizeRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly aggregated?: boolean;
  readonly type = "bubble";
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly zoomable?: boolean;
  readonly colorMode: BubbleColorMode;
  readonly verticalAxisPosition: VerticalAxisPosition;

  constructor(definition: BubbleChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(this.getters, definition.dataSets, sheetId, false);
    this.labelRange = createValidRange(this.getters, sheetId, definition.labelRange);
    this.xRange = createValidRange(this.getters, sheetId, definition.xRange);
    this.sizeRange = createValidRange(this.getters, sheetId, definition.sizeRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.labelsAsText = definition.labelsAsText ?? false;
    this.aggregated = definition.aggregated;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.showValues = definition.showValues;
    this.zoomable = definition.zoomable;
    this.colorMode = definition.colorMode || "single";
    this.verticalAxisPosition = definition.verticalAxisPosition;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: BubbleChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(
      definition,
      checkDataset,
      checkLabelRange,
      checkBubbleChartAdditionalRanges
    );
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: BubbleChartDefinition,
    applyChange: RangeAdapter
  ): BubbleChartDefinition {
    const transformed = transformChartDefinitionWithDataSetsWithZone(
      chartSheetId,
      definition,
      applyChange
    );
    const adaptedXRange = definition.xRange
      ? adaptStringRange(chartSheetId, definition.xRange, applyChange)
      : undefined;
    const adaptedSizeRange = definition.sizeRange
      ? adaptStringRange(chartSheetId, definition.sizeRange, applyChange)
      : undefined;
    return {
      ...transformed,
      type: "bubble",
      xRange:
        adaptedXRange && adaptedXRange !== CellErrorType.InvalidReference
          ? adaptedXRange
          : undefined,
      sizeRange:
        adaptedSizeRange && adaptedSizeRange !== CellErrorType.InvalidReference
          ? adaptedSizeRange
          : undefined,
    };
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): BubbleChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: false,
      labelsAsText: context.labelsAsText ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "bubble",
      labelRange: context.bubbleLabelRange || undefined,
      xRange: context.bubbleXRange || undefined,
      sizeRange: context.bubbleSizeRange || undefined,
      aggregated: context.aggregated ?? false,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      zoomable: context.zoomable,
      humanize: context.humanize,
      colorMode: context.bubbleColorMode || "single",
      verticalAxisPosition: "left",
    };
  }

  getDefinition(): BubbleChartDefinition {
    return this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      this.xRange,
      this.sizeRange
    );
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    xRange: Range | undefined,
    sizeRange: Range | undefined,
    targetSheetId?: UID
  ): BubbleChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "bubble",
      dataSetsHaveTitle: false,
      background: this.background,
      dataSets: ranges,
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
      title: this.title,
      labelsAsText: this.labelsAsText,
      aggregated: this.aggregated,
      axesDesign: this.axesDesign,
      showValues: this.showValues,
      zoomable: this.zoomable,
      humanize: this.humanize,
      colorMode: this.colorMode,
      verticalAxisPosition: this.verticalAxisPosition,
    };
  }

  getContextCreation(): ChartCreationContext {
    const range: CustomizedDataSet[] = [];
    for (const [i, dataSet] of this.dataSets.entries()) {
      range.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, this.sheetId),
      });
    }
    return {
      ...this,
      range,
      bubbleLabelRange: this.labelRange
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
    const { dataSets, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRange
    );
    let xRange = this.xRange;
    let sizeRange = this.sizeRange;
    const adaptedXRange = adaptChartRange(this.xRange, applyChange);
    if (adaptedXRange !== this.xRange) {
      xRange = adaptedXRange;
    }
    const adaptedSizeRange = adaptChartRange(this.sizeRange, applyChange);
    if (adaptedSizeRange !== this.sizeRange) {
      sizeRange = adaptedSizeRange;
    }
    if (!isStale && xRange === this.xRange && sizeRange === this.sizeRange) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(
      dataSets,
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
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const xRange = duplicateLabelRangeInDuplicatedSheet(this.sheetId, newSheetId, this.xRange);
    const sizeRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.sizeRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(
      dataSets,
      labelRange,
      xRange,
      sizeRange,
      newSheetId
    );
    return new BubbleChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): BubbleChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
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
  const chartData = getBubbleChartData(definition, chart, getters);
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
