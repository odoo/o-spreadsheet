import { ChartConfiguration, ChartDataset, LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import { BACKGROUND_CHART_COLOR, LINE_FILL_TRANSPARENCY } from "../../../constants";
import { Color, Format, Getters, LocaleFormat, Range } from "../../../types";
import { AxisType, DatasetValues, LabelValues } from "../../../types/chart/chart";
import { getChartTimeOptions, timeFormatLuxonCompatible } from "../../chart_date";
import { colorToRGBA, rgbaToHex } from "../../color";
import { formatValue } from "../../format";
import { deepCopy, findNextDefinedValue } from "../../misc";
import { ChartColors, chartFontColor } from "./chart_common";
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
  // @ts-ignore
  if (!window.Chart) {
    return false;
  }
  // @ts-ignore
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

function getLineOrScatterConfiguration(
  chart: LineChart | ScatterChart,
  labels: string[],
  localeFormat: LocaleFormat
): Required<ChartConfiguration> {
  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime(chart, labels, fontColor, localeFormat);

  const legend: DeepPartial<LegendOptions<"line">> = {
    labels: {
      color: fontColor,
      generateLabels(chart) {
        // color the legend labels with the dataset color, without any transparency
        const { data } = chart;
        /** @ts-ignore */
        const labels = (window.Chart as typeof ChartType).defaults.plugins.legend.labels
          .generateLabels!(chart);
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
  Object.assign(config.options.plugins!.legend || {}, legend);
  config.options.layout = {
    padding: { left: 20, right: 20, top: chart.title ? 10 : 25, bottom: 10 },
  };

  config.options.scales = {
    x: {
      ticks: {
        padding: 5,
        color: fontColor,
      },
    },
    y: {
      position: chart.verticalAxisPosition,
      beginAtZero: true, // the origin of the y axis is always zero
      ticks: {
        color: fontColor,
        callback: (value) => {
          value = Number(value);
          if (isNaN(value)) return value;
          const { locale, format } = localeFormat;
          return formatValue(value, { locale, format: !format && value > 1000 ? "#,##" : format });
        },
      },
    },
  };
  if ("stacked" in chart && chart.stacked && config.options?.scales?.y) {
    // @ts-ignore chart.js type is wrong
    config.options.scales.y.stacked = true;
  }
  return config;
}

export function createLineOrScatterChartRuntime(
  chart: LineChart | ScatterChart,
  getters: Getters
): {
  chartJsConfig: ChartConfiguration;
  background: Color;
  dataSetsValues: DatasetValues[];
  labelValues: LabelValues;
  dataSetFormat: Format | undefined;
  labelFormat: Format | undefined;
} {
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
  const config = getLineOrScatterConfiguration(chart, labels, localeFormat);
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
    config.options.plugins!.tooltip!.callbacks!.title = (tooltipItem) => {
      return formatValue(tooltipItem[0].parsed.x || tooltipItem[0].label, {
        locale,
        format: labelFormat,
      });
    };
  }

  const stacked = "stacked" in chart ? chart.stacked : false;
  const cumulative = "cumulative" in chart ? chart.cumulative : false;

  const colors = new ChartColors();
  for (let [index, { label, data }] of dataSetsValues.entries()) {
    if (["linear", "time"].includes(axisType)) {
      // Replace empty string labels by undefined to make sure chartJS doesn't decide that "" is the same as 0
      data = data.map((y, index) => ({ x: labels[index] || undefined, y }));
    }
    const color = colors.next();
    let backgroundRGBA = colorToRGBA(color);
    if (stacked) {
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

    const backgroundColor = rgbaToHex(backgroundRGBA);

    const dataset: ChartDataset = {
      label,
      data,
      tension: 0, // 0 -> render straight lines, which is much faster
      borderColor: color,
      backgroundColor,
      pointBackgroundColor: color,
      fill: stacked ? getFillingMode(index) : false,
    };
    config.data!.datasets!.push(dataset);
  }

  return {
    chartJsConfig: config,
    background: chart.background || BACKGROUND_CHART_COLOR,
    dataSetsValues,
    labelValues,
    dataSetFormat,
    labelFormat,
  };
}
