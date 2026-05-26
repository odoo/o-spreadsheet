import { ChartGroupedLabelsPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_grouped_labels_plugin";
import { ChartRuntimeGenerationArgs } from "../../../../types/chart/chart";
import { Color } from "../../../../types/misc";
import { chartFontColor } from "../chart_common";

export function getChartGroupedLabels(
  definition: { background?: Color; horizontal?: boolean; mergeGroups?: boolean },
  { parentCategories }: Pick<ChartRuntimeGenerationArgs, "parentCategories">
): ChartGroupedLabelsPluginOptions {
  return {
    fontColor: chartFontColor(definition.background),
    parentCategories: parentCategories?.length ? parentCategories : undefined,
    indexAxis: definition.horizontal ? "y" : "x",
    mergeGroups: !!definition.mergeGroups,
  };
}
