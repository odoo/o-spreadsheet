import { ChartType, Color, Plugin } from "chart.js";
import { getColorScale, lightenColor } from "../../../../helpers";
import { getChartColorsGenerator } from "../../../../helpers/figures/charts/runtime";
import { ChartRuntimeGenerationArgs } from "../../../../types";
import {
  TreeMapChartDefaults,
  TreeMapChartDefinition,
  TreeMapGroupColor,
  TreeMapTree,
} from "../../../../types/chart/tree_map_chart";

export interface TreeMapColorsPluginOptions {
  definition: TreeMapChartDefinition;
  chartData: ChartRuntimeGenerationArgs;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    treeMapColorsPlugin?: TreeMapColorsPluginOptions;
  }
}

export const treeMapColorsPlugin: Plugin = {
  id: "treeMapColorsPlugin",
  beforeUpdate(chart: any, args, options: TreeMapColorsPluginOptions) {
    if (chart.config.type !== "treemap") {
      return;
    }
    const definition = options.definition;
    console.log("beforeLayout", chart, args, options);
    const dataSet = chart.config.data.datasets?.[0];
    console.log("data", dataSet);
    const drawData = chart._metasets?.[0]?.data;
    // for (const d of drawData) {
    //   d.options.backgroundColor = "#000";
    // }
    const tree = dataSet.tree;

    const maxDepth = Object.keys(dataSet.tree?.[0]).length - 2;
    console.log("maxDepth", maxDepth);

    let colorScale: ((value: number) => Color) | undefined = undefined;
    const coloringOption = definition.coloringOptions || TreeMapChartDefaults.coloringOptions;
    if (coloringOption.type === "colorScale") {
      const minValue = Math.min(...tree.map((node) => node.value as number));
      const maxValue = Math.max(...tree.map((node) => node.value as number));
      console.log(minValue, maxValue);
      if (!isNaN(minValue) && !isNaN(maxValue)) {
        const colorThresholds = [{ value: minValue, color: coloringOption.minColor }];
        if (coloringOption.midColor) {
          const midValue = (minValue + maxValue) / 2;
          colorThresholds.push({ value: midValue, color: coloringOption.midColor });
        }
        colorThresholds.push({ value: maxValue, color: coloringOption.maxColor });
        colorScale = getColorScale(colorThresholds);
      }
    }
    const categoryColors =
      coloringOption.type === "categoryColor" ? getTreeMapGroupColors(definition, tree) : [];

    for (const dataset of chart.config.data.datasets) {
      console.log("dataset", dataset);
      dataset.backgroundColor = (ctx: any) => {
        if (ctx.type !== "data") {
          return "transparent";
        }
        if (ctx.raw.l !== maxDepth) {
          return definition.headerDesign?.fillColor || TreeMapChartDefaults.headerDesign?.fillColor;
        }
        const coloringOption = definition.coloringOptions || TreeMapChartDefaults.coloringOptions;
        if (coloringOption.type === "categoryColor") {
          const rootCategory = ctx.raw._data.children[0][0];
          const baseColor = categoryColors.find((color) => color.group === rootCategory)?.color;
          if (!baseColor || !coloringOption.highlightBigValues) {
            console.log("baseColor", baseColor);
            return baseColor || "#FF0000";
          }

          const value = ctx.raw.v;
          const nodes = dataSet.data.filter(
            (node) => node._data[0] === rootCategory && node.l === maxDepth
          );
          console.log("nodes", nodes);
          // const groupBy = Object.values(Object.groupBy(nodes, (node) => node?.[1]))?.map((group) =>
          //   group?.reduce((acc, node) => acc + (node.value as number), 0)
          // );

          // console.log("groupBy", groupBy);
          const max = Math.max(...nodes.map((node) => Number(node.v) || 0));
          const min = Math.min(...nodes.map((node) => Number(node.v) || 0));
          console.log(rootCategory, min, max);
          // const max = nodes.reduce((acc, node) => Math.max(acc, node.value as number), 0);
          // const min = nodes.reduce((acc, node) => Math.min(acc, node.value as number), Infinity);
          if (min === max) {
            return baseColor;
          }

          let alpha = ((value - max) / (min - max)) * 0.5;
          if (alpha < 0) {
            // debugger;
            alpha = 0; // ADRM TODO
            console.log("alpha < 0", alpha);
          }
          return lightenColor(baseColor, alpha);
        } else {
          return colorScale?.(ctx.raw.v) || "#FF0000";
        }
      };
    }
    console.log("drawData", drawData);
  },
};

function getTreeMapGroupColors(
  definition: TreeMapChartDefinition,
  tree: TreeMapTree
): TreeMapGroupColor[] {
  const coloringOption = definition.coloringOptions || TreeMapChartDefaults.coloringOptions;
  if (coloringOption?.type !== "categoryColor") {
    throw new Error("Coloring options is not solid color");
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
