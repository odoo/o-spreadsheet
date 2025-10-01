import {
  ChartRuntimeGenerationArgs,
  ChartWithDataSetDefinition,
  GenericDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import { ChartOptions } from "chart.js";
import { CHART_PADDING, CHART_PADDING_BOTTOM, CHART_PADDING_TOP } from "../../../../constants";

type ChartLayout = ChartOptions["layout"];

export function getChartLayout(
  definition: GenericDefinition<ChartWithDataSetDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLayout {
  return {
    padding: {
      left: CHART_PADDING,
      right: CHART_PADDING,
      top: Math.max(CHART_PADDING_TOP, args.topPadding || 0),
      bottom: CHART_PADDING_BOTTOM,
    },
  };
}
