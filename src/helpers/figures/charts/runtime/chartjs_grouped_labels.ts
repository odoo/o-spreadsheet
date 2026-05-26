import { ChartGroupedLabelsPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_grouped_labels_plugin";
import { ChartRuntimeGenerationArgs } from "../../../../types/chart/chart";
import { Color } from "../../../../types/misc";
import { chartFontColor } from "../chart_common";

export function getChartGroupedLabels(
  chartData: ChartRuntimeGenerationArgs,
  background: Color | undefined,
  horizontal?: boolean
): ChartGroupedLabelsPluginOptions {
  const parentCategories = chartData.parentCategories;
  const isMultiLevel = !!parentCategories && parentCategories.length > 0;
  return {
    enabled: isMultiLevel,
    fontColor: chartFontColor(background) as Color,
    parentCategories: isMultiLevel ? parentCategories : undefined,
    indexAxis: horizontal ? "y" : "x",
  };
}
