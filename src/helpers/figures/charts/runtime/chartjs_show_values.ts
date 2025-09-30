import { ChartMeta } from "chart.js";
import { ChartShowValuesPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_show_values_plugin";
import { ChartSunburstLabelsPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_sunburst_labels_plugin";
import {
  ChartRuntimeGenerationArgs,
  ChartWithDataSetDefinition,
  schemeToColorScale,
  SunburstChartDefaults,
  SunburstChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { CalendarChartDefinition } from "../../../../types/chart/calendar_chart";
import { humanizeNumber } from "../../../format/format";
import { chartFontColor, formatChartDatasetValue } from "../chart_common";
import { getRuntimeColorScale } from "./chartjs_scales";

export function getChartShowValues(
  definition: ChartWithDataSetDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { axisFormats, locale } = args;
  return {
    horizontal: "horizontal" in definition && definition.horizontal,
    showValues: "showValues" in definition ? !!definition.showValues : false,
    background: () => definition.background,
    callback: (value: number | string, dataset: ChartMeta) => {
      const axisId = getDatasetAxisId(definition, dataset);
      return formatChartDatasetValue(axisFormats, locale, definition.humanize)(value, axisId);
    },
  };
}

export function getCalendarChartShowValues(
  definition: CalendarChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { locale, axisFormats } = args;
  let background = (_value, dataset, index) => definition.background;
  const values =
    args.dataSetsValues
      .flat()
      .map((dsv) => dsv?.data.filter((v) => v !== null))
      .flat() || [];
  if (values.length) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const colorScale = getRuntimeColorScale(
      definition.colorScale ?? schemeToColorScale("oranges")!,
      min,
      max
    );
    background = (_value: number | string, dataset: ChartMeta<any>, index) => {
      const value = dataset._dataset.values[index];
      if (value === undefined) {
        return definition.background;
      }
      return chartFontColor(colorScale(value));
    };
  }
  return {
    horizontal: false,
    showValues: "showValues" in definition ? !!definition.showValues : false,
    background,
    callback: (_value: number | string, dataset: ChartMeta<any>, index) => {
      const value = dataset._dataset.values[index];
      return value === undefined ? "" : humanizeNumber({ value, format: axisFormats?.y }, locale);
    },
  };
}

export function getSunburstShowValues(
  definition: SunburstChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartSunburstLabelsPluginOptions {
  const { axisFormats, locale } = args;
  return {
    callback: formatChartDatasetValue(axisFormats, locale, definition.humanize),
    showLabels: definition.showLabels ?? SunburstChartDefaults.showLabels,
    showValues: definition.showValues ?? SunburstChartDefaults.showValues,
    style: {
      fontSize: definition.valuesDesign?.fontSize ?? SunburstChartDefaults.valuesDesign.fontSize,
      align: definition.valuesDesign?.align ?? SunburstChartDefaults.valuesDesign.align,
      bold: definition.valuesDesign?.bold ?? SunburstChartDefaults.valuesDesign.bold,
      italic: definition.valuesDesign?.italic ?? SunburstChartDefaults.valuesDesign.italic,
      textColor: definition.valuesDesign?.color ?? SunburstChartDefaults.valuesDesign.color,
    },
  };
}

export function getPyramidChartShowValues(
  definition: ChartWithDataSetDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { axisFormats, locale } = args;
  return {
    horizontal: true,
    showValues: "showValues" in definition ? !!definition.showValues : false,
    background: () => definition.background,
    callback: (value: number | string, dataset: ChartMeta) => {
      value = Math.abs(Number(value));
      return value === 0
        ? ""
        : formatChartDatasetValue(axisFormats, locale)(value, dataset.xAxisID || "x");
    },
  };
}

export function getWaterfallChartShowValues(
  definition: WaterfallChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { axisFormats, locale, dataSetsValues } = args;

  const subtotalIndexes = dataSetsValues.reduce((subtotalIndexes, ds) => {
    subtotalIndexes.push((subtotalIndexes.at(-1) || -1) + ds.data.length + 1);
    return subtotalIndexes;
  }, [] as number[]);

  return {
    showValues: "showValues" in definition ? !!definition.showValues : false,
    background: () => definition.background,
    callback: (value: number | string, dataset: any, index: number) => {
      const raw = dataset._dataset.data[index];
      const delta = raw[1] - raw[0];
      let sign = delta >= 0 ? "+" : "";
      if (definition.showSubTotals && subtotalIndexes.includes(index) && sign === "+") {
        sign = "";
      }
      return `${sign}${formatChartDatasetValue(
        axisFormats,
        locale,
        definition.humanize
      )(delta, dataset.yAxisID)}`;
    },
  };
}

function getDatasetAxisId(definition: ChartWithDataSetDefinition, dataset: ChartMeta): string {
  if (dataset.rAxisID) {
    return dataset.rAxisID;
  }
  const axisId =
    "horizontal" in definition && definition.horizontal ? dataset.xAxisID : dataset.yAxisID;
  return axisId || "y";
}
