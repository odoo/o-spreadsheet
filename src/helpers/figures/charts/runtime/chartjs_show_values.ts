import { ChartMeta } from "chart.js";
import { ChartShowValuesPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_show_values_plugin";
import {
  ChartRuntimeGenerationArgs,
  ChartWithDataSetDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { formatChartDatasetValue } from "../chart_common";

export function getChartShowValues(
  definition: ChartWithDataSetDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { axisFormats, locale } = args;
  return {
    horizontal: "horizontal" in definition && definition.horizontal,
    showValues: "showValues" in definition ? !!definition.showValues : false,
    background: definition.background,
    callback: (value: number | string, dataset: ChartMeta) => {
      const axisId = getDatasetAxisId(definition, dataset);
      return formatChartDatasetValue(axisFormats, locale)(value, axisId);
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
    background: definition.background,
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
    background: definition.background,
    callback: (value: number | string, dataset: any, index: number) => {
      const raw = dataset._dataset.data[index];
      const delta = raw[1] - raw[0];
      let sign = delta >= 0 ? "+" : "";
      if (definition.showSubTotals && subtotalIndexes.includes(index) && sign === "+") {
        sign = "";
      }
      return `${sign}${formatChartDatasetValue(axisFormats, locale)(delta, dataset.yAxisID)}`;
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
