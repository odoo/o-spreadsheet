import { ChartMeta } from "chart.js";
import { Range } from "../../../..";
import { ChartShowValuesPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_show_values_plugin";
import { ChartSunburstLabelsPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_sunburst_labels_plugin";
import { BarChartDefinition } from "../../../../types/chart/bar_chart";
import {
  ChartDefinition,
  ChartRuntimeGenerationArgs,
  ChartShowValues,
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

export function getChartShowValues(
  definition: ChartDefinition<Range>,
  args: ChartRuntimeGenerationArgs,
  defaultOptions: ChartShowValues = {}
): ChartShowValuesPluginOptions {
  const { axisFormats, locale } = args;
  return {
    type: definition.type,
    horizontal: "horizontal" in definition && definition.horizontal,
    display: { showData: defaultOptions, ...definition }.showData,
    background: () => definition.background,
    callback: (value: number | string, dataset: ChartMeta) => {
      const axisId = getDatasetAxisId(definition, dataset);
      return formatChartDatasetValue(axisFormats, locale, definition.humanize)(value, axisId);
    },
  };
}

export function getBarChartShowValues(
  definition: BarChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const showValues = getChartShowValues(definition, args);
  if (!showValues.display?.percentages || args.dataSetsValues.length === 1) {
    return showValues;
  }
  return { ...showValues, display: { ...showValues.display, percentages: false } };
}

export function getColorGridChartShowValues(
  definition: ColorGridChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { locale, dataSetsValues } = args;
  return {
    type: definition.type,
    horizontal: false,
    display: definition.showData ?? {},
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
  const design = {
    ...SunburstChartDefaults.showData.valuesDesign,
    ...definition.showData?.valuesDesign,
  };
  return {
    callback: formatChartDatasetValue(axisFormats, locale, definition.humanize),
    display: {
      ...SunburstChartDefaults.showData,
      ...definition.showData,
    },
    style: {
      fontSize: design.fontSize,
      align: design.align,
      bold: design.bold,
      italic: design.italic,
      textColor: design.color,
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
    display: definition.showData ?? {},
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
    display: definition.showData ?? {},
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
