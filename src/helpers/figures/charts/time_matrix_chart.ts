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
import { BarChartDefinition, BarChartRuntime } from "../../../types/chart/bar_chart";
import {
  AxesDesign,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { GeoChartColorScale } from "../../../types/chart/geo_chart";
import {
  TimeMatrixChartDefinition,
  TimeMatrixGroupBy,
} from "../../../types/chart/time_matrix_chart";
import { Validator } from "../../../types/validator";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  checkDataset,
  checkLabelRange,
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
  getTimeMatrixChartDatasetAndLabels,
  getTimeMatrixChartScales,
  getTimeMatrixShowValues,
  getTimeMatrixTooltip,
} from "./runtime";

export class TimeMatrixChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly type = "timeMatrix";
  readonly showValues?: boolean;
  readonly colorScale?: GeoChartColorScale;
  readonly axesDesign?: AxesDesign;
  readonly xStamp?: TimeMatrixGroupBy;
  readonly yStamp?: TimeMatrixGroupBy;
  readonly showColorBar?: boolean;

  constructor(definition: TimeMatrixChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, [{ dataRange: definition.dataRange }], sheetId, false);
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.showValues = definition.showValues;
    this.colorScale = definition.colorScale;
    this.axesDesign = definition.axesDesign;
    this.xStamp = definition.xStamp;
    this.yStamp = definition.yStamp;
    this.showColorBar = definition.showColorBar;
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: BarChartDefinition,
    applyChange: RangeAdapter
  ): BarChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: BarChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): TimeMatrixChartDefinition {
    return {
      background: context.background,
      dataRange: context.range?.[0].dataRange ?? "",
      title: context.title || { text: "" },
      type: "timeMatrix",
      labelRange: context.auxiliaryRange || undefined,
      showValues: context.showValues,
      axesDesign: context.axesDesign,
    };
  }

  getContextCreation(): ChartCreationContext {
    const range: CustomizedDataSet[] = [
      { dataRange: this.getters.getRangeString(this.dataSets[0].dataRange, this.sheetId) },
    ];
    return {
      ...this,
      range,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): TimeMatrixChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, newSheetId);
    return new TimeMatrixChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): TimeMatrixChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new TimeMatrixChart(definition, sheetId, this.getters);
  }

  getDefinition(): TimeMatrixChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): TimeMatrixChartDefinition {
    const ranges: CustomizedDataSet[] = [
      {
        dataRange: this.getters.getRangeString(
          dataSets[0].dataRange,
          targetSheetId || this.sheetId
        ),
      },
    ];
    return {
      type: "timeMatrix",
      background: this.background,
      dataRange: ranges[0]?.dataRange || "",
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      showValues: this.showValues,
      colorScale: this.colorScale,
      axesDesign: this.axesDesign,
      xStamp: this.xStamp,
      yStamp: this.yStamp,
      showColorBar: this.showColorBar,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): TimeMatrixChart {
    const { dataSets, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange);
    return new TimeMatrixChart(definition, this.sheetId, this.getters);
  }
}

export function createTimeMatrixChartRuntime(
  chart: TimeMatrixChart,
  getters: Getters
): BarChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getBarChartData(definition, chart.dataSets, chart.labelRange, getters);
  const { labels, datasets } = getTimeMatrixChartDatasetAndLabels(definition, chartData);

  const config: ChartConfiguration = {
    type: "bar",
    data: {
      labels,
      datasets,
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      indexAxis: "x",
      layout: getChartLayout(definition, chartData),
      scales: getTimeMatrixChartScales(definition, datasets),
      plugins: {
        title: getChartTitle(definition),
        legend: { display: false },
        tooltip: getTimeMatrixTooltip(definition, chartData),
        chartShowValuesPlugin: getTimeMatrixShowValues(definition, chartData),
      },
    },
  };

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
