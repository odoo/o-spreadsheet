import { Point } from "chart.js";
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
import { _t } from "../../../../translation";
import {
  CellValue,
  DEFAULT_LOCALE,
  Format,
  GenericDefinition,
  Getters,
  Granularity,
  Locale,
  Range,
} from "../../../../types";
import {
  AxisType,
  BarChartDefinition,
  ChartRuntimeGenerationArgs,
  DataSet,
  DatasetValues,
  FunnelChartDefinition,
  LabelValues,
  LineChartDefinition,
  PieChartDefinition,
  PyramidChartDefinition,
  SunburstChartDefinition,
  TrendConfiguration,
} from "../../../../types/chart";
import { CalendarChartDefinition } from "../../../../types/chart/calendar_chart";
import {
  GeoChartDefinition,
  GeoChartRuntimeGenerationArgs,
} from "../../../../types/chart/geo_chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import { TreeMapChartDefinition } from "../../../../types/chart/tree_map_chart";
import { timeFormatLuxonCompatible } from "../../../chart_date";
import { DAYS, isDateTimeFormat, MONTHS } from "../../../format/format";
import { deepCopy, findNextDefinedValue, range } from "../../../misc";
import { isNumber } from "../../../numbers";
import { createDate } from "../../../pivot/spreadsheet_pivot/date_spreadsheet_pivot";
import { recomputeZones } from "../../../recompute_zones";
import { positions } from "../../../zones";
import { shouldRemoveFirstLabel } from "../chart_common";

export function getBarChartData(
  definition: GenericDefinition<BarChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): ChartRuntimeGenerationArgs {
  const labelValues = getChartLabelValues(getters, dataSets, labelRange);
  let labels = labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, dataSets);
  if (shouldRemoveFirstLabel(labelRange, dataSets[0], definition.dataSetsHaveTitle || false)) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterInvalidDataPoints(labels, dataSetsValues));
  if (definition.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }

  const leftAxisFormat = getChartDatasetFormat(getters, dataSets, "left");
  const rightAxisFormat = getChartDatasetFormat(getters, dataSets, "right");
  const axisFormats = definition.horizontal
    ? { x: leftAxisFormat || rightAxisFormat }
    : { y: leftAxisFormat, y1: rightAxisFormat };

  const trendDataSetsValues: (Point[] | undefined)[] = [];
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
    topPadding: getTopPaddingForDashboard(definition, getters),
  };
}

function getDateTimeLabel(value: number, stamp: Granularity): string {
  switch (stamp) {
    case "day_of_week": {
      return DAYS[value - 1].toString();
    }
    case "hour_number": {
      const hour = String(value % 12).padStart(2, "0");
      return value < 12 ? _t("%(hour)s AM", { hour }) : _t("%(hour)s PM", { hour });
    }
    case "month_number": {
      return MONTHS[value - 1].toString();
    }
    case "iso_week_number": {
      const weekNumber = String(value).padStart(2, "0");
      return _t(`W%(weekNumber)s`, { weekNumber });
    }
    case "quarter_number": {
      return _t(`Q%(value)s`, { value });
    }
    default: {
      return value.toString();
    }
  }
}

function computeValuesAndLabels(
  timeValues: CellValue[],
  values: CellValue[],
  horizontalGroupBy: Granularity,
  verticalGroupBy: Granularity,
  locale: Locale
) {
  const grouping = {};
  const xValues: number[] = [];
  const yValues: number[] = [];
  const previousYValues: number[] = [];
  for (let i = 0; i < timeValues?.length; i++) {
    const xValue = toNumber(
      createDate(
        { granularity: horizontalGroupBy, type: "date", displayName: "date" },
        timeValues[i],
        locale
      ),
      locale
    );
    if (!(xValue in grouping)) {
      xValues.push(xValue);
      grouping[xValue] = {};
    }
    const yValue = toNumber(
      createDate(
        { granularity: verticalGroupBy, type: "date", displayName: "date" },
        timeValues[i],
        locale
      ),
      locale
    );
    if (!previousYValues.includes(yValue)) {
      yValues.push(yValue);
      previousYValues.push(yValue);
    }
    if (!(yValue in grouping[xValue])) {
      grouping[xValue][yValue] = 0;
    }
    grouping[xValue][yValue] += values[i];
  }

  xValues.sort((a, b) => a - b);
  yValues.sort((a, b) => b - a);

  const dataSetsValues = yValues.map((y) => ({
    data: xValues.map((x) => grouping?.[x]?.[y]),
    label: getDateTimeLabel(y, verticalGroupBy),
    hidden: false,
  }));

  return {
    dataSetsValues,
    labels: xValues.map((v) => getDateTimeLabel(v, horizontalGroupBy)),
  };
}

