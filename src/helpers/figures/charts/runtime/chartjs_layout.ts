import {
  CHART_COLORSCALE_WIDTH,
  CHART_PADDING,
  CHART_PADDING_BOTTOM,
  CHART_PADDING_TOP,
} from "@odoo/o-spreadsheet-engine/constants";
import {
  ChartDefinitionWithDataSource,
  ChartRuntimeGenerationArgs,
  GenericDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import { ChartOptions } from "chart.js";

type ChartLayout = ChartOptions["layout"];

export function getChartLayout(
  definition: GenericDefinition<ChartDefinitionWithDataSource>,
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
  definition: GenericDefinition<ChartDefinitionWithDataSource>,
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
