import { ChartOptions } from "chart.js";
import {
  CHART_COLORSCALE_WIDTH,
  CHART_PADDING,
  CHART_PADDING_BOTTOM,
  CHART_PADDING_TOP,
} from "../../../../constants";
import {
  ChartRuntimeGenerationArgs,
  ChartWithDataSetDefinition,
  GenericDefinition,
} from "../../../../types/chart";

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

export function getCalendarChartLayout(
  definition: GenericDefinition<ChartWithDataSetDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartLayout {
  const legendPosition = definition.legendPosition;
  return {
    padding: {
      left: CHART_PADDING + (legendPosition === "left" ? CHART_COLORSCALE_WIDTH : 0),
      right: CHART_PADDING + (legendPosition === "right" ? CHART_COLORSCALE_WIDTH : 0),
      top: Math.max(CHART_PADDING_TOP, args.topPadding || 0),
      bottom: CHART_PADDING_BOTTOM,
    },
  };
}
