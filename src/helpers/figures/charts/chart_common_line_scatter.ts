import { toJsDate } from "../../../functions/helpers";
import { Getters, Locale, Range } from "../../../types";
import { AxisType, DatasetValues, TrendConfiguration } from "../../../types/chart/chart";
import { timeFormatLuxonCompatible } from "../../chart_date";
import { deepCopy, findNextDefinedValue, range } from "../../misc";
import { getFullTrendingLineDataSet, interpolateData } from "./chart_common";
import { LineChart } from "./line_chart";
import { ScatterChart } from "./scatter_chart";

export function fixEmptyLabelsForDateCharts(
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

export function getChartAxisType(chart: LineChart | ScatterChart, getters: Getters): AxisType {
  if (isDateChart(chart, getters) && isLuxonTimeAdapterInstalled()) {
    return "time";
  }
  if (isLinearChart(chart, getters)) {
    return "linear";
  }
  return "category";
}

function isDateChart(chart: LineChart | ScatterChart, getters: Getters): boolean {
  return !chart.labelsAsText && canBeDateChart(chart.labelRange, getters);
}

function isLinearChart(chart: LineChart | ScatterChart, getters: Getters): boolean {
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

export function getTrendDatasetForLineChart(
  config: TrendConfiguration,
  dataset: any,
  axisType: AxisType,
  locale: Locale
): DatasetValues | undefined {
  const filteredValues: number[] = [];
  const filteredLabels: number[] = [];
  const labels: number[] = [];
  const datasetLength = dataset.data.length;

  if (datasetLength < 2) {
    return;
  }

  switch (axisType) {
    case "category":
      for (let i = 0; i < datasetLength; i++) {
        if (typeof dataset.data[i] === "number") {
          filteredValues.push(dataset.data[i]);
          filteredLabels.push(i + 1);
        }
        labels.push(i + 1);
      }
      break;
    case "linear":
      for (const point of dataset.data) {
        const label = Number(point.x);
        if (isNaN(label)) {
          continue;
        }
        if (typeof point.y === "number") {
          filteredValues.push(point.y);
          filteredLabels.push(label);
        }
        labels.push(label);
      }
      break;
    case "time":
      for (const point of dataset.data) {
        const date = toJsDate({ value: point.x }, locale).getTime();
        if (typeof point.y === "number") {
          filteredValues.push(point.y);
          filteredLabels.push(date);
        }
        labels.push(date);
      }
      break;
  }

  const xmin = Math.min(...labels);
  const xmax = Math.max(...labels);
  if (xmax === xmin) {
    return;
  }
  const numberOfStep = 5 * labels.length;
  const step = (xmax - xmin) / numberOfStep;
  const newLabels = range(xmin, xmax + step / 2, step);
  const newValues = interpolateData(config, filteredValues, filteredLabels, newLabels);
  if (!newValues.length) {
    return;
  }
  return getFullTrendingLineDataSet(dataset, config, newValues);
}
