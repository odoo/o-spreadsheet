import { ChartConfiguration } from "chart.js";
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
  DatasetDesign,
  ExcelChartDefinition,
  TitleDesign,
} from "../../../types/chart/chart";
import { LegendPosition } from "../../../types/chart/common_chart";
import { PyramidChartDefinition, PyramidChartRuntime } from "../../../types/chart/pyramid_chart";
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
  getBarChartDatasets,
  getBarChartLegend,
  getChartLayout,
  getChartTitle,
  getPyramidChartData,
  getPyramidChartScales,
  getPyramidChartShowValues,
  getPyramidChartTooltip,
} from "./runtime";

export class PyramidChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly type = "pyramid";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
  readonly horizontal = true;
  readonly stacked = true;
  readonly showValues?: boolean;

  constructor(definition: PyramidChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.showValues = definition.showValues;
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: PyramidChartDefinition,
    applyChange: RangeAdapter
  ): PyramidChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: PyramidChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): PyramidChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "pyramid",
      labelRange: context.auxiliaryRange || undefined,
      axesDesign: context.axesDesign,
      horizontal: true,
      stacked: true,
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

  duplicateInDuplicatedSheet(newSheetId: UID): PyramidChart {
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
    return new PyramidChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): PyramidChart {
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
    return new PyramidChart(definition, sheetId, this.getters);
  }

  getDefinition(): PyramidChartDefinition {
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
  ): PyramidChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "pyramid",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title,
      aggregated: this.aggregated,
      axesDesign,
      horizontal: true,
      stacked: true,
      showValues: this.showValues,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): PyramidChart {
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
    return new PyramidChart(definition, this.sheetId, this.getters);
  }
}

export function createPyramidChartRuntime(
  chart: PyramidChart,
  getters: Getters
): PyramidChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getPyramidChartData(definition, chart.dataSets, chart.labelRange, getters);

  const config: ChartConfiguration = {
    type: "bar",
    data: {
      labels: chartData.labels,
      datasets: getBarChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      indexAxis: "y",
      layout: getChartLayout(definition, chartData),
      scales: getPyramidChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, chartData),
        legend: getBarChartLegend(definition, chartData),
        tooltip: getPyramidChartTooltip(definition, chartData),
        chartShowValuesPlugin: getPyramidChartShowValues(definition, chartData),
      },
    },
  };

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
