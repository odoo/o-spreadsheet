import { chartFontColor } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { ChartGroupedLabelsPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_grouped_labels_plugin";
import { ChartRuntimeGenerationArgs, Color } from "../../../../types";

/**
 * Build the options object for {@link chartGroupedLabelsPlugin}.
 *
 * The plugin is enabled when at least one label is an array with more than one
 * element, i.e., when multiple label ranges are present (typically after
 * converting from a treemap / sunburst chart).
 */
export function getChartGroupedLabels(
  chartData: ChartRuntimeGenerationArgs,
  background: Color | undefined
): ChartGroupedLabelsPluginOptions {
  const labels = chartData.labels ?? [];
  const isMultiLevel = Array.isArray(labels[0]) && (labels[0] as string[]).length > 1;
  return {
    enabled: isMultiLevel,
    fontColor: chartFontColor(background) as Color,
  };
}
