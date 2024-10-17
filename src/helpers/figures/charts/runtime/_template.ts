import {
  BarChartDefinition,
  CommonChartJSDefinition,
  LineChartDefinition,
  PieChartDefinition,
  PyramidChartDefinition,
  ScatterChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { ComboBarChartDefinition } from "../../../../types/chart/common_bar_combo";
import {
  comboDefinitionToBar,
  pyramidDefinitionToBar,
  scatterDefinitionToLine,
  waterfallDefinitionToBar,
} from "./convert_definition";

interface ChartThing {}
interface ThingArgs {}

export function getCommonChartThing(
  definition: CommonChartJSDefinition,
  args: ThingArgs
): ChartThing {
  return {};
}

export function getBarChartThing(definition: BarChartDefinition, args: ThingArgs): ChartThing {
  return { ...getCommonChartThing(definition, args) };
}

export function getLineChartThing(definition: LineChartDefinition, args: ThingArgs): ChartThing {
  return { ...getCommonChartThing(definition, args) };
}

export function getPieChartThing(definition: PieChartDefinition, args: ThingArgs): ChartThing {
  return { ...getCommonChartThing(definition, args) };
}

export function getComboBarChartThing(
  definition: ComboBarChartDefinition,
  args: ThingArgs
): ChartThing {
  return { ...getBarChartThing(comboDefinitionToBar(definition), args) };
}

export function getWaterfallChartThing(
  definition: WaterfallChartDefinition,
  args: ThingArgs
): ChartThing {
  return { ...getBarChartThing(waterfallDefinitionToBar(definition), args) };
}

export function getPyramidChartThing(
  definition: PyramidChartDefinition,
  args: ThingArgs
): ChartThing {
  return { ...getBarChartThing(pyramidDefinitionToBar(definition), args) };
}

export function getScatterChartThing(
  definition: ScatterChartDefinition,
  args: ThingArgs
): ChartThing {
  return { ...getLineChartThing(scatterDefinitionToLine(definition), args) };
}
