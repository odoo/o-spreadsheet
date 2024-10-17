import {
  BarChartDefinition,
  LineChartDefinition,
  PyramidChartDefinition,
  ScatterChartDefinition,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { ComboBarChartDefinition } from "../../../../types/chart/common_bar_combo";

export function waterfallDefinitionToBar(definition: WaterfallChartDefinition): BarChartDefinition {
  return { ...definition, type: "bar", stacked: false };
}

export function pyramidDefinitionToBar(definition: PyramidChartDefinition): BarChartDefinition {
  return { ...definition, type: "bar" };
}

export function comboDefinitionToBar(definition: ComboBarChartDefinition): BarChartDefinition {
  return { ...definition, type: "bar", stacked: true };
}

export function scatterDefinitionToLine(definition: ScatterChartDefinition): LineChartDefinition {
  return { ...definition, type: "line", stacked: false, cumulative: false };
}
