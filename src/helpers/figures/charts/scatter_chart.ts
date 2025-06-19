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
  ExcelChartDataset,
  ExcelChartDefinition,
  TitleDesign,
} from "../../../types/chart/chart";
import { LegendPosition } from "../../../types/chart/common_chart";
import { ScatterChartDefinition, ScatterChartRuntime } from "../../../types/chart/scatter_chart";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyAxesDesignWithNewSheetId,
  copyChartTitleWithNewSheetId,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  getDefinedAxis,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import {
  getChartLayout,
  getChartShowValues,
  getChartTitle,
  getLineChartData,
  getLineChartTooltip,
  getScatterChartDatasets,
  getScatterChartLegend,
  getScatterChartScales,
} from "./runtime";

export class ScatterChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly aggregated?: boolean;
  readonly type = "scatter";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;

  constructor(definition: ScatterChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      this.getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(this.getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.labelsAsText = definition.labelsAsText;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.showValues = definition.showValues;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ScatterChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: ScatterChartDefinition,
    applyChange: RangeAdapter
  ): ScatterChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ScatterChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      labelsAsText: context.labelsAsText ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "scatter",
      labelRange: context.auxiliaryRange || undefined,
      aggregated: context.aggregated ?? false,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
    };
  }

  getDefinition(): ScatterChartDefinition {
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
  ): ScatterChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "scatter",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title,
      labelsAsText: this.labelsAsText,
      aggregated: this.aggregated,
      axesDesign,
      showValues: this.showValues,
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

  updateRanges(applyChange: ApplyRangeChange): ScatterChart {
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
    return new ScatterChart(definition, this.sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // Excel does not support aggregating labels
    if (this.aggregated) {
      return undefined;
    }
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== "");
    const labelRange = toExcelLabelRange(
      this.getters,
      this.labelRange,
      shouldRemoveFirstLabel(this.labelRange, this.dataSets[0], this.dataSetsHaveTitle)
    );
    const definition = this.getDefinition();
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRange,
      verticalAxis: getDefinedAxis(definition),
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): ScatterChart {
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
    return new ScatterChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ScatterChart {
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
    return new ScatterChart(definition, sheetId, this.getters);
  }
}

export function createScatterChartRuntime(
  chart: ScatterChart,
  getters: Getters
): ScatterChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getLineChartData(definition, chart.dataSets, chart.labelRange, getters);

  const config: ChartConfiguration = {
    // use chartJS line chart and disable the lines instead of chartJS scatter chart. This is because the scatter chart
    // have less options than the line chart (it only works with linear labels)
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: getScatterChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getScatterChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, chartData),
        legend: getScatterChartLegend(definition, chartData),
        tooltip: getLineChartTooltip(definition, chartData),
        chartShowValuesPlugin: getChartShowValues(definition, chartData),
      },
    },
  };

  return {
    chartJsConfig: config,
    background: chart.background || BACKGROUND_CHART_COLOR,
  };
}
