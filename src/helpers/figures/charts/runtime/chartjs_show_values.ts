import { ChartMeta } from "chart.js";
import { Range } from "../../../..";
import { ChartShowValuesPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_show_values_plugin";
import { ChartSunburstLabelsPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_sunburst_labels_plugin";
import {
  ChartDefinition,
  ChartRuntimeGenerationArgs,
  ChartStyle,
} from "../../../../types/chart/chart";
import { ColorGridChartDefinition } from "../../../../types/chart/common_chart";
import { PyramidChartDefinition } from "../../../../types/chart/pyramid_chart";
import {
  SunburstChartDefaults,
  SunburstChartDefinition,
} from "../../../../types/chart/sunburst_chart";
import { WaterfallChartDefinition } from "../../../../types/chart/waterfall_chart";
import { isNumberResult } from "../../../cells/cell_evaluation";
import { humanizeNumber } from "../../../format/format";
import { formatChartDatasetValue } from "../chart_common";

export type ChartShowValues = {
  values?: boolean;
  labels?: boolean;
  percentages?: boolean;
  valuesDesign?: ChartStyle;
};

export function getChartShowValues(
  definition: ChartDefinition<Range>,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { axisFormats, locale } = args;
  return {
    type: definition.type,
    horizontal: "horizontal" in definition && definition.horizontal,
    display: "showData" in definition ? definition.showData : {},
    background: () => definition.background,
    callback: (value: number | string, dataset: ChartMeta) => {
      const axisId = getDatasetAxisId(definition, dataset);
      return formatChartDatasetValue(axisFormats, locale, definition.humanize)(value, axisId);
    },
  };
}

export function getColorGridChartShowValues(
  definition: ColorGridChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { locale, dataSetsValues } = args;
  return {
    type: definition.type,
    horizontal: false,
    display: "showData" in definition ? definition.showData : {},
    background: () => definition.background,
    callback: (_value: number | string, dataset: ChartMeta, index) => {
      const cell = dataSetsValues[dataset.index]?.data[index];
      return isNumberResult(cell) ? humanizeNumber(cell, locale) : "";
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
    display: {
      labels: definition.showData?.labels ?? SunburstChartDefaults.showLabels,
      values: definition.showData?.values ?? SunburstChartDefaults.showValues,
    },
    style: {
      fontSize:
        definition.showData?.valuesDesign?.fontSize ?? SunburstChartDefaults.valuesDesign.fontSize,
      align: definition.showData?.valuesDesign?.align ?? SunburstChartDefaults.valuesDesign.align,
      bold: definition.showData?.valuesDesign?.bold ?? SunburstChartDefaults.valuesDesign.bold,
      italic:
        definition.showData?.valuesDesign?.italic ?? SunburstChartDefaults.valuesDesign.italic,
      textColor:
        definition.showData?.valuesDesign?.color ?? SunburstChartDefaults.valuesDesign.color,
    },
  };
}

export function getPyramidChartShowValues(
  definition: PyramidChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { axisFormats, locale } = args;
  return {
    type: "pyramid",
    horizontal: true,
    display: "showData" in definition ? definition.showData : {},
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
    type: "waterfall",
    display: "showData" in definition ? definition.showData : {},
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

function getDatasetAxisId(definition: ChartDefinition<Range>, dataset: ChartMeta): string {
  if (dataset.rAxisID) {
    return dataset.rAxisID;
  }
  const axisId =
    "horizontal" in definition && definition.horizontal ? dataset.xAxisID : dataset.yAxisID;
  return axisId || "y";
}
