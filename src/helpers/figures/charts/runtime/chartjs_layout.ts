import { ChartOptions } from "chart.js";
import { CHART_PADDING, CHART_PADDING_BOTTOM, CHART_PADDING_TOP } from "../../../../constants";
import { ChartWithDataSetDefinition, GenericDefinition } from "../../../../types/chart";

type ChartLayout = ChartOptions["layout"];

export function getChartLayout(
  definition: GenericDefinition<ChartWithDataSetDefinition>
): ChartLayout {
  return {
    padding: {
      left: CHART_PADDING,
      right: CHART_PADDING,
      top: CHART_PADDING_TOP,
      bottom: CHART_PADDING_BOTTOM,
    },
  };
}
