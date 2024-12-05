import { ChartDataset } from "chart.js";
import {
  BACKGROUND_CHART_COLOR,
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
  LINE_FILL_TRANSPARENCY,
} from "../../../../constants";
import { _t } from "../../../../translation";
import { ChartRuntimeGenerationArgs, Color, GenericDefinition } from "../../../../types";
import {
  BarChartDefinition,
  ChartWithDataSetDefinition,
  LineChartDefinition,
  PieChartDefinition,
  ScatterChartDefinition,
  TitleDesign,
  TrendConfiguration,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import {
  TreeMapChartDefaults,
  TreeMapChartDefinition,
  TreeMapGroupColor,
  TreeMapTree,
} from "../../../../types/chart/tree_map_chart";
import {
  ColorGenerator,
  colorToRGBA,
  getColorScale,
  lightenColor,
  relativeLuminance,
  rgbaToHex,
  setColorAlpha,
} from "../../../color";
import { formatValue } from "../../../format/format";
import { isDefined, range } from "../../../misc";
import { TREND_LINE_XAXIS_ID, getPieColors } from "../chart_common";
import { truncateLabel } from "../chart_ui_common";

export function getBarChartDatasets(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"bar" | "line">[] {
  const { dataSetsValues } = args;

  const dataSets: ChartDataset<"bar" | "line">[] = [];
  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  const trendDatasets: ChartDataset<"line">[] = [];

  for (const index in dataSetsValues) {
    let { label, data } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const backgroundColor = colors.next();
    const dataset: ChartDataset<"bar"> = {
      label,
      data,
      borderColor: definition.background || BACKGROUND_CHART_COLOR,
      borderWidth: definition.stacked ? 1 : 0,
      backgroundColor,
      yAxisID: definition.horizontal ? "y" : definition.dataSets?.[index].yAxisId || "y",
      xAxisID: "x",
    };
    dataSets.push(dataset);

    const trendConfig = definition.dataSets?.[index].trend;
    const trendData = args.trendDataSetsValues?.[index];
    if (!trendConfig?.display || definition.horizontal || !trendData) {
      continue;
    }

    trendDatasets.push(getTrendingLineDataSet(dataset, trendConfig, trendData));
  }
  dataSets.push(...trendDatasets);

  return dataSets;
}

export function getWaterfallDatasetAndLabels(
  definition: GenericDefinition<WaterfallChartDefinition>,
  args: ChartRuntimeGenerationArgs
): {
  datasets: ChartDataset[];
  labels: string[];
} {
  const { dataSetsValues, labels } = args;

  const negativeColor = definition.negativeValuesColor || CHART_WATERFALL_NEGATIVE_COLOR;
  const positiveColor = definition.positiveValuesColor || CHART_WATERFALL_POSITIVE_COLOR;
  const subTotalColor = definition.subTotalValuesColor || CHART_WATERFALL_SUBTOTAL_COLOR;

  const backgroundColor: Color[] = [];
  const datasetValues: Array<[number, number]> = [];
  const dataset: ChartDataset = {
    label: "",
    data: datasetValues,
    backgroundColor,
  };
  const labelsWithSubTotals: string[] = [];
  let lastValue = 0;
  for (const dataSetsValue of dataSetsValues) {
    for (let i = 0; i < dataSetsValue.data.length; i++) {
      const data = dataSetsValue.data[i];
      labelsWithSubTotals.push(labels[i]);
      if (isNaN(Number(data))) {
        datasetValues.push([lastValue, lastValue]);
        backgroundColor.push("");
        continue;
      }
      datasetValues.push([lastValue, data + lastValue]);
      let color = data >= 0 ? positiveColor : negativeColor;
      if (i === 0 && dataSetsValue === dataSetsValues[0] && definition.firstValueAsSubtotal) {
        color = subTotalColor;
      }
      backgroundColor.push(color);
      lastValue += data;
    }
    if (definition.showSubTotals) {
      labelsWithSubTotals.push(_t("Subtotal"));
      datasetValues.push([0, lastValue]);
      backgroundColor.push(subTotalColor);
    }
  }

  return {
    datasets: [dataset],
    labels: labelsWithSubTotals.map(truncateLabel),
  };
}

export function getLineChartDatasets(
  definition: GenericDefinition<LineChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"line">[] {
  const { dataSetsValues, axisType, labels } = args;
  const dataSets: ChartDataset<"line">[] = [];

  const areaChart = !!definition.fillArea;
  const stackedChart = !!definition.stacked;

  const trendDatasets: any[] = [];

  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  for (let index = 0; index < dataSetsValues.length; index++) {
    let { label, data } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const color = colors.next();
    if (axisType && ["linear", "time"].includes(axisType)) {
      // Replace empty string labels by undefined to make sure chartJS doesn't decide that "" is the same as 0
      data = data.map((y, index) => ({ x: labels[index] || undefined, y }));
    }

    const dataset: ChartDataset<"line"> = {
      label,
      data,
      tension: 0, // 0 -> render straight lines, which is much faster
      borderColor: color,
      backgroundColor: areaChart ? setColorAlpha(color, LINE_FILL_TRANSPARENCY) : color,
      pointBackgroundColor: color,
      fill: areaChart ? getFillingMode(index, stackedChart) : false,
      yAxisID: definition.dataSets?.[index].yAxisId || "y",
    };
    dataSets.push(dataset);

    const trendConfig = definition.dataSets?.[index].trend;
    const trendData = args.trendDataSetsValues?.[index];
    if (!trendConfig?.display || !trendData) {
      continue;
    }

    trendDatasets.push(getTrendingLineDataSet(dataset, trendConfig, trendData));
  }
  dataSets.push(...trendDatasets);

  return dataSets;
}

export function getScatterChartDatasets(
  definition: GenericDefinition<ScatterChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset[] {
  const dataSets: ChartDataset<"line">[] = getLineChartDatasets(definition, args);
  for (const dataSet of dataSets) {
    if (dataSet.xAxisID !== TREND_LINE_XAXIS_ID) {
      dataSet.showLine = false;
    }
  }
  return dataSets;
}

export function getPieChartDatasets(
  definition: GenericDefinition<PieChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"pie">[] {
  const { dataSetsValues } = args;
  const dataSets: ChartDataset<"pie">[] = [];
  const dataSetsLength = Math.max(0, ...dataSetsValues.map((ds) => ds?.data?.length ?? 0));
  const backgroundColor = getPieColors(new ColorGenerator(dataSetsLength), dataSetsValues);
  for (const { label, data } of dataSetsValues) {
    const dataset: ChartDataset<"pie"> = {
      label,
      data,
      borderColor: BACKGROUND_CHART_COLOR,
      backgroundColor,
      hoverOffset: 30,
    };
    dataSets!.push(dataset);
  }
  return dataSets;
}

export function getComboChartDatasets(
  definition: GenericDefinition<ComboChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"bar" | "line">[] {
  const { dataSetsValues } = args;

  const dataSets: ChartDataset<"bar" | "line">[] = [];
  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  const trendDatasets: ChartDataset<"line">[] = [];

  for (let index = 0; index < dataSetsValues.length; index++) {
    let { label, data } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const design = definition.dataSets?.[index];
    const color = colors.next();

    const type = design?.type ?? "line";
    const dataset: ChartDataset<"bar" | "line"> = {
      label: label,
      data,
      borderColor: color,
      backgroundColor: color,
      yAxisID: definition.dataSets?.[index].yAxisId || "y",
      xAxisID: "x",
      type,
      order: type === "bar" ? dataSetsValues.length + index : index,
    };
    dataSets.push(dataset);

    const trendConfig = definition.dataSets?.[index].trend;
    const trendData = args.trendDataSetsValues?.[index];
    if (!trendConfig?.display || !trendData) {
      continue;
    }

    trendDatasets.push(getTrendingLineDataSet(dataset, trendConfig, trendData));
  }
  dataSets.push(...trendDatasets);

  return dataSets;
}

export function getRadarChartDatasets(
  definition: GenericDefinition<RadarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"radar">[] {
  const { dataSetsValues } = args;
  const datasets: ChartDataset<"radar">[] = [];

  const fill = definition.fillArea ?? false;

  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  for (let i = 0; i < dataSetsValues.length; i++) {
    let { label, data } = dataSetsValues[i];
    if (definition.dataSets?.[i]?.label) {
      label = definition.dataSets[i].label;
    }
    const borderColor = colors.next();
    const dataset: ChartDataset<"radar"> = {
      label,
      data,
      borderColor,
      backgroundColor: borderColor,
    };
    if (fill) {
      dataset.backgroundColor = setColorAlpha(borderColor, LINE_FILL_TRANSPARENCY);
      dataset.fill = "start"; // fills from the start of the axes (default is to start at 0)
    }
    datasets.push(dataset);
  }
  return datasets;
}

export function getTreeMapChartDatasets(
  definition: TreeMapChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"treemap">[] {
  const { dataSetsValues, labels, locale, axisFormats } = args;
  const localeFormat = { locale, format: axisFormats?.["y"] };

  if (dataSetsValues.length === 0) {
    return [];
  }

  const rootCategories = new Set<string>();
  const tree: TreeMapTree = [];
  // const dataEntries: DataEntries = [];
  const maxDatasetLength = Math.max(...dataSetsValues.map((ds) => ds.data.length));
  const groupByValues = new Map<string, number>();
  for (let i = 0; i < maxDatasetLength; i++) {
    tree[i] = {};
    // let groupBys: string[] = [];
    // dataEntries[i] = {};
    for (let j = 0; j < dataSetsValues.length; j++) {
      const groupBy = String(dataSetsValues[j].data[i]);
      tree[i][j] = groupBy;
      // groupByKey += "." + groupBy;
      // dataEntries[i][j] = { value: dataSetsValues[j].data[i], formattedValue: "", type: "text" };
      if (j === 0) {
        rootCategories.add(String(dataSetsValues[j].data[i]));
      }
    }
    // dataEntries[i].value = {
    //   value: Number(labels[i]) || 0,
    //   formattedValue: "",
    //   type: CellValueType.number,
    // };
    const value = Number(labels[i]) || 0;
    tree[i].value = value;
    // groupByValues.set(groupByKey, (groupByValues.get(groupByKey) || 0) + value);
  }
  console.log(groupByValues);

  // const rows: PivotDimension[] = [
  //   { fieldName: "0", isValid: true, displayName: "0", nameWithGranularity: "0", type: "text" },
  //   { fieldName: "1", isValid: true, displayName: "1", nameWithGranularity: "1", type: "text" },
  // ];
  // const r2 = dataEntriesToRows(dataEntries, 0, rows, [], []);
  // console.log(r2);

  const colorGenerator = getChartColorsGenerator(definition, dataSetsValues.length);
  const rootCategoriesColors: Record<string, Color> = {};
  for (const category of rootCategories) {
    rootCategoriesColors[category] = colorGenerator.next();
  }

  const maxDepth = dataSetsValues.length - 1;

  const showLabels = definition.showLabels ?? TreeMapChartDefaults.showLabels;
  const showValues = definition.showValues ?? TreeMapChartDefaults.showValues;

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

  const dataSets: ChartDataset<"treemap">[] = [
    {
      data: [],
      tree,
      labels: {
        display: showLabels || showValues,
        overflow: "hidden",
        ...getTextStyle(definition.valuesDesign, TreeMapChartDefaults.valuesDesign),
        formatter: (ctx) => {
          return [
            showLabels ? ctx.raw.g : undefined,
            showValues ? formatValue(ctx.raw.v, localeFormat) : undefined,
          ].filter(isDefined);
        },
      },
      captions: {
        display: definition.showHeaders ?? TreeMapChartDefaults.showHeaders,
        padding: 6,
        ...getTextStyle(definition.headerDesign, TreeMapChartDefaults.headerDesign, 15),
      },
      key: "value",
      groups: range(0, dataSetsValues.length).map((i) => String(i)),
      borderColor: definition.background || BACKGROUND_CHART_COLOR,
      hoverBorderColor: definition.background || BACKGROUND_CHART_COLOR,
      borderWidth: 2,
      spacing: 0,
      backgroundColor: (ctx: any, chart) =>
        treeMapBackgroundColor(
          ctx,
          chart,
          tree,
          maxDepth,
          rootCategoriesColors,
          definition,
          colorScale,
          categoryColors
        ),
    },
  ];
  // const data = window.buildData(tree, dataSets[0], ["value"], { x: 0, y: 0, w: 100, h: 100 });
  // console.log(data);

  return dataSets;
}

// function groupByTree(tree: TreeMapTree, maxDepth: number) {
//   const a = Object.groupBy(tree, (node) => node?.[0] as string);
// }

// function groupBy(g: Partial<Record<string, TreeMapTree>>, maxDepth: number, depth: number) {
//   if (depth === maxDepth) {
//     return g;
//   }
//   const result: Partial<Record<string, TreeMapTree>> = {};
//   for (const key in g) {
//     const group = g[key];
//     const nextGroup = Object.groupBy(group, (node) => node?.[depth] as string);
//     result[key] = groupBy(nextGroup, maxDepth, depth + 1);
//   }
//   return result;
// }

function treeMapBackgroundColor(
  ctx: any,
  chart: any,
  tree: Record<string, string | number>[],
  maxDepth: number,
  rootCategoriesColors: Record<string, Color>,
  definition: TreeMapChartDefinition,
  colorScale: ((value: number) => Color) | undefined,
  colors: TreeMapGroupColor[]
) {
  if (ctx.type !== "data") {
    return "transparent";
  }
  if (ctx.raw.l !== maxDepth) {
    return definition.headerDesign?.fillColor || TreeMapChartDefaults.headerDesign?.fillColor;
  }
  const coloringOption = definition.coloringOptions || TreeMapChartDefaults.coloringOptions;
  if (coloringOption.type === "categoryColor") {
    const rootCategory = ctx.raw._data.children[0][0];
    const baseColor = colors.find((color) => color.group === rootCategory)?.color;
    if (!baseColor || !coloringOption.highlightBigValues) {
      console.log("baseColor", baseColor);
      return baseColor || "#FF0000";
    }

    const value = ctx.raw.v;
    // const nodes = tree.filter((node) => node[0] === rootCategory);
    // const groupBy = Object.values(Object.groupBy(nodes, (node) => node?.[1]))?.map((group) =>
    //   group?.reduce((acc, node) => acc + (node.value as number), 0)
    // );

    // console.log("groupBy", groupBy);
    const max = 0;
    const min = 0;
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
}

function getTextStyle(
  design: TitleDesign | undefined,
  defaultDesign: TitleDesign,
  fontSize?: number
) {
  const dynamicColor = (ctx: any) => {
    const backgroundColor = ctx.element.options.backgroundColor;
    return relativeLuminance(backgroundColor) > 0.7 ? "#666666" : "#FFFFFF";
  };
  return {
    align: design?.align || defaultDesign?.align,
    position: design?.verticalAlign || defaultDesign?.verticalAlign,
    color: design?.color || dynamicColor,
    hoverColor: design?.color || dynamicColor,
    font: {
      weight: design?.bold ?? defaultDesign?.bold ? "bold" : "normal",
      style: design?.italic ?? defaultDesign?.italic ? "italic" : "normal",
      size: fontSize,
    },
  } as const;
}

function getTrendingLineDataSet(
  dataset: ChartDataset<"line" | "bar">,
  config: TrendConfiguration,
  data: (number | null)[]
): ChartDataset<"line"> {
  const defaultBorderColor = colorToRGBA(dataset.backgroundColor as Color);
  defaultBorderColor.a = 1;

  const borderColor = config.color || lightenColor(rgbaToHex(defaultBorderColor), 0.5);

  return {
    type: "line",
    xAxisID: TREND_LINE_XAXIS_ID,
    yAxisID: dataset.yAxisID,
    label: dataset.label ? _t("Trend line for %s", dataset.label) : "",
    data,
    order: -1,
    showLine: true,
    pointRadius: 0,
    backgroundColor: borderColor,
    borderColor,
    borderDash: [5, 5],
    borderWidth: undefined,
    fill: false,
    pointBackgroundColor: borderColor,
  };
}

/**
 * If the chart is a stacked area chart, we want to fill until the next dataset.
 * If the chart is a simple area chart, we want to fill until the origin (bottom axis).
 *
 * See https://www.chartjs.org/docs/latest/charts/area.html#filling-modes
 */
function getFillingMode(index: number, stackedChart: boolean): string {
  if (!stackedChart) {
    return "origin";
  }
  return index === 0 ? "origin" : "-1";
}

export function getChartColorsGenerator(
  definition: GenericDefinition<ChartWithDataSetDefinition>,
  dataSetsSize: number
) {
  return new ColorGenerator(
    dataSetsSize,
    definition.dataSets?.map((ds) => ds.backgroundColor) || []
  );
}

export function getTreeMapGroupColors(
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
