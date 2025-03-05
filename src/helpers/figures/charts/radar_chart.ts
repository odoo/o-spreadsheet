import { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  DatasetDesign,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import {
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  ExcelChartDataset,
  ExcelChartDefinition,
  LegendPosition,
  TitleDesign,
} from "../../../types/chart";
import { RadarChartDefinition, RadarChartRuntime } from "../../../types/chart/radar_chart";
import { CellErrorType } from "../../../types/errors";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyChartTitleWithNewSheetId,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
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
  getRadarChartData,
  getRadarChartDatasets,
  getRadarChartLegend,
  getRadarChartScales,
  getRadarChartTooltip,
} from "./runtime";

export class RadarChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly type = "radar";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly fillArea?: boolean;
  readonly showValues?: boolean;

  constructor(definition: RadarChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    this.stacked = definition.stacked;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.fillArea = definition.fillArea;
    this.showValues = definition.showValues;
  }

  static transformDefinition(
    definition: RadarChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): RadarChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: RadarChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): RadarChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "radar",
      labelRange: context.auxiliaryRange || undefined,
      fillArea: context.fillArea ?? false,
      showValues: context.showValues ?? false,
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

  duplicateInDuplicatedSheet(newSheetId: UID): RadarChart {
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
    const definition = this.getDefinitionWithSpecifiedProperties(
      dataSets,
      labelRange,
      updatedChartTitle,
      newSheetId
    );
    return new RadarChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): RadarChart {
    const updatedChartTitle = copyChartTitleWithNewSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.title,
      "keepSameReference"
    );
    const definition = this.getDefinitionWithSpecifiedProperties(
      this.dataSets,
      this.labelRange,
      updatedChartTitle,
      sheetId
    );
    return new RadarChart(definition, sheetId, this.getters);
  }

  getDefinition(): RadarChartDefinition {
    return this.getDefinitionWithSpecifiedProperties(this.dataSets, this.labelRange, this.title);
  }

  private getDefinitionWithSpecifiedProperties(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    title: TitleDesign,
    targetSheetId?: UID
  ): RadarChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "radar",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title,
      stacked: this.stacked,
      aggregated: this.aggregated,
      fillArea: this.fillArea,
      showValues: this.showValues,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
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
    };
  }

  updateRanges(applyChange: ApplyRangeChange): RadarChart {
    const { dataSets, labelRange, chartTitle, isStale } = updateChartRangesWithDataSets(
      this.getters,
      this.sheetId,
      applyChange,
      this.dataSets,
      this.title,
      undefined,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecifiedProperties(dataSets, labelRange, chartTitle);
    return new RadarChart(definition, this.sheetId, this.getters);
  }
}

export function createRadarChartRuntime(chart: RadarChart, getters: Getters): RadarChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getRadarChartData(definition, chart.dataSets, chart.labelRange, getters);

  const config: ChartConfiguration = {
    type: "radar",
    data: {
      labels: chartData.labels,
      datasets: getRadarChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition),
      scales: getRadarChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, chartData),
        legend: getRadarChartLegend(definition, chartData),
        tooltip: getRadarChartTooltip(definition, chartData),
        chartShowValuesPlugin: getChartShowValues(definition, chartData),
      },
    },
  };

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
