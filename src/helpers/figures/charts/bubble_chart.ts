import {
  CoreGetters,
  RangeAdapterFunctions,
  rangeReference,
  Validator,
} from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  adaptChartRange,
  checkDataset,
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
  DataSet,
  DatasetDesign,
  ExcelChartDefinition,
  LegendPosition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import {
  BubbleChartDefinition,
  BubbleChartRuntime,
  BubbleColorMode,
} from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { ChartConfiguration } from "chart.js";
import {
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
import { getScatterChartScales } from "./runtime/chartjs_scales";
import { getBubbleChartTooltip } from "./runtime/chartjs_tooltip";

export interface BubbleChartData extends ChartRuntimeGenerationArgs {
  bubbleSizes: number[];
  bubbleLabels: string[];
}

function checkRanges(definition: BubbleChartDefinition): CommandResult {
  const invalidRanges =
    (definition.labelRange && !rangeReference.test(definition.labelRange)) ||
    (definition.xRange && !rangeReference.test(definition.xRange)) ||
    (definition.sizeRange && !rangeReference.test(definition.sizeRange));
  if (invalidRanges) {
    return CommandResult.InvalidChartDefinition;
  }
  return CommandResult.Success;
}

export class BubbleChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly xRange?: Range | undefined;
  readonly sizeRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly type = "bubble";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly zoomable?: boolean;
  readonly bubbleColor: BubbleColorMode;

  constructor(definition: BubbleChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      this.getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(this.getters, sheetId, definition.labelRange);
    this.xRange = createValidRange(this.getters, sheetId, definition.xRange);
    this.sizeRange = createValidRange(this.getters, sheetId, definition.sizeRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.labelsAsText = definition.labelsAsText;
    this.axesDesign = definition.axesDesign;
    this.showValues = definition.showValues;
    this.bubbleColor = definition.bubbleColor;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: BubbleChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkRanges);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: BubbleChartDefinition,
    applyChange: RangeAdapter
  ): BubbleChartDefinition {
    const adaptRange = (range: string | undefined): string | undefined => {
      if (!range) {
        return undefined;
      }
      const { changeType, range: adaptedRange } = adaptStringRange(
        chartSheetId,
        range,
        applyChange
      );
      return changeType !== "REMOVE" ? adaptedRange : undefined;
    };
    return {
      ...transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange),
      xRange: adaptRange(definition.xRange),
      sizeRange: adaptRange(definition.sizeRange),
      labelRange: adaptRange(definition.labelRange),
    };
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): BubbleChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
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
      background: this.background,
      legendPosition: this.legendPosition,
      dataSets: ranges,
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      labelsAsText: this.labelsAsText,
      xRange: xRange
        ? this.getters.getRangeString(xRange, targetSheetId || this.sheetId)
        : undefined,
      sizeRange: sizeRange
        ? this.getters.getRangeString(sizeRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      axesDesign: this.axesDesign,
      showValues: this.showValues,
      humanize: this.humanize,
      bubbleColor: this.bubbleColor,
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
      auxiliaryRange: this.xRange
        ? this.getters.getRangeString(this.xRange, this.sheetId)
        : undefined,
      bubbleSizeRange: this.sizeRange
        ? this.getters.getRangeString(this.sizeRange, this.sheetId)
        : undefined,
      bubbleColorMode: this.bubbleColor,
    };
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): BubbleChart {
    let updated = false;
    const adaptRange = (range: Range | undefined): Range | undefined => {
      const adaptedRange = adaptChartRange(range, applyChange);
      if (adaptedRange !== range) {
        updated = true;
      }
      return adaptedRange;
    };
    const { dataSets, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const xRange = adaptRange(this.xRange);
    const sizeRange = adaptRange(this.sizeRange);
    if (!updated) {
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
      scales: getScatterChartScales(definition, chartData),
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
