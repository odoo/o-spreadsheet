import { toJsDate } from "../../../../functions/helpers";
import { Getters, Locale, PartialDefinition, Range } from "../../../../types";
import {
  AxisType,
  BarChartDefinition,
  ChartRuntimeGenerationArgs,
  DataSet,
  DatasetValues,
  LineChartDefinition,
  PieChartDefinition,
  PyramidChartDefinition,
  TrendConfiguration,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { timeFormatLuxonCompatible } from "../../../chart_date";
import { range } from "../../../misc";
import { interpolateData } from "../chart_common";
import { fixEmptyLabelsForDateCharts } from "../chart_common_line_scatter";
import {
  aggregateDataForLabels,
  filterEmptyDataPoints,
  getChartDatasetFormat,
  getChartDatasetValues,
  getChartLabelFormat,
  getChartLabelValues,
} from "../chart_ui_common";

export function getBarChartData(
  definition: PartialDefinition<BarChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): ChartRuntimeGenerationArgs {
  const labelValues = getChartLabelValues(getters, dataSets, labelRange);
  let labels = labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, dataSets);
  if (
    definition.dataSetsHaveTitle &&
    dataSetsValues[0] &&
    labels.length > dataSetsValues[0].data.length
  ) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterEmptyDataPoints(labels, dataSetsValues));
  if (definition.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }

  const leftAxisFormat = getChartDatasetFormat(getters, dataSets, "left");
  const rightAxisFormat = getChartDatasetFormat(getters, dataSets, "right");
  const axisFormats = definition.horizontal
    ? { x: leftAxisFormat || rightAxisFormat }
    : { y: leftAxisFormat, y1: rightAxisFormat };

  const trendDatasets: ((number | null)[] | undefined)[] = [];
  for (const index in dataSetsValues) {
    const { data } = dataSetsValues[index];

    const trend = definition.dataSets?.[index].trend;
    if (!trend?.display || definition.horizontal) {
      trendDatasets.push(undefined);
      continue;
    }

    const trendDataset = getTrendDatasetForBarChart(trend, data);
    trendDatasets.push(trendDataset);
  }

  return {
    dataSetsValues,
    trendDatasets,
    axisFormats,
    labels,
    locale: getters.getLocale(),
  };
}

export function getPyramidChartData(
  definition: PyramidChartDefinition,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): ChartRuntimeGenerationArgs {
  const barChartData = getBarChartData(definition, dataSets, labelRange, getters);
  const barDataset = barChartData.dataSetsValues;

  const pyramidDatasetValues: DatasetValues[] = [];
  if (barDataset[0]) {
    const pyramidData = barDataset[0].data.map((value) => (value > 0 ? value : 0));
    pyramidDatasetValues.push({ ...barDataset[0], data: pyramidData });
  }
  if (barDataset[1]) {
    const pyramidData = barDataset[1].data.map((value) => (value > 0 ? -value : 0));
    pyramidDatasetValues.push({ ...barDataset[1], data: pyramidData });
  }

  return {
    ...barChartData,
    dataSetsValues: pyramidDatasetValues,
  };
}

export function getWaterfallChartData(
  definition: WaterfallChartDefinition,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): ChartRuntimeGenerationArgs {
  const labelValues = getChartLabelValues(getters, dataSets, labelRange);
  let labels = labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, dataSets);
  if (
    definition.dataSetsHaveTitle &&
    dataSetsValues[0] &&
    labels.length > dataSetsValues[0].data.length
  ) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterEmptyDataPoints(labels, dataSetsValues));
  if (definition.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }

  const dataSetFormat =
    getChartDatasetFormat(getters, dataSets, "left") ||
    getChartDatasetFormat(getters, dataSets, "right");

  return {
    dataSetsValues,
    axisFormats: { y: dataSetFormat },
    labels,
    locale: getters.getLocale(),
  };
}

export function getLineChartData(
  definition: PartialDefinition<LineChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): ChartRuntimeGenerationArgs {
  const axisType = getChartAxisType(definition, labelRange, getters);
  const labelValues = getChartLabelValues(getters, dataSets, labelRange);
  let labels = axisType === "linear" ? labelValues.values : labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, dataSets);
  if (
    definition.dataSetsHaveTitle &&
    dataSetsValues[0] &&
    labels.length > dataSetsValues[0].data.length
  ) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterEmptyDataPoints(labels, dataSetsValues));
  if (axisType === "time") {
    ({ labels, dataSetsValues } = fixEmptyLabelsForDateCharts(labels, dataSetsValues));
  }
  if (definition.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }

  const leftAxisFormat = getChartDatasetFormat(getters, dataSets, "left");
  const rightAxisFormat = getChartDatasetFormat(getters, dataSets, "right");
  const labelsFormat = getChartLabelFormat(getters, labelRange);
  const axisFormats = { y: leftAxisFormat, y1: rightAxisFormat, x: labelsFormat };

  const trendDatasets: ((number | null)[] | undefined)[] = [];
  for (const index in dataSetsValues) {
    const { data } = dataSetsValues[index];

    const trend = definition.dataSets?.[index].trend;
    if (!trend?.display) {
      trendDatasets.push(undefined);
      continue;
    }

    trendDatasets.push(getTrendDatasetForLineChart(trend, data, axisType, getters.getLocale()));
  }

  return {
    dataSetsValues,
    axisFormats,
    labels,
    locale: getters.getLocale(),
    trendDatasets,
    axisType,
  };
}

