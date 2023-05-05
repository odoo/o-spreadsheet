import { ChartConfiguration, ChartDataSets, ChartLegendOptions } from "chart.js";
import { BACKGROUND_CHART_COLOR, LINE_FILL_TRANSPARENCY } from "../../../constants";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  LocaleFormat,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import {
  AxisType,
  ChartCreationContext,
  DataSet,
  DatasetValues,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { LegendPosition, VerticalAxisPosition } from "../../../types/chart/common_chart";
import { LineChartDefinition, LineChartRuntime } from "../../../types/chart/line_chart";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { getChartTimeOptions, timeFormatMomentCompatible } from "../../chart_date";
import { colorToRGBA, rgbaToHex } from "../../color";
import { formatValue } from "../../format";
import { deepCopy, findNextDefinedValue } from "../../misc";
import { createRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  ChartColors,
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
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
  getChartLabelFormat,
  getChartLabelValues,
  getDefaultChartJsRuntime,
  getFillingMode,
} from "./chart_ui_common";

export class LineChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly type = "line";
  readonly dataSetsHaveTitle: boolean;

  constructor(definition: LineChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      this.getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createRange(this.getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.verticalAxisPosition = definition.verticalAxisPosition;
    this.legendPosition = definition.legendPosition;
    this.labelsAsText = definition.labelsAsText;
    this.stacked = definition.stacked;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: LineChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static transformDefinition(
    definition: LineChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): LineChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): LineChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ? context.range : [],
      dataSetsHaveTitle: false,
      labelsAsText: false,
      legendPosition: "top",
      title: context.title || "",
      type: "line",
      verticalAxisPosition: "left",
      labelRange: context.auxiliaryRange || undefined,
      stacked: false,
      aggregated: false,
    };
  }

  getDefinition(): LineChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): LineChartDefinition {
    return {
      type: "line",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, targetSheetId || this.sheetId)
      ),
      legendPosition: this.legendPosition,
      verticalAxisPosition: this.verticalAxisPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      labelsAsText: this.labelsAsText,
      stacked: this.stacked,
      aggregated: this.aggregated,
    };
  }

  getContextCreation(): ChartCreationContext {
    return {
      background: this.background,
      title: this.title,
      range: this.dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, this.sheetId)
      ),
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  updateRanges(applyChange: ApplyRangeChange): LineChart {
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
    return new LineChart(definition, this.sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // Excel does not support aggregating labels
    if (this.aggregated) return undefined;
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== ""); // && range !== INCORRECT_RANGE_STRING ? show incorrect #ref ?
    const labelRange = toExcelLabelRange(
      this.getters,
      this.labelRange,
      shouldRemoveFirstLabel(this.labelRange, this.dataSets[0], this.dataSetsHaveTitle)
    );
    return {
      ...this.getDefinition(),
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRange,
    };
  }

  copyForSheetId(sheetId: UID): LineChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new LineChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): LineChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new LineChart(definition, sheetId, this.getters);
  }
}

function fixEmptyLabelsForDateCharts(
  labels: string[],
  dataSetsValues: DatasetValues[]
): { labels: string[]; dataSetsValues: DatasetValues[] } {
  if (labels.length === 0 || labels.every((label) => !label)) {
    return { labels, dataSetsValues };
  }
  const newLabels = [...labels];
  const newDatasets = deepCopy(dataSetsValues);
  for (let i = 0; i < newLabels.length; i++) {
    if (!newLabels[i]) {
      newLabels[i] = findNextDefinedValue(newLabels, i);
      for (let ds of newDatasets) {
        ds.data[i] = undefined;
      }
    }
  }
  return { labels: newLabels, dataSetsValues: newDatasets };
}

export function canChartParseLabels(labelRange: Range | undefined, getters: Getters): boolean {
  return canBeDateChart(labelRange, getters) || canBeLinearChart(labelRange, getters);
}

function getChartAxisType(chart: LineChart, getters: Getters): AxisType {
  if (isDateChart(chart, getters)) {
    return "time";
  }
  if (isLinearChart(chart, getters)) {
    return "linear";
  }
  return "category";
}

function isDateChart(chart: LineChart, getters: Getters): boolean {
  return !chart.labelsAsText && canBeDateChart(chart.labelRange, getters);
}

function isLinearChart(chart: LineChart, getters: Getters): boolean {
  return !chart.labelsAsText && canBeLinearChart(chart.labelRange, getters);
}

function canBeDateChart(labelRange: Range | undefined, getters: Getters): boolean {
  if (!labelRange || !canBeLinearChart(labelRange, getters)) {
    return false;
  }
  const labelFormat = getters.getEvaluatedCell({
    sheetId: labelRange.sheetId,
    col: labelRange.zone.left,
    row: labelRange.zone.top,
  }).format;
  return Boolean(labelFormat && timeFormatMomentCompatible.test(labelFormat));
}