export function getCalendarChartData(
  definition: GenericDefinition<CalendarChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): ChartRuntimeGenerationArgs {
  const labelValues = getChartLabelValues(getters, dataSets, labelRange);
  let labels = labelValues.values;
  let dataSetsValues = getChartDatasetValues(getters, dataSets);
  if (shouldRemoveFirstLabel(labelRange, dataSets[0], definition.dataSetsHaveTitle || false)) {
    labels.shift();
  }

  const locale = getters.getLocale() || DEFAULT_LOCALE;

  ({ labels, dataSetsValues } = filterInvalidCalendarDataPoints(labels, dataSetsValues, locale));

  ({ labels, dataSetsValues } = computeValuesAndLabels(
    labels,
    dataSetsValues[0].data,
    definition.horizontalGroupBy ?? "day_of_week",
    definition.verticalGroupBy ?? "hour_number",
    locale
  ));

  const axisFormats = { y: getChartDatasetFormat(getters, dataSets, "left") };

  return {
    dataSetsValues,
    axisFormats,
    labels,
    locale: getters.getLocale(),
    topPadding: getTopPaddingForDashboard(definition, getters),
  };
}

export function getPyramidChartData(
  definition: PyramidChartDefinition,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): ChartRuntimeGenerationArgs {
  const barChartData = getBarChartData(definition, dataSets.slice(0, 2), labelRange, getters);
  const barDataset = barChartData.dataSetsValues.filter((ds) => !ds.hidden);

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
  const axisType = getChartAxisType(definition, dataSets, labelRange, getters);
  const labelValues = getChartLabelValues(getters, dataSets, labelRange);
  let labels = axisType === "linear" ? labelValues.values : labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, dataSets);
  const removeFirstLabel = shouldRemoveFirstLabel(
    labelRange,
    dataSets[0],
    definition.dataSetsHaveTitle || false
  );
  if (removeFirstLabel) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterInvalidDataPoints(labels, dataSetsValues));
  if (axisType === "time") {
    ({ labels, dataSetsValues } = fixEmptyLabelsForDateCharts(labels, dataSetsValues));
  }
  if (definition.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }
  if (definition.cumulative) {
    dataSetsValues = makeDatasetsCumulative(dataSetsValues, "asc");
  }

  const leftAxisFormat = getChartDatasetFormat(getters, dataSets, "left");
  const rightAxisFormat = getChartDatasetFormat(getters, dataSets, "right");
  const labelsFormat = getChartLabelFormat(getters, labelRange, removeFirstLabel);
  const axisFormats = { y: leftAxisFormat, y1: rightAxisFormat, x: labelsFormat };

  const trendDataSetsValues: (Point[] | undefined)[] = [];
  for (const index in dataSetsValues) {
    const trend = definition.dataSets?.[index].trend;
    if (!trend?.display) {
      trendDataSetsValues.push(undefined);
      continue;
    }

    const { data } = dataSetsValues[index];
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
    topPadding: getTopPaddingForDashboard(definition, getters),
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
  if (shouldRemoveFirstLabel(labelRange, dataSets[0], definition.dataSetsHaveTitle || false)) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterInvalidDataPoints(labels, dataSetsValues));

  if (definition.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }

  ({ dataSetsValues, labels } = keepOnlyPositiveValues(labels, dataSetsValues));

  const dataSetFormat = getChartDatasetFormat(getters, dataSets, "left");

  return {
    dataSetsValues,
    axisFormats: { y: dataSetFormat },
    labels,
    locale: getters.getLocale(),
    topPadding: getTopPaddingForDashboard(definition, getters),
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
  if (shouldRemoveFirstLabel(labelRange, dataSets[0], definition.dataSetsHaveTitle || false)) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterInvalidDataPoints(labels, dataSetsValues));
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

