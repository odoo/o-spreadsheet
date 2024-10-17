import { ChartShowValuesPluginOptions } from "../../../../components/figures/chart/chartJs/chartjs_show_values_plugin";
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

// ADRM TODO
interface ShowValuesArgs {}

export function getCommonChartShowValues(
  definition: CommonChartJSDefinition,
  args: ShowValuesArgs
): ChartShowValuesPluginOptions {
  return {
    horizontal: "horizontal" in definition && definition.horizontal,
    showValues: "showValues" in definition ? !!definition.showValues : false,
    background: definition.background,
    callback: (value) => value.toString(), // ADRM TODO
  };
}

export function getBarChartShowValues(
  definition: BarChartDefinition,
  args: ShowValuesArgs
): ChartShowValuesPluginOptions {
  return { ...getCommonChartShowValues(definition, args) };
}

export function getLineChartShowValues(
  definition: LineChartDefinition,
  args: ShowValuesArgs
): ChartShowValuesPluginOptions {
  return { ...getCommonChartShowValues(definition, args) };
}

export function getPieChartShowValues(
  definition: PieChartDefinition,
  args: ShowValuesArgs
): ChartShowValuesPluginOptions {
  return { ...getCommonChartShowValues(definition, args) };
}

export function getComboBarChartShowValues(
  definition: ComboBarChartDefinition,
  args: ShowValuesArgs
): ChartShowValuesPluginOptions {
  return { ...getBarChartShowValues(comboDefinitionToBar(definition), args) };
}

export function getWaterfallChartShowValues(
  definition: WaterfallChartDefinition,
  args: ShowValuesArgs
): ChartShowValuesPluginOptions {
  return { ...getBarChartShowValues(waterfallDefinitionToBar(definition), args) };
}

export function getPyramidChartShowValues(
  definition: PyramidChartDefinition,
  args: ShowValuesArgs
): ChartShowValuesPluginOptions {
  return { ...getBarChartShowValues(pyramidDefinitionToBar(definition), args) };
}

export function getScatterChartShowValues(
  definition: ScatterChartDefinition,
  args: ShowValuesArgs
): ChartShowValuesPluginOptions {
  return { ...getLineChartShowValues(scatterDefinitionToLine(definition), args) };
}
