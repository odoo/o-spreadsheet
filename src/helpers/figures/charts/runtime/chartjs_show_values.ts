import { ChartShowValuesPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_show_values_plugin";
import { ChartRuntimeGenerationArgs, ChartWithDataSetDefinition } from "../../../../types/chart";
import { formatChartDatasetValue } from "../chart_common";

export function getChartShowValues(
  definition: ChartWithDataSetDefinition,
  args: ChartRuntimeGenerationArgs
): ChartShowValuesPluginOptions {
  const { axisFormats, locale } = args;
  const formatDatasetValue = formatChartDatasetValue(axisFormats, locale);
  const isPyramidChart = definition.type === "pyramid";

  return {
    horizontal: "horizontal" in definition && definition.horizontal,
    showValues: "showValues" in definition ? !!definition.showValues : false,
    background: definition.background,
    callback: (value, axisId) => {
      const valueToFormat = isPyramidChart ? Math.abs(Number(value)) : value;
      if (isPyramidChart && valueToFormat === 0) {
        return "";
      }
      return formatDatasetValue(valueToFormat, axisId);
    },
  };
}
