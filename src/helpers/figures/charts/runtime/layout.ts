import { ChartOptions } from "chart.js";
import { DEFAULT_CHART_PADDING } from "../../../../constants";
import { ChartDefinition } from "../../../../types";
import {
  BarChartDefinition,
  LineChartDefinition,
  PieChartDefinition,
  PyramidChartDefinition,
  ScatterChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { ComboBarChartDefinition } from "../../../../types/chart/common_bar_combo";
import { computeChartPadding } from "../chart_common";
import {
  comboDefinitionToBar,
  pyramidDefinitionToBar,
  scatterDefinitionToLine,
  waterfallDefinitionToBar,
} from "./convert_definition";

type ChartLayout = ChartOptions["layout"];

export function getCommonChartLayout(definition: ChartDefinition): ChartLayout {
  return {
    padding: {
      left: DEFAULT_CHART_PADDING,
      right: DEFAULT_CHART_PADDING,
      top: definition.title.text ? DEFAULT_CHART_PADDING / 2 : DEFAULT_CHART_PADDING + 5,
      bottom: DEFAULT_CHART_PADDING,
    },
  };
}

export function getBarChartLayout(definition: BarChartDefinition): ChartLayout {
  return {
    ...getCommonChartLayout(definition),
    padding: computeChartPadding({
      displayTitle: !!definition.title.text,
      displayLegend: definition.legendPosition === "top",
    }),
  };
}

export function getLineChartLayout(definition: LineChartDefinition): ChartLayout {
  return {
    ...getCommonChartLayout(definition),
    padding: computeChartPadding({
      displayTitle: !!definition.title.text,
      displayLegend: definition.legendPosition === "top",
    }),
  };
}

export function getPieChartLayout(definition: PieChartDefinition): ChartLayout {
  return {
    ...getCommonChartLayout(definition),
    padding: { left: 20, right: 20, top: definition.title ? 10 : 25, bottom: 10 },
  };
}

export function getComboBarChartLayout(definition: ComboBarChartDefinition): ChartLayout {
  return { ...getBarChartLayout(comboDefinitionToBar(definition)) };
}

export function getWaterfallChartLayout(definition: WaterfallChartDefinition): ChartLayout {
  return {
    ...getBarChartLayout(waterfallDefinitionToBar(definition)),
    padding: { left: 20, right: 20, top: definition.title ? 10 : 25, bottom: 10 },
  };
}

export function getPyramidChartLayout(definition: PyramidChartDefinition): ChartLayout {
  return { ...getBarChartLayout(pyramidDefinitionToBar(definition)) };
}

export function getScatterChartLayout(definition: ScatterChartDefinition): ChartLayout {
  return { ...getLineChartLayout(scatterDefinitionToLine(definition)) };
}
