import { ChartConfiguration, ChartDataset, LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import { BACKGROUND_CHART_COLOR, LINE_FILL_TRANSPARENCY } from "../../../constants";
import { toNumber } from "../../../functions/helpers";
import { Color, Getters, Locale } from "../../../types";
import { AxisType, DatasetValues, TrendConfiguration } from "../../../types/chart/chart";
import { getChartTimeOptions, timeFormatLuxonCompatible } from "../../chart_date";
import { colorToRGBA, rgbaToHex } from "../../color";
import { formatValue } from "../../format/format";
import { deepCopy, findNextDefinedValue, range } from "../../misc";
import { isNumber } from "../../numbers";
import {
  TREND_LINE_XAXIS_ID,
  chartFontColor,
  computeChartPadding,
  formatTickValue,
  getChartAxisTitleRuntime,
  getChartColorsGenerator,
  getDefinedAxis,
  getFullTrendingLineDataSet,
  interpolateData,
  shouldRemoveFirstLabel,
} from "./chart_common";
import {
  aggregateDataForLabels,
  filterEmptyDataPoints,
  getChartDatasetFormat,
  getChartDatasetValues,
  getChartJSConstructor,
  getChartJsLegend,
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

export function canChartParseLabels(chart: LineChart | ScatterChart, getters: Getters): boolean {
  return canBeDateChart(chart, getters) || canBeLinearChart(chart, getters);
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
  return !chart.labelsAsText && canBeDateChart(chart, getters);
}

function isLinearChart(chart: LineChart | ScatterChart, getters: Getters): boolean {
  return !chart.labelsAsText && canBeLinearChart(chart, getters);
}

function canBeDateChart(chart: LineChart | ScatterChart, getters: Getters): boolean {
  if (!chart.labelRange || !canBeLinearChart(chart, getters)) {
    return false;
  }
  const labelFormat = getChartLabelFormat(
    getters,
    chart.labelRange,
    shouldRemoveFirstLabel(chart.labelRange, chart.dataSets[0], chart.dataSetsHaveTitle)
  );
  return Boolean(labelFormat && timeFormatLuxonCompatible.test(labelFormat));
}

function canBeLinearChart(chart: LineChart | ScatterChart, getters: Getters): boolean {
  if (!chart.labelRange) {
    return false;
  }

  const labels = getters.getRangeValues(chart.labelRange);
  if (shouldRemoveFirstLabel(chart.labelRange, chart.dataSets[0], chart.dataSetsHaveTitle)) {
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
  const Chart = getChartJSConstructor();
  if (!Chart) {
    return false;
  }
  // @ts-ignore
  const adapter = new Chart._adapters._date({});
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
  if (dataset.hidden) {
    return;
  }
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
  const trendLabels = range(xmin, xmax + step / 2, step);
  const trendValues = interpolateData(config, filteredValues, filteredLabels, trendLabels);
  if (!trendValues.length) {
    return;
  }
  return getFullTrendingLineDataSet(dataset, config, trendValues, trendLabels);
}

export function createLineOrScatterChartRuntime(
  chart: LineChart | ScatterChart,
  getters: Getters
): {
  chartJsConfig: ChartConfiguration;
  background: Color;
} {
  const axisType = getChartAxisType(chart, getters);
  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  let labels = axisType === "linear" ? labelValues.values : labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, chart.dataSets);
  const removeFirstLabel = shouldRemoveFirstLabel(
    chart.labelRange,
    chart.dataSets[0],
    chart.dataSetsHaveTitle
  );
  if (removeFirstLabel) {
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
  const dataSetFormat = getChartDatasetFormat(getters, chart.dataSets);
  const options = { format: dataSetFormat, locale, truncateLabels };
  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime(chart, labels, fontColor, options);

  const legend: DeepPartial<LegendOptions<"line">> = getChartJsLegend(fontColor, {
    labels: {
      generateLabels(chart) {
        // color the legend labels with the dataset color, without any transparency
        const { data } = chart;
        const Chart = getChartJSConstructor();
        const labels = Chart.defaults.plugins.legend.labels.generateLabels!(chart);
        for (const [index, label] of labels.entries()) {
          label.fillStyle = data.datasets![index].borderColor as string;
        }
        return labels;
      },
    },
  });

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

  const xAxis = {
    ticks: {
      padding: 5,
      color: fontColor,
    },
    title: getChartAxisTitleRuntime(chart.axesDesign?.x),
  };

  config.options.scales = {
    x: xAxis,
  };

  const yAxis = {
    beginAtZero: true, // the origin of the y axis is always zero
    ticks: {
      color: fontColor,
      callback: formatTickValue(options),
    },
  };
  const { useLeftAxis, useRightAxis } = getDefinedAxis(chart.getDefinition());
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
  if ("stacked" in chart && chart.stacked) {
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
    callback: formatTickValue(options),
  };

  const labelFormat = getChartLabelFormat(getters, chart.labelRange, removeFirstLabel)!;
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
    config.options.plugins!.tooltip!.callbacks!.label = (tooltipItem) => {
      let dataSetPoint: number;
      let label: string | number;
      if (tooltipItem.dataset.xAxisID === TREND_LINE_XAXIS_ID) {
        dataSetPoint = dataSetsValues[tooltipItem.datasetIndex!].data![tooltipItem.dataIndex!].y;
        label = "";
      } else {
        dataSetPoint = dataSetsValues[tooltipItem.datasetIndex!].data![tooltipItem.dataIndex!];
        label = labelValues.values[tooltipItem.dataIndex!];
      }
      if (isNumber(label, locale)) {
        label = toNumber(label, locale);
      }
      const formattedX = formatValue(label, { locale, format: labelFormat });
      const formattedY = formatValue(dataSetPoint, { locale, format: dataSetFormat });
      const dataSetTitle = tooltipItem.dataset.label;
      return formattedX
        ? `${dataSetTitle}: (${formattedX}, ${formattedY})`
        : `${dataSetTitle}: ${formattedY}`;
    };
  }

  const areaChart = "fillArea" in chart ? chart.fillArea : false;
  const stackedChart = "stacked" in chart ? chart.stacked : false;
  const cumulative = "cumulative" in chart ? chart.cumulative : false;

  const definition = chart.getDefinition();
  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  for (let [index, { label, data, hidden }] of dataSetsValues.entries()) {
    const color = colors.next();
    let backgroundRGBA = colorToRGBA(color);
    if (areaChart) {
      backgroundRGBA.a = LINE_FILL_TRANSPARENCY;
    }
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

    const backgroundColor = rgbaToHex(backgroundRGBA);

    const dataset: ChartDataset = {
      label,
      data,
      hidden,
      tension: 0, // 0 -> render straight lines, which is much faster
      borderColor: color,
      backgroundColor,
      pointBackgroundColor: color,
      fill: areaChart ? getFillingMode(index, stackedChart) : false,
    };
    config.data!.datasets!.push(dataset);
  }

  let maxLength = 0;
  const trendDatasets: any[] = [];

  for (const [index, dataset] of config.data.datasets.entries()) {
    if (definition.dataSets?.[index]?.label) {
      const label = definition.dataSets[index].label;
      dataset.label = label;
    }
    if (definition.dataSets?.[index]?.yAxisId) {
      dataset["yAxisID"] = definition.dataSets[index].yAxisId;
    }

    const trend = definition.dataSets?.[index].trend;
    if (!trend?.display) {
      continue;
    }

    const trendDataset = getTrendDatasetForLineChart(trend, dataset, axisType, locale);
    if (trendDataset) {
      maxLength = Math.max(maxLength, trendDataset.data.length);
      trendDatasets.push(trendDataset);
      dataSetsValues.push(trendDataset);
    }
  }
  if (trendDatasets.length) {
    config.options.scales[TREND_LINE_XAXIS_ID] = {
      ...xAxis,
      display: false,
    };
    if (axisType === "category" || axisType === "time") {
      /* We add a second x axis here to draw the trend lines, with the labels length being
       * set so that the second axis points match the classical x axis
       */
      config.options.scales[TREND_LINE_XAXIS_ID]["type"] = "category";
      config.options.scales[TREND_LINE_XAXIS_ID]["labels"] = range(0, maxLength).map((x) =>
        x.toString()
      );
      config.options.scales[TREND_LINE_XAXIS_ID]["offset"] = false;
    }
    /* These datasets must be inserted after the original datasets to ensure the way we
     * distinguish the originals and trendLine datasets after
     */
    trendDatasets.forEach((x) => config.data.datasets!.push(x));
  }
  config.options.plugins!.tooltip!.callbacks!.title = function (tooltipItems) {
    const displayTooltipTitle =
      axisType !== "linear" &&
      tooltipItems.some((item) => item.dataset.xAxisID !== TREND_LINE_XAXIS_ID);
    return displayTooltipTitle ? undefined : "";
  };

  return {
    chartJsConfig: config,
    background: chart.background || BACKGROUND_CHART_COLOR,
  };
}
