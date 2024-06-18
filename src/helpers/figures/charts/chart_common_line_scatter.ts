import { ChartDataset, LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import { BACKGROUND_CHART_COLOR, LINE_FILL_TRANSPARENCY } from "../../../constants";
import { toNumber } from "../../../functions/helpers";
import { Getters, Locale, Range } from "../../../types";
import {
  AxisType,
  ChartJSRuntime,
  DatasetValues,
  TrendConfiguration,
} from "../../../types/chart/chart";
import { getChartTimeOptions, timeFormatLuxonCompatible } from "../../chart_date";
import { setColorAlpha } from "../../color";
import { formatValue } from "../../format/format";
import { deepCopy, findNextDefinedValue, range, removeFalsyAttributes } from "../../misc";
import { isNumber } from "../../numbers";
import {
  INTERACTIVE_LEGEND_CONFIG,
  TREND_LINE_XAXIS_ID,
  chartFontColor,
  computeChartPadding,
  formatChartDatasetValue,
  getChartAxis,
  getChartColorsGenerator,
  getFullTrendingLineDataSet,
  interpolateData,
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
        const date = toNumber({ value: point.x }, locale);
        if (point.y !== null) {
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

export function createLineOrScatterChartRuntime(
  chart: LineChart | ScatterChart,
  getters: Getters
): ChartJSRuntime {
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
  const truncateLabels = axisType === "category";
  const leftAxisFormat = getChartDatasetFormat(getters, chart.dataSets, "left");
  const rightAxisFormat = getChartDatasetFormat(getters, chart.dataSets, "right");
  const axisFormats = { y: leftAxisFormat, y1: rightAxisFormat };
  const options = { locale, truncateLabels, axisFormats };
  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime(chart, labels, fontColor, options);

  const legend: DeepPartial<LegendOptions<"line">> = {
    ...INTERACTIVE_LEGEND_CONFIG,
    labels: {
      color: fontColor,
    },
  };
  if (chart.legendPosition === "none") {
    legend.display = false;
  } else {
    legend.position = chart.legendPosition;
  }
  Object.assign(config.options.plugins!.legend || {}, legend);
  config.options.layout = {
    padding: computeChartPadding({
      displayTitle: !!chart.title.text,
      displayLegend: chart.legendPosition === "top",
    }),
  };

  const definition = chart.getDefinition();
  const stacked = "stacked" in chart && chart.stacked;
  config.options.scales = {
    x: getChartAxis(definition, "bottom", "labels", { locale }),
    y: getChartAxis(definition, "left", "values", { locale, stacked, format: leftAxisFormat }),
    y1: getChartAxis(definition, "right", "values", { locale, stacked, format: rightAxisFormat }),
  };
  config.options.scales = removeFalsyAttributes(config.options.scales);

  config.options.plugins!.chartShowValuesPlugin = {
    showValues: chart.showValues,
    background: chart.background,
    callback: formatChartDatasetValue(axisFormats, locale),
  };

  if (
    chart.dataSetsHaveTitle &&
    dataSetsValues[0] &&
    labels.length > dataSetsValues[0].data.length
  ) {
    labels.shift();
  }

  const labelFormat = getChartLabelFormat(getters, chart.labelRange)!;
  if (axisType === "time") {
    const axis = {
      type: "time",
      time: getChartTimeOptions(labels, labelFormat, locale),
    };
    Object.assign(config.options.scales!.x!, axis);
    config.options.scales!.x!.ticks!.maxTicksLimit = 15;
  } else if (axisType === "linear") {
    config.options.scales!.x!.type = "linear";
    config.options.scales!.x!.ticks!.callback = (value) =>
      formatValue(value, { format: labelFormat, locale });
    config.options.plugins!.tooltip!.callbacks!.title = () => "";
    config.options.plugins!.tooltip!.callbacks!.label = (tooltipItem) => {
      const dataSetPoint = dataSetsValues[tooltipItem.datasetIndex!].data![tooltipItem.dataIndex!];
      let label: string | number = tooltipItem.label || labelValues.values[tooltipItem.dataIndex!];
      if (isNumber(label, locale)) {
        label = toNumber(label, locale);
      }
      const formattedX = formatValue(label, { locale, format: labelFormat });
      const formattedY = formatValue(dataSetPoint, { locale, format: leftAxisFormat });
      const dataSetTitle = tooltipItem.dataset.label;
      return formattedX
        ? `${dataSetTitle}: (${formattedX}, ${formattedY})`
        : `${dataSetTitle}: ${formattedY}`;
    };
  }

  const areaChart = "fillArea" in chart ? chart.fillArea : false;
  const stackedChart = "stacked" in chart ? chart.stacked : false;
  const cumulative = "cumulative" in chart ? chart.cumulative : false;

  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  let maxLength = 0;
  const trendDatasets: any[] = [];

  for (let [index, { label, data }] of dataSetsValues.entries()) {
    if (cumulative) {
      let accumulator = 0;
      data = data.map((value) => {
        if (!isNaN(value)) {
          accumulator += parseFloat(value);
          return accumulator;
        }
        return value;
      });
    }
    if (["linear", "time"].includes(axisType)) {
      // Replace empty string labels by undefined to make sure chartJS doesn't decide that "" is the same as 0
      data = data.map((y, index) => ({ x: labels[index] || undefined, y }));
    }

    const borderColor = colors.next();
    if (definition.dataSets?.[index]?.label) {
      label = definition.dataSets[index].label;
    }

    const dataset: ChartDataset = {
      label,
      data,
      tension: 0, // 0 -> render straight lines, which is much faster
      borderColor,
      backgroundColor: areaChart ? setColorAlpha(borderColor, LINE_FILL_TRANSPARENCY) : borderColor,
      pointBackgroundColor: borderColor,
      fill: areaChart ? getFillingMode(index, stackedChart) : false,
    };

    dataset["yAxisID"] = definition.dataSets[index].yAxisId || "y";

    config.data!.datasets!.push(dataset);

    const trend = definition.dataSets?.[index].trend;
    if (!trend?.display) {
      continue;
    }

    const trendDataset = getTrendDatasetForLineChart(trend, dataset, axisType, locale);
    if (trendDataset) {
      maxLength = Math.max(maxLength, trendDataset.data.length);
      trendDatasets.push(trendDataset);
    }
  }
  if (trendDatasets.length) {
    /* We add a second x axis here to draw the trend lines, with the labels length being
     * set so that the second axis points match the classical x axis
     */
    config.options.scales[TREND_LINE_XAXIS_ID] = {
      ...(config.options.scales.x as any),
      type: "category",
      labels: range(0, maxLength).map((x) => x.toString()),
      offset: false,
      display: false,
    };
    /* These datasets must be inserted after the original datasets to ensure the way we
     * distinguish the originals and trendLine datasets after
     */
    trendDatasets.forEach((x) => config.data.datasets!.push(x));

    const originalTooltipTitle = config.options.plugins!.tooltip!.callbacks!.title;
    config.options.plugins!.tooltip!.callbacks!.title = function (tooltipItems) {
      if (tooltipItems.some((item) => item.dataset.xAxisID !== TREND_LINE_XAXIS_ID)) {
        // @ts-expect-error
        return originalTooltipTitle?.(tooltipItems);
      }
      return "";
    };
  }

  return {
    chartJsConfig: config,
    background: chart.background || BACKGROUND_CHART_COLOR,
  };
}
