import { ChartType, Plugin } from "chart.js";
import { getColorScale, lightenColor } from "../../../../helpers";
import { getChartColorsGenerator } from "../../../../helpers/figures/charts/runtime/chartjs_dataset";
import {
  TreeMapCategoryColorOptions,
  TreeMapChartDefaults,
  TreeMapChartDefinition,
  TreeMapColorScaleOptions,
  TreeMapGroupColor,
  TreeMapTree,
} from "../../../../types/chart/tree_map_chart";

export interface TreeMapColorsPluginOptions {
  definition: TreeMapChartDefinition;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    treeMapColorsPlugin?: TreeMapColorsPluginOptions;
  }
}
/**
 * This plugin is used to define the background color of the TreeMap chart items.
 *
 * This is done here instead of at the definition of the dataset because we need the groupBy computed by the chart, which
 * are not available at the time of computing the runtime. They are accessible here through the `chart.config.datasets.data`
 * property which is a proxy to the generated chart config.
 */
export const treeMapColorsPlugin: Plugin = {
  id: "treeMapColorsPlugin",
  beforeUpdate(chart: any, args, options: TreeMapColorsPluginOptions) {
    if (chart.config.type !== "treemap") {
      return;
    }
    const definition = options.definition;
    const dataset = chart.config.data.datasets?.[0];
    const tree = dataset?.tree;
    if (!tree || !tree.length) {
      return;
    }

    const maxDepth = Object.keys(tree[0]).length - 2;

    for (const dataset of chart.config.data.datasets) {
      dataset.backgroundColor = (ctx: any) => {
        if (ctx.type !== "data") {
          return "transparent";
        }
        if (!ctx.raw.isLeaf) {
          return definition.headerDesign?.fillColor || TreeMapChartDefaults.headerDesign?.fillColor;
        }
        const coloringOption = definition.coloringOptions || TreeMapChartDefaults.coloringOptions;
        if (coloringOption.type === "colorScale") {
          const colorScale = getTreeMapColorScale(dataset, coloringOption, maxDepth);
          return colorScale?.(ctx.raw.v) || "#FF0000";
        } else if (coloringOption.type === "categoryColor") {
          const categoryColors = getTreeMapGroupColors(definition, tree);
          return getTreeMapElementColor(ctx, dataset, coloringOption, maxDepth, categoryColors);
        }
        throw new Error(`Unsupported coloring option type}`);
      };
    }
  },
};

export function getTreeMapGroupColors(
  definition: TreeMapChartDefinition,
  tree: TreeMapTree
): TreeMapGroupColor[] {
  const coloringOption = definition.coloringOptions || TreeMapChartDefaults.coloringOptions;
  if (coloringOption?.type !== "categoryColor") {
    return [];
  }
  const groups = new Set(tree.map((node) => String(node[0])));
  const colorOptions = coloringOption.colors;

  const colorGenerator = getChartColorsGenerator(definition, groups.size);

  const colors: TreeMapGroupColor[] = [];
  for (const groupName of groups) {
    const nextColor = colorGenerator.next();
    const option = colorOptions.find((color) => color.group === groupName);
    if (option) {
      colors.push(option);
    } else {
      colors.push({ group: groupName, color: nextColor });
    }
  }

  return colors;
}

function getTreeMapColorScale(
  dataset: any,
  coloringOption: TreeMapColorScaleOptions,
  maxDepth: number
) {
  const nodes = dataset.data.filter((node) => node.isLeaf);
  const minValue = Math.min(...nodes.map((node) => Number(node.v) || 0));
  const maxValue = Math.max(...nodes.map((node) => Number(node.v) || 0));
  if (Number.isFinite(minValue) && Number.isFinite(maxValue)) {
    const colorThresholds = [{ value: minValue, color: coloringOption.minColor }];
    if (coloringOption.midColor) {
      const midValue = (minValue + maxValue) / 2;
      colorThresholds.push({ value: midValue, color: coloringOption.midColor });
    }
    colorThresholds.push({ value: maxValue, color: coloringOption.maxColor });
    return getColorScale(colorThresholds);
  }
  return undefined;
}

function getTreeMapElementColor(
  ctx: any,
  dataset: any,
  coloringOption: TreeMapCategoryColorOptions,
  maxDepth: number,
  categoryColors: TreeMapGroupColor[]
) {
  const rootCategory = ctx.raw._data.children[0][0];
  const baseColor = categoryColors.find((color) => color.group === rootCategory)?.color;
  if (!baseColor || !coloringOption.highlightBigValues) {
    return baseColor || "#FF0000";
  }

  const nodes = dataset.data.filter(
    (node) => node._data.path.startsWith(rootCategory) && node.isLeaf
  );
  const max = Math.max(...nodes.map((node) => Number(node.v) || 0));
  const min = Math.min(...nodes.map((node) => Number(node.v) || 0));
  if (min === max || !isFinite(min) || !isFinite(max)) {
    return baseColor;
  }

  const value = Number(ctx.raw.v) || 0;
  let alpha = ((value - max) / (min - max)) * 0.5;
  return lightenColor(baseColor, alpha);
}
