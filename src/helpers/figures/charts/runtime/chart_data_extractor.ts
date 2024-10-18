import { ChartTerms } from "../../../../components/translations_terms";
import {
  evaluatePolynomial,
  expM,
  getMovingAverageValues,
  logM,
  polynomialRegression,
  predictLinearValues,
} from "../../../../functions/helper_statistical";
import { isEvaluationError, toNumber } from "../../../../functions/helpers";
import { CellValue, Format, GenericDefinition, Getters, Locale, Range } from "../../../../types";
import {
  AxisType,
  BarChartDefinition,
  ChartRuntimeGenerationArgs,
  DataSet,
  DatasetValues,
  LabelValues,
  LineChartDefinition,
  PieChartDefinition,
  PyramidChartDefinition,
  TrendConfiguration,
} from "../../../../types/chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import { timeFormatLuxonCompatible } from "../../../chart_date";
import { isDateTimeFormat } from "../../../format/format";
import { deepCopy, findNextDefinedValue, range } from "../../../misc";
import { isNumber } from "../../../numbers";
import { recomputeZones } from "../../../recompute_zones";
import { truncateLabel } from "../chart_ui_common";

export function getBarChartData(
  definition: GenericDefinition<BarChartDefinition>,
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

  const trendDataSetsValues: ((number | null)[] | undefined)[] = [];
  for (const index in dataSetsValues) {
    const { data } = dataSetsValues[index];

    const trend = definition.dataSets?.[index].trend;
    if (!trend?.display || definition.horizontal) {
      trendDataSetsValues.push(undefined);
      continue;
    }

    const trendDataset = getTrendDatasetForBarChart(trend, data);
    trendDataSetsValues.push(trendDataset);
  }

  return {
    dataSetsValues,
    trendDataSetsValues,
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

export function getLineChartData(
  definition: GenericDefinition<LineChartDefinition>,
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

  const trendDataSetsValues: ((number | null)[] | undefined)[] = [];
  for (const index in dataSetsValues) {
    let { data } = dataSetsValues[index];
    if (definition.cumulative) {
      let accumulator = 0;
      data = data.map((value) => {
        if (!isNaN(value)) {
          accumulator += parseFloat(value);
          return accumulator;
        }
        return value;
      });
      dataSetsValues[index] = { ...dataSetsValues[index], data };
    }

    const trend = definition.dataSets?.[index].trend;
    if (!trend?.display) {
      trendDataSetsValues.push(undefined);
      continue;
    }

    trendDataSetsValues.push(
      getTrendDatasetForLineChart(trend, data, labels, axisType, getters.getLocale())
    );
  }

  return {
    dataSetsValues,
    axisFormats,
    labels,
    locale: getters.getLocale(),
    trendDataSetsValues,
    axisType,
  };
}

export function getPieChartData(
  definition: GenericDefinition<PieChartDefinition>,
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

export function getRadarChartData(
  definition: GenericDefinition<RadarChartDefinition>,
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
  const axisFormats = { r: dataSetFormat };

  return {
    dataSetsValues,
    axisFormats,
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
  labels: string[],
  axisType: AxisType,
  locale: Locale
) {
  const filteredValues: number[] = [];
  const filteredLabels: number[] = [];
  const trendLabels: number[] = [];
  const datasetLength = data.length;

  if (datasetLength < 2) {
    return;
  }

  switch (axisType) {
    case "category":
      for (let i = 0; i < datasetLength; i++) {
        if (typeof data[i] === "number") {
          filteredValues.push(data[i]);
          filteredLabels.push(i + 1);
        }
        trendLabels.push(i + 1);
      }
      break;
    case "linear":
      for (let i = 0; i < data.length; i++) {
        const label = Number(labels[i]);
        if (isNaN(label)) {
          continue;
        }
        if (typeof data[i] === "number") {
          filteredValues.push(data[i]);
          filteredLabels.push(label);
        }
        trendLabels.push(label);
      }
      break;
    case "time":
      for (let i = 0; i < data.length; i++) {
        const date = toNumber({ value: labels[i] }, locale);
        if (data[i] !== null) {
          filteredValues.push(data[i]);
          filteredLabels.push(date);
        }
        trendLabels.push(date);
      }
      break;
  }

  const xmin = Math.min(...trendLabels);
  const xmax = Math.max(...trendLabels);
  if (xmax === xmin) {
    return;
  }
  const numberOfStep = 5 * trendLabels.length;
  const step = (xmax - xmin) / numberOfStep;
  const newLabels = range(xmin, xmax + step / 2, step);
  const newValues = interpolateData(config, filteredValues, filteredLabels, newLabels);
  if (!newValues.length) {
    return;
  }
  return newValues;
}

function interpolateData(
  config: TrendConfiguration,
  values: number[],
  labels: number[],
  newLabels: number[]
): (number | null)[] {
  if (values.length < 2 || labels.length < 2 || newLabels.length === 0) {
    return [];
  }
  const labelMin = Math.min(...labels);
  const labelMax = Math.max(...labels);
  const labelRange = labelMax - labelMin;
  const normalizedLabels = labels.map((v) => (v - labelMin) / labelRange);
  const normalizedNewLabels = newLabels.map((v) => (v - labelMin) / labelRange);
  switch (config.type) {
    case "polynomial": {
      const order = config.order ?? 2;
      if (order === 1) {
        return predictLinearValues([values], [normalizedLabels], [normalizedNewLabels], true)[0];
      }
      const coeffs = polynomialRegression(values, normalizedLabels, order, true).flat();
      return normalizedNewLabels.map((v) => evaluatePolynomial(coeffs, v, order));
    }
    case "exponential": {
      const positiveLogValues: number[] = [];
      const filteredLabels: number[] = [];
      for (let i = 0; i < values.length; i++) {
        if (values[i] > 0) {
          positiveLogValues.push(Math.log(values[i]));
          filteredLabels.push(normalizedLabels[i]);
        }
      }
      if (!filteredLabels.length) {
        return [];
      }
      return expM(
        predictLinearValues([positiveLogValues], [filteredLabels], [normalizedNewLabels], true)
      )[0];
    }
    case "logarithmic": {
      return predictLinearValues(
        [values],
        logM([normalizedLabels]),
        logM([normalizedNewLabels]),
        true
      )[0];
    }
    case "trailingMovingAverage": {
      return getMovingAverageValues(values, config.window);
    }
    default:
      return [];
  }
}

function getChartAxisType(
  chart: GenericDefinition<LineChartDefinition>,
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
  definition: GenericDefinition<LineChartDefinition>,
  labelRange: Range | undefined,
  getters: Getters
): boolean {
  return !definition.labelsAsText && canBeDateChart(labelRange, getters);
}

function isLinearChart(
  definition: GenericDefinition<LineChartDefinition>,
  labelRange: Range | undefined,
  getters: Getters
): boolean {
  return !definition.labelsAsText && canBeLinearChart(labelRange, getters);
}

export function canChartParseLabels(labelRange: Range | undefined, getters: Getters): boolean {
  return canBeDateChart(labelRange, getters) || canBeLinearChart(labelRange, getters);
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

/**
 * Get the data from a dataSet
 */
export function getData(getters: Getters, ds: DataSet): (CellValue | undefined)[] {
  if (ds.dataRange) {
    const labelCellZone = ds.labelCell ? [ds.labelCell.zone] : [];
    const dataZone = recomputeZones([ds.dataRange.zone], labelCellZone)[0];
    if (dataZone === undefined) {
      return [];
    }
    const dataRange = getters.getRangeFromZone(ds.dataRange.sheetId, dataZone);
    return getters.getRangeValues(dataRange).map((value) => (value === "" ? undefined : value));
  }
  return [];
}

function filterEmptyDataPoints(
  labels: string[],
  datasets: DatasetValues[]
): { labels: string[]; dataSetsValues: DatasetValues[] } {
  const numberOfDataPoints = Math.max(
    labels.length,
    ...datasets.map((dataset) => dataset.data?.length || 0)
  );
  const dataPointsIndexes = range(0, numberOfDataPoints).filter((dataPointIndex) => {
    const label = labels[dataPointIndex];
    const values = datasets.map((dataset) => dataset.data?.[dataPointIndex]);
    return label || values.some((value) => value === 0 || Boolean(value));
  });
  return {
    labels: dataPointsIndexes.map((i) => labels[i] || ""),
    dataSetsValues: datasets.map((dataset) => ({
      ...dataset,
      data: dataPointsIndexes.map((i) => dataset.data[i]),
    })),
  };
}

/**
 * Aggregates data based on labels
 */
function aggregateDataForLabels(
  labels: string[],
  datasets: DatasetValues[]
): { labels: string[]; dataSetsValues: DatasetValues[] } {
  const parseNumber = (value) => (typeof value === "number" ? value : 0);
  const labelSet = new Set(labels);
  const labelMap: { [key: string]: number[] } = {};
  labelSet.forEach((label) => {
    labelMap[label] = new Array(datasets.length).fill(0);
  });

  for (const indexOfLabel of range(0, labels.length)) {
    const label = labels[indexOfLabel];
    for (const indexOfDataset of range(0, datasets.length)) {
      labelMap[label][indexOfDataset] += parseNumber(datasets[indexOfDataset].data[indexOfLabel]);
    }
  }

  return {
    labels: Array.from(labelSet),
    dataSetsValues: datasets.map((dataset, indexOfDataset) => ({
      ...dataset,
      data: Array.from(labelSet).map((label) => labelMap[label][indexOfDataset]),
    })),
  };
}

function getChartLabelFormat(getters: Getters, range: Range | undefined): Format | undefined {
  if (!range) return undefined;
  return getters.getEvaluatedCell({
    sheetId: range.sheetId,
    col: range.zone.left,
    row: range.zone.top,
  }).format;
}

function getChartLabelValues(
  getters: Getters,
  dataSets: DataSet[],
  labelRange?: Range
): LabelValues {
  let labels: LabelValues = { values: [], formattedValues: [] };
  if (labelRange) {
    const { left } = labelRange.zone;
    if (
      !labelRange.invalidXc &&
      !labelRange.invalidSheetName &&
      !getters.isColHidden(labelRange.sheetId, left)
    ) {
      labels = {
        formattedValues: getters.getRangeFormattedValues(labelRange),
        values: getters.getRangeValues(labelRange).map((val) => String(val ?? "")),
      };
    } else if (dataSets[0]) {
      const ranges = getData(getters, dataSets[0]);
      labels = {
        formattedValues: range(0, ranges.length).map((r) => r.toString()),
        values: labels.formattedValues,
      };
    }
  } else if (dataSets.length === 1) {
    for (let i = 0; i < getData(getters, dataSets[0]).length; i++) {
      labels.formattedValues.push("");
      labels.values.push("");
    }
  } else {
    if (dataSets[0]) {
      const ranges = getData(getters, dataSets[0]);
      labels = {
        formattedValues: range(0, ranges.length).map((r) => r.toString()),
        values: labels.formattedValues,
      };
    }
  }
  return labels;
}

/**
 * Get the format to apply to the the dataset values. This format is defined as the first format
 * found in the dataset ranges that isn't a date format.
 */
function getChartDatasetFormat(
  getters: Getters,
  allDataSets: DataSet[],
  axis: "left" | "right"
): Format | undefined {
  const dataSets = allDataSets.filter((ds) => (axis === "right") === !!ds.rightYAxis);
  for (const ds of dataSets) {
    const formatsInDataset = getters.getRangeFormats(ds.dataRange);
    const format = formatsInDataset.find((f) => f !== undefined && !isDateTimeFormat(f));
    if (format) return format;
  }
  return undefined;
}

function getChartDatasetValues(getters: Getters, dataSets: DataSet[]): DatasetValues[] {
  const datasetValues: DatasetValues[] = [];
  for (const [dsIndex, ds] of Object.entries(dataSets)) {
    if (getters.isColHidden(ds.dataRange.sheetId, ds.dataRange.zone.left)) {
      continue;
    }
    let label: string;
    if (ds.labelCell) {
      const labelRange = ds.labelCell;
      const cell = labelRange
        ? getters.getEvaluatedCell({
            sheetId: labelRange.sheetId,
            col: labelRange.zone.left,
            row: labelRange.zone.top,
          })
        : undefined;
      label =
        cell && labelRange
          ? truncateLabel(cell.formattedValue)
          : (label = `${ChartTerms.Series} ${parseInt(dsIndex) + 1}`);
    } else {
      label = `${ChartTerms.Series} ${parseInt(dsIndex) + 1}`;
    }
    let data = ds.dataRange ? getData(getters, ds) : [];
    if (
      data.every((e) => typeof e === "string" && !isEvaluationError(e)) &&
      data.some((e) => e !== "")
    ) {
      // In this case, we want a chart based on the string occurrences count
      // This will be done by associating each string with a value of 1 and
      // then using the classical aggregation method to sum the values.
      data.fill(1);
    } else if (
      data.every(
        (cell) =>
          cell === undefined || cell === null || !isNumber(cell.toString(), getters.getLocale())
      )
    ) {
      continue;
    }
    datasetValues.push({ data, label });
  }
  return datasetValues;
}
