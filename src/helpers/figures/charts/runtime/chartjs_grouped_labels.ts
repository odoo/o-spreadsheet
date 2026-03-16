import { chartFontColor } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { ChartGroupedLabelsPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_grouped_labels_plugin";
import { ChartRuntimeGenerationArgs, Color } from "../../../../types";

/**
 * Build the options object for chartGroupedLabelsPlugin.
 * This plugin is enabled when ChartRuntimeGenerationArgs.secondaryLabels is
 * present and non-empty in chartData (when more than one label range is used).
 * The secondary label arrays are passed directly to the plugin so it can draw
 * bracket-style group indicators below the x-axis without touching
 * `chart.data.labels`.
 */
export function getChartGroupedLabels(
  chartData: ChartRuntimeGenerationArgs,
  background: Color | undefined
): ChartGroupedLabelsPluginOptions {
  const secondaryLabels = chartData.secondaryLabels;
  const isMultiLevel = !!secondaryLabels && secondaryLabels.length > 0;
  return {
    enabled: isMultiLevel,
    fontColor: chartFontColor(background) as Color,
    secondaryLabels: isMultiLevel ? secondaryLabels : undefined,
  };
}
