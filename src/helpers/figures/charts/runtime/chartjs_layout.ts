import { ChartOptions } from "chart.js";
import { DEFAULT_CHART_PADDING } from "../../../../constants";
import {
  BarChartDefinition,
  ChartWithDataSetDefinition,
  GenericDefinition,
  LineChartDefinition,
  PieChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";

type ChartLayout = ChartOptions["layout"];

export function getCommonChartLayout(
  definition: GenericDefinition<ChartWithDataSetDefinition>
): ChartLayout {
  // TODO FIXME: this is unused ATM. All the charts should probably use this instead oh whatever padding they are using now
  // also look into how DEFAULT_CHART_PADDING is used in scorecards, it look strange
  return {
    padding: {
      left: DEFAULT_CHART_PADDING,
      right: DEFAULT_CHART_PADDING,
      top: definition.title?.text ? DEFAULT_CHART_PADDING / 2 : DEFAULT_CHART_PADDING + 5,
      bottom: DEFAULT_CHART_PADDING,
    },
  };
}

export function getBarChartLayout(definition: GenericDefinition<BarChartDefinition>): ChartLayout {
  return {
    padding: computeChartPadding({
      displayTitle: !!definition.title?.text,
      displayLegend: definition.legendPosition === "top",
    }),
  };
}

export function getLineChartLayout(
  definition: GenericDefinition<LineChartDefinition>
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

function computeChartPadding({
  displayTitle,
  displayLegend,
}: {
  displayTitle: boolean;
  displayLegend: boolean;
}): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  let top = 25;
  if (displayTitle) {
    top = 0;
  } else if (displayLegend) {
    top = 10;
  }
  return { left: 20, right: 20, top, bottom: 10 };
}
