import { ChartShowValuesPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_show_values_plugin";
import { ChartRuntimeGenerationArgs, ChartWithDataSetDefinition } from "../../../../types/chart";
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

/**
 * Specialized configuration for pyramid chart to format absolute values.
 */
export function getPyramidChartShowValues(
  definition: ChartWithDataSetDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { axisFormats, locale } = args;
  const formatDatasetValue = formatChartDatasetValue(axisFormats, locale);

  return {
    horizontal: true,
    showValues: "showValues" in definition ? !!definition.showValues : false,
    background: definition.background,
    callback: (value, axisId) => {
      const absValue = Math.abs(Number(value));
      return absValue === 0 ? "" : formatDatasetValue(absValue, axisId);
    },
  };
}
