import { ChartShowValuesPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_show_values_plugin";
import { ChartSunburstLabelsPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_sunburst_labels_plugin";
import {
  ChartRuntimeGenerationArgs,
  ChartWithDataSetDefinition,
  SunburstChartDefaults,
  SunburstChartDefinition,
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
    callback: formatChartDatasetValue(axisFormats, locale),
  };
}

export function getSunburstShowValues(
  definition: SunburstChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartSunburstLabelsPluginOptions {
  const { axisFormats, locale } = args;
  return {
    callback: formatChartDatasetValue(axisFormats, locale),
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