export function getPieChartData(
  definition: PartialDefinition<PieChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): ChartRuntimeGenerationArgs {
  const labelValues = getChartLabelValues(getters, dataSets, labelRange);
  let labels = labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, dataSets);
  if (
    definition.dataSetsHaveTitle &&
    dataSetsValues[0] &&
    labels.length > dataSetsValues[0].data.length
  ) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterEmptyDataPoints(labels, dataSetsValues));

  if (definition.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }

  ({ dataSetsValues, labels } = filterNegativeValues(labels, dataSetsValues));

  const dataSetFormat = getChartDatasetFormat(getters, dataSets, "left");

  return {
    dataSetsValues,
    axisFormats: { y: dataSetFormat },
    labels,
    locale: getters.getLocale(),
  };
}

export function getTrendDatasetForBarChart(config: TrendConfiguration, data: any[]) {
  const filteredValues: number[] = [];
  const filteredLabels: number[] = [];
  const labels: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === "number") {
      filteredValues.push(data[i]);
      filteredLabels.push(i + 1);
    }
    labels.push(i + 1);
  }

  const newLabels = range(0.5, labels.length + 0.55, 0.2);
  const newValues = interpolateData(config, filteredValues, filteredLabels, newLabels);
  return newValues.length ? newValues : undefined;
}

export function getTrendDatasetForLineChart(
  config: TrendConfiguration,
  data: any[],
  axisType: AxisType,
  locale: Locale
) {
  const filteredValues: number[] = [];
  const filteredLabels: number[] = [];
  const labels: number[] = [];

  if (data.length < 2) {
    return;
  }

  switch (axisType) {
    case "linear":
    case "category":
      for (let i = 0; i < data.length; i++) {
        if (typeof data[i] === "number") {
          filteredValues.push(data[i]);
          filteredLabels.push(i + 1);
        }
        labels.push(i + 1);
      }
      break;
    case "time":
      for (let i = 0; i < data.length; i++) {
        const date = toJsDate({ value: data[i] }, locale).getTime();
        if (typeof data[i] === "number") {
          filteredValues.push(data[i]);
          filteredLabels.push(date);
        }
        labels.push(date);
      }
      break;
  }

  const xMin = Math.min(...labels);
  const xMax = Math.max(...labels);
  if (xMax === xMin) {
    return;
  }
  const numberOfStep = 5 * labels.length;
  const step = (xMax - xMin) / numberOfStep;
  const newLabels = range(xMin, xMax + step / 2, step);
  const newValues = interpolateData(config, filteredValues, filteredLabels, newLabels);
  if (!newValues.length) {
    return;
  }

  return newValues;
}

function getChartAxisType(
  chart: PartialDefinition<LineChartDefinition>,
  labelRange: Range | undefined,
  getters: Getters
): AxisType {
  if (isDateChart(chart, labelRange, getters) && isLuxonTimeAdapterInstalled()) {
    return "time";
  }
  if (isLinearChart(chart, labelRange, getters)) {
    return "linear";
  }
  return "category";
}

function isDateChart(
  definition: PartialDefinition<LineChartDefinition>,
  labelRange: Range | undefined,
  getters: Getters
): boolean {
  return !definition.labelsAsText && canBeDateChart(labelRange, getters);
}

function isLinearChart(
  definition: PartialDefinition<LineChartDefinition>,
  labelRange: Range | undefined,
  getters: Getters
): boolean {
  return !definition.labelsAsText && canBeLinearChart(labelRange, getters);
}

function canBeDateChart(labelRange: Range | undefined, getters: Getters): boolean {
  if (!labelRange || !canBeLinearChart(labelRange, getters)) {
    return false;
  }
  const labelFormat = getChartLabelFormat(getters, labelRange);
  return Boolean(labelFormat && timeFormatLuxonCompatible.test(labelFormat));
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

let missingTimeAdapterAlreadyWarned = false;

function isLuxonTimeAdapterInstalled() {
  if (!window.Chart) {
    return false;
  }
  // @ts-ignore
  const adapter = new window.Chart._adapters._date({});
  const isInstalled = adapter._id === "luxon";
  if (!isInstalled && !missingTimeAdapterAlreadyWarned) {
    missingTimeAdapterAlreadyWarned = true;
    console.warn(
      "'chartjs-adapter-luxon' time adapter is not installed. Time scale axes are disabled."
    );
  }
  return isInstalled;
}

function filterNegativeValues(
  labels: readonly string[],
  datasets: readonly DatasetValues[]
): { labels: string[]; dataSetsValues: DatasetValues[] } {
  const dataPointsIndexes = labels.reduce<number[]>((indexes, label, i) => {
    const shouldKeep = datasets.some((dataset) => {
      const dataPoint = dataset.data[i];
      return typeof dataPoint !== "number" || dataPoint >= 0;
    });

    if (shouldKeep) {
      indexes.push(i);
    }

    return indexes;
  }, []);

  const filteredLabels = dataPointsIndexes.map((i) => labels[i] || "");
  const filteredDatasets = datasets.map((dataset) => ({
    ...dataset,
    data: dataPointsIndexes.map((i) => {
      const dataPoint = dataset.data[i];
      return typeof dataPoint !== "number" || dataPoint >= 0 ? dataPoint : 0;
    }),
  }));

  return { labels: filteredLabels, dataSetsValues: filteredDatasets };
}