export function getGeoChartData(
  definition: GeoChartDefinition,
  fullDataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): GeoChartRuntimeGenerationArgs {
  const dataSets = fullDataSets.slice(0, 1);
  const labelValues = getChartLabelValues(getters, dataSets, labelRange);
  let labels = labelValues.formattedValues;
  if (shouldRemoveFirstLabel(labelRange, dataSets[0], definition.dataSetsHaveTitle || false)) {
    labels.shift();
  }
  let dataSetsValues = getChartDatasetValues(getters, dataSets);
  ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));

  const format =
    getChartDatasetFormat(getters, dataSets, "left") ||
    getChartDatasetFormat(getters, dataSets, "right");

  return {
    dataSetsValues,
    axisFormats: { y: format },
    labels,
    locale: getters.getLocale(),
    availableRegions: getters.getGeoChartAvailableRegions(),
    geoFeatureNameToId: getters.geoFeatureNameToId,
    getGeoJsonFeatures: getters.getGeoJsonFeatures,
  };
}

export function getFunnelChartData(
  definition: GenericDefinition<FunnelChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): ChartRuntimeGenerationArgs {
  const labelValues = getChartLabelValues(getters, dataSets, labelRange);
  let labels = labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, dataSets);
  if (shouldRemoveFirstLabel(labelRange, dataSets[0], definition.dataSetsHaveTitle || false)) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterInvalidDataPoints(labels, dataSetsValues));
  if (definition.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }
  if (definition.cumulative) {
    dataSetsValues = makeDatasetsCumulative(dataSetsValues, "desc");
  }

  const format =
    getChartDatasetFormat(getters, dataSets, "left") ||
    getChartDatasetFormat(getters, dataSets, "right");

  return {
    dataSetsValues,
    axisFormats: { x: format },
    labels,
    locale: getters.getLocale(),
  };
}

export function getHierarchalChartData(
  definition: SunburstChartDefinition | TreeMapChartDefinition,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): ChartRuntimeGenerationArgs {
  // In hierarchical charts, labels are the leaf values (numbers), and the hierarchy is defined in the dataSets (strings)
  let labels = getChartLabelValues(getters, dataSets, labelRange).values;
  let dataSetsValues = getHierarchicalDatasetValues(getters, dataSets);
  const removeFirstLabel = shouldRemoveFirstLabel(
    labelRange,
    dataSets[0],
    definition.dataSetsHaveTitle || false
  );
  if (removeFirstLabel) {
    labels.shift();
  }
  ({ labels, dataSetsValues } = filterValuesWithDifferentSigns(labels, dataSetsValues));
  ({ labels, dataSetsValues } = filterInvalidHierarchicalPoints(labels, dataSetsValues));

  return {
    dataSetsValues,
    axisFormats: { y: getChartLabelFormat(getters, labelRange, removeFirstLabel) },
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
  const trendNewLabels = range(xmin, xmax + step / 2, step);
  const trendValues = interpolateData(config, filteredValues, filteredLabels, trendNewLabels);
  if (!trendValues.length) {
    return;
  }
  return trendValues;
}

function interpolateData(
  config: TrendConfiguration,
  values: number[],
  labels: number[],
  newLabels: number[]
): Point[] {
  if (values.length < 2 || labels.length < 2 || newLabels.length === 0) {
    return [];
  }
  const { normalizedLabels, normalizedNewLabels } = normalizeLabels(labels, newLabels, config);
  try {
    switch (config.type) {
      case "polynomial": {
        const order = config.order;
        if (!order) {
          return newLabels.map((x) => ({ x, y: NaN }));
        }
        if (order === 1) {
          return predictLinearValues(
            [values],
            [normalizedLabels],
            [normalizedNewLabels],
            true
          )[0].map((y, i) => ({ x: newLabels[i], y }));
        }
        const coeffs = polynomialRegression(values, normalizedLabels, order, true).flat();
        return normalizedNewLabels.map((x, i) => ({
          x: newLabels[i],
          y: evaluatePolynomial(coeffs, x, order),
        }));
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
          return newLabels.map((x) => ({ x, y: NaN }));
        }
        return expM(
          predictLinearValues([positiveLogValues], [filteredLabels], [normalizedNewLabels], true)
        )[0].map((y, i) => ({ x: newLabels[i], y }));
      }
      case "logarithmic": {
        return predictLinearValues(
          [values],
          logM([normalizedLabels]),
          logM([normalizedNewLabels]),
          true
        )[0].map((y, i) => ({ x: newLabels[i], y }));
      }
      case "trailingMovingAverage": {
        return getMovingAverageValues(values, labels, config.window);
      }
      default:
        return newLabels.map((x) => ({ x, y: NaN }));
    }
  } catch (e) {
    return newLabels.map((x) => ({ x, y: NaN }));
  }
}