function canBeLinearChart(labelRange: Range | undefined, getters: Getters): boolean {
  if (!labelRange) {
    return false;
  }

  const labels = getters.getRangeValues(labelRange);
  if (labels.some((label) => isNaN(Number(label)) && label)) {
    return false;
  }
  if (labels.every((label) => !label)) {
    return false;
  }

  return true;
}

function getLineConfiguration(
  chart: LineChart,
  labels: string[],
  localeFormat: LocaleFormat
): ChartConfiguration {
  const fontColor = chartFontColor(chart.background);
  const config: ChartConfiguration = getDefaultChartJsRuntime(
    chart,
    labels,
    fontColor,
    localeFormat
  );
  const legend: ChartLegendOptions = {
    labels: {
      fontColor,
      generateLabels(chart) {
        const { data } = chart;
        const labels = window.Chart.defaults.global.legend!.labels!.generateLabels!(chart);
        for (const [index, label] of labels.entries()) {
          label.fillStyle = data.datasets![index].borderColor as string;
        }
        return labels;
      },
    },
  };
  if ((!chart.labelRange && chart.dataSets.length === 1) || chart.legendPosition === "none") {
    legend.display = false;
  } else {
    legend.position = chart.legendPosition;
  }
  config.options!.legend = { ...config.options?.legend, ...legend };
  config.options!.layout = {
    padding: { left: 20, right: 20, top: chart.title ? 10 : 25, bottom: 10 },
  };

  config.options!.scales = {
    xAxes: [
      {
        ticks: {
          // x axis configuration
          maxRotation: 60,
          minRotation: 15,
          padding: 5,
          labelOffset: 2,
          fontColor,
        },
      },
    ],
    yAxes: [
      {
        position: chart.verticalAxisPosition,
        ticks: {
          fontColor,
          // y axis configuration
          beginAtZero: true, // the origin of the y axis is always zero
          callback: (value) => {
            return localeFormat.format
              ? formatValue(value, localeFormat)
              : value?.toLocaleString() || value;
          },
        },
      },
    ],
  };
  if (chart.stacked) {
    config.options!.scales.yAxes![0].stacked = true;
  }
  return config;
}

export function createLineChartRuntime(chart: LineChart, getters: Getters): LineChartRuntime {
  const axisType = getChartAxisType(chart, getters);
  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  let labels = axisType === "linear" ? labelValues.values : labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, chart.dataSets);
  if (
    chart.dataSetsHaveTitle &&
    dataSetsValues[0] &&
    labels.length > dataSetsValues[0].data.length
  ) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterEmptyDataPoints(labels, dataSetsValues));
  if (axisType === "time") {
    ({ labels, dataSetsValues } = fixEmptyLabelsForDateCharts(labels, dataSetsValues));
  }
  if (chart.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }

  const locale = getters.getLocale();
  const dataSetFormat = getChartDatasetFormat(getters, chart.dataSets);
  const localeFormat = { format: dataSetFormat, locale };
  const config = getLineConfiguration(chart, labels, localeFormat);
  const labelFormat = getChartLabelFormat(getters, chart.labelRange)!;
  if (axisType === "time") {
    config.options!.scales!.xAxes![0].type = "time";
    config.options!.scales!.xAxes![0].time = getChartTimeOptions(labels, labelFormat, locale);
    config.options!.scales!.xAxes![0].ticks!.maxTicksLimit = 15;
  } else if (axisType === "linear") {
    config.options!.scales!.xAxes![0].type = "linear";
    config.options!.scales!.xAxes![0].ticks!.callback = (value) => formatValue(value, localeFormat);
    config.options!.tooltips!.callbacks!.title = (tooltipItem) => {
      return formatValue(tooltipItem[0]?.xLabel || "", localeFormat);
    };
  }

  const colors = new ChartColors();
  for (let [index, { label, data }] of dataSetsValues.entries()) {
    if (["linear", "time"].includes(axisType)) {
      // Replace empty string labels by undefined to make sure chartJS doesn't decide that "" is the same as 0
      data = data.map((y, index) => ({ x: labels[index] || undefined, y }));
    }
    const color = colors.next();
    let backgroundRGBA = colorToRGBA(color);
    if (chart.stacked) {
      backgroundRGBA.a = LINE_FILL_TRANSPARENCY;
    }
    const backgroundColor = rgbaToHex(backgroundRGBA);

    const dataset: ChartDataSets = {
      label,
      data,
      lineTension: 0, // 0 -> render straight lines, which is much faster
      borderColor: color,
      backgroundColor,
      pointBackgroundColor: color,
      fill: chart.stacked ? getFillingMode(index) : false,
    };
    config.data!.datasets!.push(dataset);
  }

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
