import type { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RangeAdapter,
  UID,
} from "../../../types";
import {
  AxesDesign,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  ExcelChartDefinition,
  TitleDesign,
} from "../../../types/chart/chart";
import { LegendPosition, VerticalAxisPosition } from "../../../types/chart/common_chart";
import {
  WaterfallChartDefinition,
  WaterfallChartRuntime,
} from "../../../types/chart/waterfall_chart";
import { Validator } from "../../../types/validator";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  copyAxesDesignWithNewSheetId,
  copyChartTitleWithNewSheetId,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import {
  getBarChartData,
  getChartLayout,
  getChartTitle,
  getWaterfallChartLegend,
  getWaterfallChartScales,
  getWaterfallChartShowValues,
  getWaterfallChartTooltip,
  getWaterfallDatasetAndLabels,
} from "./runtime";

export class WaterfallChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly type = "waterfall";
  readonly dataSetsHaveTitle: boolean;
  readonly showSubTotals: boolean;
  readonly firstValueAsSubtotal?: boolean;
  readonly showConnectorLines: boolean;
  readonly positiveValuesColor?: Color;
  readonly negativeValuesColor?: Color;
  readonly subTotalValuesColor?: Color;
  readonly dataSetDesign: CustomizedDataSet[];
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;

  constructor(definition: WaterfallChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.verticalAxisPosition = definition.verticalAxisPosition;
    this.legendPosition = definition.legendPosition;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.showSubTotals = definition.showSubTotals;
    this.showConnectorLines = definition.showConnectorLines;
    this.positiveValuesColor = definition.positiveValuesColor;
    this.negativeValuesColor = definition.negativeValuesColor;
    this.subTotalValuesColor = definition.subTotalValuesColor;
    this.firstValueAsSubtotal = definition.firstValueAsSubtotal;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.showValues = definition.showValues;
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: WaterfallChartDefinition,
    applyChange: RangeAdapter
  ): WaterfallChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: WaterfallChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): WaterfallChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ? context.range : [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "waterfall",
      verticalAxisPosition: "left",
      labelRange: context.auxiliaryRange || undefined,
      showSubTotals: context.showSubTotals ?? false,
      showConnectorLines: context.showConnectorLines ?? true,
      firstValueAsSubtotal: context.firstValueAsSubtotal ?? false,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
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
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): WaterfallChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const updatedChartTitle = copyChartTitleWithNewSheetId(
      this.getters,
      this.sheetId,
      newSheetId,
      this.title,
      "moveReference"
    );
    const updatedAxesDesign = copyAxesDesignWithNewSheetId(
      this.getters,
      this.sheetId,
      newSheetId,
      this.axesDesign,
      "moveReference"
    );
    const definition = this.getDefinitionWithSpecifiedProperties(
      dataSets,
      labelRange,
      updatedChartTitle,
      updatedAxesDesign,
      newSheetId
    );
    return new WaterfallChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): WaterfallChart {
    const updatedChartTitle = copyChartTitleWithNewSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.title,
      "keepSameReference"
    );
    const updatedAxesDesign = copyAxesDesignWithNewSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.axesDesign,
      "keepSameReference"
    );
    const definition = this.getDefinitionWithSpecifiedProperties(
      this.dataSets,
      this.labelRange,
      updatedChartTitle,
      updatedAxesDesign,
      sheetId
    );
    return new WaterfallChart(definition, sheetId, this.getters);
  }

  getDefinition(): WaterfallChartDefinition {
    return this.getDefinitionWithSpecifiedProperties(
      this.dataSets,
      this.labelRange,
      this.title,
      this.axesDesign
    );
  }

  private getDefinitionWithSpecifiedProperties(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    title: TitleDesign,
    axesDesign?: AxesDesign,
    targetSheetId?: UID
  ): WaterfallChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "waterfall",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      verticalAxisPosition: this.verticalAxisPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title,
      aggregated: this.aggregated,
      showSubTotals: this.showSubTotals,
      showConnectorLines: this.showConnectorLines,
      positiveValuesColor: this.positiveValuesColor,
      negativeValuesColor: this.negativeValuesColor,
      subTotalValuesColor: this.subTotalValuesColor,
      firstValueAsSubtotal: this.firstValueAsSubtotal,
      axesDesign,
      showValues: this.showValues,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // TODO: implement export excel
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): WaterfallChart {
    const { dataSets, labelRange, chartTitle, axesDesign, isStale } = updateChartRangesWithDataSets(
      this.getters,
      this.sheetId,
      applyChange,
      this.dataSets,
      this.title,
      this.axesDesign,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecifiedProperties(
      dataSets,
      labelRange,
      chartTitle,
      axesDesign
    );
    return new WaterfallChart(definition, this.sheetId, this.getters);
  }
}

export function createWaterfallChartRuntime(
  chart: WaterfallChart,
  getters: Getters
): WaterfallChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getBarChartData(definition, chart.dataSets, chart.labelRange, getters);

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
        title: getChartTitle(definition, chartData),
        legend: getWaterfallChartLegend(definition, chartData),
        tooltip: getWaterfallChartTooltip(definition, chartData),
        chartShowValuesPlugin: getWaterfallChartShowValues(definition, chartData),
        waterfallLinesPlugin: { showConnectorLines: definition.showConnectorLines },
      },
    },
  };

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
