import type { ChartDataset, LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import { BACKGROUND_CHART_COLOR, BORDER_CHART_COLOR } from "../../../constants";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import { BarChartDefinition, BarChartRuntime } from "../../../types/chart/bar_chart";
import {
  AxesDesign,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { LegendPosition } from "../../../types/chart/common_chart";
import { CellErrorType } from "../../../types/errors";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  TREND_LINE_XAXIS_ID,
  chartFontColor,
  checkDataset,
  checkLabelRange,
  computeChartPadding,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  formatTickValue,
  getChartAxisTitleRuntime,
  getChartColorsGenerator,
  getDefinedAxis,
  getTrendDatasetForBarChart,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import {
  aggregateDataForLabels,
  filterEmptyDataPoints,
  getChartDatasetFormat,
  getChartDatasetValues,
  getChartLabelValues,
  getDefaultChartJsRuntime,
} from "./chart_ui_common";

export class BarChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly type = "bar";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
  readonly horizontal?: boolean;
  readonly showValues?: boolean;

  constructor(definition: BarChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    this.axesDesign = definition.axesDesign;
    this.horizontal = definition.horizontal;
    this.showValues = definition.showValues;
  }

  static transformDefinition(
    definition: BarChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): BarChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: BarChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): BarChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "bar",
      labelRange: context.auxiliaryRange || undefined,
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

  copyForSheetId(sheetId: UID): BarChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new BarChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): BarChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new BarChart(definition, sheetId, this.getters);
  }

  getDefinition(): BarChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): BarChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "bar",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      stacked: this.stacked,
      aggregated: this.aggregated,
      axesDesign: this.axesDesign,
      horizontal: this.horizontal,
      showValues: this.showValues,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // Excel does not support aggregating labels
    if (this.aggregated) return undefined;
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

  updateRanges(applyChange: ApplyRangeChange): BarChart {
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
    return new BarChart(definition, this.sheetId, this.getters);
  }
}

export function createBarChartRuntime(chart: BarChart, getters: Getters): BarChartRuntime {
  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  let labels = labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, chart.dataSets);
  if (
    chart.dataSetsHaveTitle &&
    dataSetsValues[0] &&
    labels.length > dataSetsValues[0].data.length
  ) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterEmptyDataPoints(labels, dataSetsValues));
  if (chart.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }

  const dataSetFormat = getChartDatasetFormat(getters, chart.dataSets);
  const locale = getters.getLocale();
  const localeFormat = { format: dataSetFormat, locale };
  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime(chart, labels, fontColor, {
    ...localeFormat,
    horizontalChart: chart.horizontal,
  });
  const legend: DeepPartial<LegendOptions<"bar">> = {
    labels: { color: fontColor },
  };
  if (chart.legendPosition === "none") {
    legend.display = false;
  } else {
    legend.position = chart.legendPosition;
  }
  config.options.plugins!.legend = { ...config.options.plugins?.legend, ...legend };
  config.options.layout = {
    padding: computeChartPadding({
      displayTitle: !!chart.title.text,
      displayLegend: chart.legendPosition === "top",
    }),
  };
  config.options.indexAxis = chart.horizontal ? "y" : "x";

  config.options.scales = {};
  const labelsAxis = { ticks: { padding: 5, color: fontColor } };
  const valuesAxis = {
    beginAtZero: true, // the origin of the y axis is always zero
    ticks: {
      color: fontColor,
      callback: formatTickValue(localeFormat),
    },
  };

  const xAxis = chart.horizontal ? valuesAxis : labelsAxis;
  const yAxis = chart.horizontal ? labelsAxis : valuesAxis;
  const { useLeftAxis, useRightAxis } = getDefinedAxis(chart.getDefinition());

  config.options.scales.x = { ...xAxis, title: getChartAxisTitleRuntime(chart.axesDesign?.x) };
  if (useLeftAxis) {
    config.options.scales.y = {
      ...yAxis,
      position: "left",
      title: getChartAxisTitleRuntime(chart.axesDesign?.y),
    };
  }
  if (useRightAxis) {
    config.options.scales.y1 = {
      ...yAxis,
      position: "right",
      title: getChartAxisTitleRuntime(chart.axesDesign?.y1),
    };
  }
  if (chart.stacked) {
    // @ts-ignore chart.js type is broken
    config.options.scales!.x!.stacked = true;
    if (useLeftAxis) {
      // @ts-ignore chart.js type is broken
      config.options.scales!.y!.stacked = true;
    }
    if (useRightAxis) {
      // @ts-ignore chart.js type is broken
      config.options.scales!.y1!.stacked = true;
    }
  }

  config.options.plugins!.chartShowValuesPlugin = {
    showValues: chart.showValues,
    background: chart.background,
    horizontal: chart.horizontal,
    callback: formatTickValue(localeFormat),
  };

  const definition = chart.getDefinition();
  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  const trendDatasets: any[] = [];
  for (const index in dataSetsValues) {
    const { label, data } = dataSetsValues[index];
    const color = colors.next();
    const dataset: ChartDataset<"bar", number[]> = {
      label,
      data,
      borderColor: BORDER_CHART_COLOR,
      borderWidth: 1,
      backgroundColor: color,
    };
    config.data.datasets.push(dataset);

    if (definition.dataSets?.[index]?.label) {
      const label = definition.dataSets[index].label;
      dataset.label = label;
    }
    if (definition.dataSets?.[index]?.yAxisId && !chart.horizontal) {
      dataset["yAxisID"] = definition.dataSets[index].yAxisId;
    }

    const trend = definition.dataSets?.[index].trend;
    if (!trend?.display || chart.horizontal) {
      continue;
    }

    const trendDataset = getTrendDatasetForBarChart(trend, dataset);
    if (trendDataset) {
      trendDatasets.push(trendDataset);
    }
  }
  if (trendDatasets.length) {
    /* We add a second x axis here to draw the trend lines, with the labels length being
     * set so that the second axis points match the classical x axis
     */
    const maxLength = Math.max(...trendDatasets.map((trendDataset) => trendDataset.data.length));
    config.options.scales[TREND_LINE_XAXIS_ID] = {
      ...xAxis,
      labels: Array(maxLength).fill(""),
      offset: false,
      display: false,
    };
    /* These datasets must be inserted after the original
     * datasets to ensure the way we distinguish the originals and trendLine datasets after
     */
    trendDatasets.forEach((x) => config.data.datasets!.push(x));
  }

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
