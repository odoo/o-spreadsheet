import { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  ApplyRangeChange,
  ChartCreationContext,
  Color,
  CommandResult,
  CoreGetters,
  DataSet,
  ExcelChartDefinition,
  Getters,
  Range,
  RangeAdapter,
  UID,
} from "../../../types";
import {
  AxesDesign,
  CustomizedDataSet,
  ExcelChartDataset,
  LegendPosition,
  TitleDesign,
} from "../../../types/chart";
import {
  ComboChartDataSet,
  ComboChartDefinition,
  ComboChartRuntime,
} from "../../../types/chart/combo_chart";
import { CellErrorType } from "../../../types/errors";
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
  getBarChartData,
  getBarChartScales,
  getBarChartTooltip,
  getChartLayout,
  getChartShowValues,
  getChartTitle,
  getComboChartDatasets,
  getComboChartLegend,
} from "./runtime";

export class ComboChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: ComboChartDataSet[];
  readonly axesDesign?: AxesDesign;
  readonly type = "combo";
  readonly showValues?: boolean;
  readonly hideDataMarkers?: boolean;

  constructor(definition: ComboChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    this.hideDataMarkers = definition.hideDataMarkers;
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: ComboChartDefinition,
    applyChange: RangeAdapter
  ): ComboChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ComboChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
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

  getDefinition(): ComboChartDefinition {
    return this.getDefinitionWithSpecifiedProperties(
      this.dataSets,
      this.labelRange,
      this.title,
      this.axesDesign
    );
  }

  getDefinitionWithSpecifiedProperties(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    title: TitleDesign,
    axesDesign?: AxesDesign,
    targetSheetId?: UID
  ): ComboChartDefinition {
    const ranges: ComboChartDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
        type: this.dataSetDesign?.[i]?.type ?? (i ? "line" : "bar"),
      });
    }
    return {
      type: "combo",
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
      showValues: this.showValues,
      hideDataMarkers: this.hideDataMarkers,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // Excel does not support aggregating labels
    if (this.aggregated) {
      return undefined;
    }
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== "" && ds.range !== CellErrorType.InvalidReference);
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

  updateRanges(applyChange: ApplyRangeChange): ComboChart {
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
    return new ComboChart(definition, this.sheetId, this.getters);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ComboChartDefinition {
    const dataSets: ComboChartDataSet[] = (context.range ?? []).map((ds, index) => ({
      ...ds,
      type: index ? "line" : "bar",
    }));
    return {
      background: context.background,
      dataSets,
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      aggregated: context.aggregated,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      labelRange: context.auxiliaryRange || undefined,
      type: "combo",
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      hideDataMarkers: context.hideDataMarkers,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): ComboChart {
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
    return new ComboChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ComboChart {
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
    return new ComboChart(definition, sheetId, this.getters);
  }
}

export function createComboChartRuntime(chart: ComboChart, getters: Getters): ComboChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getBarChartData(definition, chart.dataSets, chart.labelRange, getters);

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
        title: getChartTitle(definition, chartData),
        legend: getComboChartLegend(definition, chartData),
        tooltip: getBarChartTooltip(definition, chartData),
        chartShowValuesPlugin: getChartShowValues(definition, chartData),
      },
    },
  };

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