function normalizeLabels(
  labels: number[],
  newLabels: number[],
  config: TrendConfiguration
): { normalizedLabels: number[]; normalizedNewLabels: number[] } {
  let normalizedLabels: number[] = [];
  let normalizedNewLabels: number[] = [];
  if (config.type === "logarithmic") {
    // Logarithmic trends in charts are used to visualize proportional growth or
    // relative changes. Therefore, we change the normalization technique for
    // logarithmic trend lines for a better fit. The method used here is Max Absolute
    // Scaling. This Technique is ideal for data spanning several orders of magnitude,
    // as it balances differences between small and large values by compressing larger
    // values while preserving proportionality and ensuring all values are scaled relative
    // to the largest magnitude.
    const labelMax = Math.max(...labels.map(Math.abs));
    normalizedLabels = labels.map((l) => l / labelMax);
    normalizedNewLabels = newLabels.map((l) => l / labelMax);
  } else {
    const labelMax = Math.max(...labels);
    const labelMin = Math.min(...labels);
    const labelRange = labelMax - labelMin;
    normalizedLabels = labels.map((l) => (l - labelMax) / labelRange);
    normalizedNewLabels = newLabels.map((l) => (l - labelMax) / labelRange);
  }
  return { normalizedLabels, normalizedNewLabels };
}

function getChartAxisType(
  definition: GenericDefinition<LineChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): AxisType {
  if (isDateChart(definition, dataSets, labelRange, getters) && isLuxonTimeAdapterInstalled()) {
    return "time";
  }
  if (isLinearChart(definition, dataSets, labelRange, getters)) {
    return "linear";
  }
  return "category";
}

function isDateChart(
  definition: GenericDefinition<LineChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): boolean {
  return !definition.labelsAsText && canBeDateChart(definition, dataSets, labelRange, getters);
}

function isLinearChart(
  definition: GenericDefinition<LineChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): boolean {
  return !definition.labelsAsText && canBeLinearChart(definition, dataSets, labelRange, getters);
}

export function canChartParseLabels(
  definition: GenericDefinition<LineChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): boolean {
  return (
    canBeDateChart(definition, dataSets, labelRange, getters) ||
    canBeLinearChart(definition, dataSets, labelRange, getters)
  );
}

function canBeDateChart(
  definition: GenericDefinition<LineChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): boolean {
  if (!labelRange || !canBeLinearChart(definition, dataSets, labelRange, getters)) {
    return false;
  }
  const removeFirstLabel = shouldRemoveFirstLabel(
    labelRange,
    dataSets[0],
    definition.dataSetsHaveTitle || false
  );
  const labelFormat = getChartLabelFormat(getters, labelRange, removeFirstLabel);
  return Boolean(labelFormat && timeFormatLuxonCompatible.test(labelFormat));
}

function canBeLinearChart(
  definition: GenericDefinition<LineChartDefinition>,
  dataSets: DataSet[],
  labelRange: Range | undefined,
  getters: Getters
): boolean {
  if (!labelRange) {
    return false;
  }

  const labels = getters.getRangeValues(labelRange);
  if (shouldRemoveFirstLabel(labelRange, dataSets[0], definition.dataSetsHaveTitle || false)) {
    labels.shift();
  }

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
  const adapter = new window.Chart._adapters._date({});
  // @ts-ignore
  const isInstalled = adapter._id === "luxon";
  if (!isInstalled && !missingTimeAdapterAlreadyWarned) {
    missingTimeAdapterAlreadyWarned = true;
    console.warn(
      "'chartjs-adapter-luxon' time adapter is not installed. Time scale axes are disabled."
    );
  }
  return isInstalled;
}

