import { ChartOptions } from "chart.js";
import { DEFAULT_CHART_PADDING } from "../../../../constants";
import {
  BarChartDefinition,
  ChartWithDataSetDefinition,
  LineChartDefinition,
  PartialDefinition,
  PieChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { computeChartPadding } from "../chart_common";

type ChartLayout = ChartOptions["layout"];

export function getCommonChartLayout(
  definition: PartialDefinition<ChartWithDataSetDefinition>
): ChartLayout {
  // TODO FIXME: this is unused ATM. All the charts should probably use this instead oh whatever padding they are using now
  return {
    padding: {
      left: DEFAULT_CHART_PADDING,
      right: DEFAULT_CHART_PADDING,
      top: definition.title?.text ? DEFAULT_CHART_PADDING / 2 : DEFAULT_CHART_PADDING + 5,
      bottom: DEFAULT_CHART_PADDING,
    },
  };
}

export function getBarChartLayout(definition: PartialDefinition<BarChartDefinition>): ChartLayout {
  return {
    padding: computeChartPadding({
      displayTitle: !!definition.title?.text,
      displayLegend: definition.legendPosition === "top",
    }),
  };
}

export function getLineChartLayout(
  definition: PartialDefinition<LineChartDefinition>
): ChartLayout {
  return {
    padding: computeChartPadding({
      displayTitle: !!definition.title?.text,
      displayLegend: definition.legendPosition === "top",
    }),
  };
}

export function getPieChartLayout(definition: PieChartDefinition): ChartLayout {
  return {
    padding: { left: 20, right: 20, top: definition.title ? 10 : 25, bottom: 10 },
  };
}

export function getWaterfallChartLayout(definition: WaterfallChartDefinition): ChartLayout {
  return {
    padding: { left: 20, right: 20, top: definition.title ? 10 : 25, bottom: 10 },
  };
}
