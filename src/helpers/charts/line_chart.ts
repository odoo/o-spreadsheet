import { ChartConfiguration, ChartDataSets, ChartLegendOptions } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../constants";
import { chartRegistry } from "../../registries/chart_types";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../types";
import {
  AxisType,
  ChartCreationContext,
  DataSet,
  DatasetValues,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "../../types/chart/chart";
import { LegendPosition, VerticalAxisPosition } from "../../types/chart/common_chart";
import { LineChartDefinition, LineChartRuntime } from "../../types/chart/line_chart";
import { Validator } from "../../types/validator";
import { toXlsxHexColor } from "../../xlsx/helpers/colors";
import { getChartTimeOptions, timeFormatMomentCompatible } from "../chart_date";
import { formatValue } from "../format";
import { deepCopy, findNextDefinedValue, isDefined } from "../misc";
import { createRange } from "../range";
import { AbstractChart } from "./abstract_chart";
import {
  ChartColors,
  chartFontColor,
  checkDataset,
  checkDatasetNotEmpty,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  toExcelDataset,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import {
  filterEmptyDataPoints,
  getChartDatasetValues,
  getChartLabelValues,
  getDefaultChartJsRuntime,
  getLabelFormat,
} from "./chart_ui_common";

chartRegistry.add("line", {
  match: (type) => type === "line",
  createChart: (definition, sheetId, getters) =>
    new LineChart(definition as LineChartDefinition, sheetId, getters),
  getChartRuntime: createLineChartRuntime,
  validateChartDefinition: (validator, definition) =>
    LineChart.validateChartDefinition(validator, definition as LineChartDefinition),
  transformDefinition: (
    definition: LineChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ) => LineChart.transformDefinition(definition, executed),
  getChartDefinitionFromContextCreation: (context: ChartCreationContext) =>
    LineChart.getDefinitionFromContextCreation(context),
  name: "Line",
});

export class LineChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background: string;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly type = "line";

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
  }

  static validateChartDefinition(
    validator: Validator,
    definition: LineChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(
      definition,
      validator.chainValidations(checkDatasetNotEmpty, checkDataset),
      checkLabelRange
    );
  }

  static transformDefinition(
    definition: LineChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): LineChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): LineChartDefinition {
    return {
      background: context.background || BACKGROUND_CHART_COLOR,
      dataSets: context.range ? [context.range] : [],
      dataSetsHaveTitle: false,
      labelsAsText: false,
      legendPosition: "top",
      title: context.title || "",
      type: "line",
      verticalAxisPosition: "left",
      labelRange: undefined,
    };
  }

  getDefinition(): LineChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined
  ): LineChartDefinition {
    return {
      type: "line",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, this.sheetId)
      ),
      legendPosition: this.legendPosition,
      verticalAxisPosition: this.verticalAxisPosition,
      labelRange: labelRange ? this.getters.getRangeString(labelRange, this.sheetId) : undefined,
      title: this.title,
      labelsAsText: this.labelsAsText,
    };
  }

  getContextCreation(): ChartCreationContext {
    return {
      background: this.background,
      title: this.title,
      range:
        this.dataSets.length > 0
          ? this.getters.getRangeString(this.dataSets[0].dataRange, this.sheetId)
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

  getDefinitionForExcel(): ExcelChartDefinition {
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== ""); // && range !== INCORRECT_RANGE_STRING ? show incorrect #ref ?
    return {
      ...this.getDefinition(),
      backgroundColor: toXlsxHexColor(this.background),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
    };
  }

  copyForSheetId(sheetId: UID): LineChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange);
    return new LineChart(definition, sheetId, this.getters);
  }

  getSheetIdsUsedInChartRanges(): UID[] {
    const sheetIds = new Set<UID>();
    const ranges: Range[] = [];
    this.dataSets.map((ds) => ds.dataRange).map((range) => ranges.push(range));
    this.dataSets
      .map((ds) => ds.labelCell)
      .filter(isDefined)
      .map((range) => ranges.push(range));
    if (this.labelRange) {
      ranges.push(this.labelRange);
    }
    for (const range of ranges) {
      sheetIds.add(range.sheetId);
    }
    return Array.from(sheetIds);
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

export function canChartParseLabels(chart: LineChart, getters: Getters): boolean {
  return canBeDateChart(chart, getters) || canBeLinearChart(chart, getters);
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
  return !chart.labelsAsText && canBeDateChart(chart, getters);
}

function isLinearChart(chart: LineChart, getters: Getters): boolean {
  return !chart.labelsAsText && canBeLinearChart(chart, getters);
}

function canBeDateChart(chart: LineChart, getters: Getters): boolean {
  if (!chart.labelRange || !chart.dataSets || !canBeLinearChart(chart, getters)) {
    return false;
  }
  const labelFormat = getters.getCell(
    chart.labelRange.sheetId,
    chart.labelRange.zone.left,
    chart.labelRange.zone.top
  )?.format;
  return Boolean(labelFormat && timeFormatMomentCompatible.test(labelFormat));
}

function canBeLinearChart(chart: LineChart, getters: Getters): boolean {
  if (!chart.labelRange || !chart.dataSets) {
    return false;
  }

  const labels = getters.getRangeValues(chart.labelRange);
  if (labels.some((label) => isNaN(Number(label)) && label)) {
    return false;
  }
  if (labels.every((label) => !label)) {
    return false;
  }

  return true;
}

function getLineConfiguration(chart: LineChart, labels: string[]): ChartConfiguration {
  const fontColor = chartFontColor(chart.background);
  const config: ChartConfiguration = getDefaultChartJsRuntime(chart, labels, fontColor);
  const legend: ChartLegendOptions = {
    labels: { fontColor },
  };
  if (!chart.labelRange && chart.dataSets.length === 1) {
    legend.display = false;
  } else {
    legend.position = chart.legendPosition;
  }
  config.options!.legend = legend;
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
        },
      },
    ],
  };
  return config;
}

function createLineChartRuntime(chart: LineChart, getters: Getters): LineChartRuntime {
  const axisType = getChartAxisType(chart, getters);
  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  let labels = axisType === "linear" ? labelValues.values : labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, chart.dataSets);

  ({ labels, dataSetsValues } = filterEmptyDataPoints(labels, dataSetsValues));
  if (axisType === "time") {
    ({ labels, dataSetsValues } = fixEmptyLabelsForDateCharts(labels, dataSetsValues));
  }
  const runtime = getLineConfiguration(chart, labels);
  const labelFormat = getLabelFormat(getters, chart.labelRange)!;
  if (axisType === "time") {
    runtime.options!.scales!.xAxes![0].type = "time";
    runtime.options!.scales!.xAxes![0].time = getChartTimeOptions(labels, labelFormat);
    runtime.options!.scales!.xAxes![0].ticks!.maxTicksLimit = 15;
  } else if (axisType === "linear") {
    runtime.options!.scales!.xAxes![0].type = "linear";
    runtime.options!.scales!.xAxes![0].ticks!.callback = (value) => formatValue(value, labelFormat);
  }

  const colors = new ChartColors();

  for (let { label, data } of dataSetsValues) {
    if (["linear", "time"].includes(axisType)) {
      // Replace empty string labels by undefined to make sure chartJS doesn't decide that "" is the same as 0
      data = data.map((y, index) => ({ x: labels[index] || undefined, y }));
    }

    const color = colors.next();
    const dataset: ChartDataSets = {
      label,
      data,
      lineTension: 0, // 0 -> render straight lines, which is much faster
      borderColor: color,
      backgroundColor: color,
    };
    runtime.data!.datasets!.push(dataset);
  }

  return runtime;
}