function keepOnlyPositiveValues(
  labels: readonly string[],
  datasets: readonly DatasetValues[]
): { labels: string[]; dataSetsValues: DatasetValues[] } {
  const numberOfDataPoints = Math.max(
    labels.length,
    ...datasets.map((dataset) => dataset.data?.length || 0)
  );
  const filteredIndexes = range(0, numberOfDataPoints).filter((i) =>
    datasets.some((ds) => typeof ds.data[i] === "number" && ds.data[i] > 0)
  );
  return {
    labels: filteredIndexes.map((i) => labels[i] || ""),
    dataSetsValues: datasets.map((ds) => ({
      ...ds,
      data: filteredIndexes.map((i) =>
        typeof ds.data[i] === "number" && ds.data[i] > 0 ? ds.data[i] : null
      ),
    })),
  };
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
      for (const ds of newDatasets) {
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

/**
 * Filter the data points that:
 * - have neither a label nor a value
 * - have no label and a non-numeric value
 */
function filterInvalidDataPoints(
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
    return label || values.some((value) => typeof value === "number");
  });
  return {
    labels: dataPointsIndexes.map((i) => labels[i] || ""),
    dataSetsValues: datasets.map((dataset) => ({
      ...dataset,
      data: dataPointsIndexes.map((i) =>
        typeof dataset.data[i] === "number" ? dataset.data[i] : null
      ),
    })),
  };
}

/**
 * Filter the data points that:
 * - have neither a label nor a value
 * - have no label and a non-numeric value
 */
function filterInvalidCalendarDataPoints(
  labels: string[],
  datasets: DatasetValues[],
  locale: Locale
): { labels: string[]; dataSetsValues: DatasetValues[] } {
  const numberOfDataPoints = Math.max(
    labels.length,
    ...datasets.map((dataset) => dataset.data?.length || 0)
  );
  const dataPointsIndexes = range(0, numberOfDataPoints).filter((dataPointIndex) => {
    const label = labels[dataPointIndex];
    const values = datasets.map((dataset) => dataset.data?.[dataPointIndex]);
    return label && isNumber(label, locale) && typeof values[0] === "number";
  });
  return {
    labels: dataPointsIndexes.map((i) => labels[i] || ""),
    dataSetsValues: datasets.map((dataset) => ({
      ...dataset,
      data: dataPointsIndexes.map((i) =>
        typeof dataset.data[i] === "number" ? dataset.data[i] : null
      ),
    })),
  };
}

/**
 * Filter the data points that have either no value, a negative value, no root group or null group values in the middle
 */
function filterInvalidHierarchicalPoints(
  values: string[],
  hierarchy: DatasetValues[]
): { labels: string[]; dataSetsValues: DatasetValues[] } {
  const numberOfDataPoints = Math.max(
    values.length,
    ...hierarchy.map((dataset) => dataset.data?.length || 0)
  );
  const isEmpty = (value: CellValue) => value === undefined || value === null || value === "";
  const dataPointsIndexes = range(0, numberOfDataPoints).filter((dataPointIndex) => {
    const groups = hierarchy.map((dataset) => dataset.data?.[dataPointIndex]);
    if (isEmpty(groups[0])) {
      return false;
    }
    // Filter points with empty group in the middle
    let hasFoundEmptyGroup = false;
    for (const group of groups) {
      hasFoundEmptyGroup ||= isEmpty(group);
      if (hasFoundEmptyGroup && !isEmpty(group)) {
        return false;
      }
    }
    return values[dataPointIndex] && !isNaN(Number(values[dataPointIndex]));
  });
  return {
    labels: dataPointsIndexes.map((i) => values[i]),
    dataSetsValues: hierarchy.map((dataset) => ({
      ...dataset,
      data: dataPointsIndexes.map((i) => dataset.data[i]),
    })),
  };
}

/**
 * If the values are a mix of positive and negative values, keep only the positive ones
 */
function filterValuesWithDifferentSigns(values: string[], hierarchy: DatasetValues[]) {
  const positivePointsIndexes: number[] = [];
  const negativePointsIndexes: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (Number(values[i]) <= 0) {
      negativePointsIndexes.push(i);
    } else if (Number(values[i]) > 0) {
      positivePointsIndexes.push(i);
    }
  }
  const indexesToKeep = positivePointsIndexes.length
    ? positivePointsIndexes
    : negativePointsIndexes;

  return {
    labels: indexesToKeep.map((i) => values[i]),
    dataSetsValues: hierarchy.map((dataset) => ({
      ...dataset,
      data: indexesToKeep.map((i) => dataset.data[i]),
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

export function getChartLabelFormat(
  getters: Getters,
  range: Range | undefined,
  shouldRemoveFirstLabel: boolean
): Format | undefined {
  if (!range) return undefined;

  const { sheetId, zone } = range;

  const formats = positions(zone).map(
    (position) => getters.getEvaluatedCell({ sheetId, ...position }).format
  );
  if (shouldRemoveFirstLabel) {
    formats.shift();
  }

  return formats.find((format) => format !== undefined);
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
    const dataLength = getData(getters, dataSets[0]).length;
    for (let i = 0; i < dataLength; i++) {
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
    let label = `${ChartTerms.Series} ${parseInt(dsIndex) + 1}`;
    let hidden = getters.isColHidden(ds.dataRange.sheetId, ds.dataRange.zone.left);
    if (ds.labelCell) {
      const { sheetId, zone } = ds.labelCell;
      const cell = getters.getEvaluatedCell({ sheetId, col: zone.left, row: zone.top });
      if (cell) {
        label = cell.formattedValue;
      }
    }

    let data = ds.dataRange ? getData(getters, ds) : [];
    if (
      data.every((e) => !e || (typeof e === "string" && !isEvaluationError(e))) &&
      data.filter((e) => typeof e === "string").length > 1
    ) {
      // Convert categorical data into counts
      data = data.map((e) => (e && !isEvaluationError(e) ? 1 : null));
    } else if (
      data.every(
        (cell) => cell === undefined || cell === null || !isNumber(cell.toString(), DEFAULT_LOCALE)
      )
    ) {
      hidden = true;
    }
    datasetValues.push({ data, label, hidden });
  }
  return datasetValues;
}

/**
 * Get the values for a hierarchical dataset. The values can be defined in a tree-like structure
 * in the sheet, and this function will fill up the blanks.
 *
 * @example the following dataset:
 *
 * 2024    Q1    W1    100
 *               W2    200
 *
 * will have the same value as the dataset:
 * 2024    Q1    W1    100
 * 2024    Q1    W2    200
 */
function getHierarchicalDatasetValues(getters: Getters, dataSets: DataSet[]): DatasetValues[] {
  dataSets = dataSets.filter(
    (ds) => !getters.isColHidden(ds.dataRange.sheetId, ds.dataRange.zone.left)
  );
  const datasetValues: DatasetValues[] = dataSets.map(() => ({ data: [], label: "" }));
  const dataSetsData = dataSets.map((ds) => getData(getters, ds));
  if (!dataSetsData.length) {
    return datasetValues;
  }
  const minLength = Math.min(...dataSetsData.map((ds) => ds.length));

  let currentValues: (CellValue | undefined)[] = [];
  const leafDatasetIndex = dataSets.length - 1;

  for (let i = 0; i < minLength; i++) {
    for (let dsIndex = 0; dsIndex < dataSetsData.length; dsIndex++) {
      let value = dataSetsData[dsIndex][i];
      if ((value === undefined || value === null) && dsIndex !== leafDatasetIndex) {
        value = currentValues[dsIndex];
      }
      if (value !== currentValues[dsIndex]) {
        currentValues = currentValues.slice(0, dsIndex);
        currentValues[dsIndex] = value;
      }
      datasetValues[dsIndex].data.push(value ?? null);
    }
  }

  return datasetValues.filter((ds) => ds.data.some((d) => d !== null));
}

export function makeDatasetsCumulative(
  datasets: DatasetValues[],
  order: "asc" | "desc"
): DatasetValues[] {
  return datasets.map((dataset) => {
    const data: number[] = [];
    let accumulator = 0;
    const indexes =
      order === "asc" ? Object.keys(dataset.data) : Object.keys(dataset.data).reverse();
    for (const i of indexes) {
      if (!isNaN(parseFloat(dataset.data[i]))) {
        accumulator += parseFloat(dataset.data[i]);
        data[i] = accumulator;
      } else {
        data[i] = dataset.data[i];
      }
    }
    return { ...dataset, data };
  });
}

export function getTopPaddingForDashboard(
  definition: GenericDefinition<PieChartDefinition | LineChartDefinition | BarChartDefinition>,
  getters: Getters
) {
  const { title, legendPosition } = definition;
  const hasTitleOrLegendTop = (title && title.text) || legendPosition === "top";
  return getters.isDashboard() && !hasTitleOrLegendTop ? 30 : 0;
}
