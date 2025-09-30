import { ChartDataset, Point } from "chart.js";
import {
  BACKGROUND_CHART_COLOR,
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
  COLOR_TRANSPARENT,
  DEFAULT_CHART_COLOR_SCALE,
  LINE_DATA_POINT_RADIUS,
  LINE_FILL_TRANSPARENCY,
} from "../../../../constants";
import { _t } from "../../../../translation";
import { ChartRuntimeGenerationArgs, Color, GenericDefinition } from "../../../../types";
import {
  BarChartDefinition,
  ChartWithDataSetDefinition,
  DatasetValues,
  FunnelChartColors,
  FunnelChartDefinition,
  LineChartDefinition,
  PieChartDefinition,
  ScatterChartDefinition,
  SunburstChartDefinition,
  SunburstChartJSDataset,
  SunburstChartRawData,
  SunburstTreeNode,
  TitleDesign,
  TrendConfiguration,
  WaterfallChartDefinition,
} from "../../../../types/chart";
import { CalendarChartDefinition } from "../../../../types/chart/calendar_chart";
import { ComboChartDefinition } from "../../../../types/chart/combo_chart";
import {
  GeoChartDefinition,
  GeoChartRuntimeGenerationArgs,
} from "../../../../types/chart/geo_chart";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import {
  TreeMapCategoryColorOptions,
  TreeMapChartDefaults,
  TreeMapChartDefinition,
  TreeMapColorScaleOptions,
  TreeMapDataset,
  TreeMapGroupColor,
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
import {
  getPieColors,
  isTrendLineAxis,
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
  TREND_LINE_XAXIS_ID,
} from "../chart_common";
import { getRuntimeColorScale } from "./chartjs_scales";

export const GHOST_SUNBURST_VALUE = "nullValue";

export function getBarChartDatasets(
  definition: GenericDefinition<BarChartDefinition>,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"bar" | "line">[] {
  const { dataSetsValues } = args;

  const dataSets: ChartDataset<"bar" | "line">[] = [];
  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  const trendDatasets: ChartDataset<"line">[] = [];

  for (const index in dataSetsValues) {
    let { label, data, hidden } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const backgroundColor = colors.next();
    const dataset: ChartDataset<"bar"> = {
      label,
      data,
      hidden,
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

export function getCalendarChartDatasetAndLabels(
  definition: CalendarChartDefinition,
  args: ChartRuntimeGenerationArgs
): {
  datasets: ChartDataset[];
  labels: string[];
} {
  const { labels, dataSetsValues } = args;

  const values = dataSetsValues
    .map((ds) => ds.data)
    .flat()
    .filter(isDefined);

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const colorMap = getRuntimeColorScale(
    definition.colorScale ?? DEFAULT_CHART_COLOR_SCALE,
    minValue,
    maxValue
  );

  const dataSets: ChartDataset[] = [];
  for (const dataSetValues of dataSetsValues) {
    dataSets.push({
      label: dataSetValues.label,
      data: dataSetValues.data.map((v) => 1),
      backgroundColor: dataSetValues.data.map((v) =>
        v !== undefined ? colorMap(v) : definition.missingValueColor || COLOR_TRANSPARENT
      ),
      borderColor: definition.background || BACKGROUND_CHART_COLOR,
      borderSkipped: false,
      borderWidth: 1,
      barPercentage: 1,
      categoryPercentage: 1,
      values: dataSetValues.data,
    });
  }

  return {
    labels,
    datasets: dataSets,
  };
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
    if (dataSetsValue.hidden) {
      continue;
    }
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
    labels: labelsWithSubTotals,
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
    let { label, data, hidden } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const color = colors.next();
    if (axisType && ["linear", "time"].includes(axisType)) {
      // Replace empty string labels by undefined to make sure chartJS doesn't decide that "" is the same as 0
      data = data.map((y, index) => ({ x: labels[index] || undefined, y }));
    }

    const dataset: ChartDataset<"line"> = {
      label,
      data,
      hidden,
      tension: 0, // 0 -> render straight lines, which is much faster
      borderColor: color,
      backgroundColor: areaChart ? setColorAlpha(color, LINE_FILL_TRANSPARENCY) : color,
      pointBackgroundColor: color,
      fill: areaChart ? getFillingMode(index, stackedChart) : false,
      pointRadius: definition.hideDataMarkers ? 0 : LINE_DATA_POINT_RADIUS,
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
): ChartDataset<"line">[] {
  const dataSets: ChartDataset<"line">[] = getLineChartDatasets(definition, args);
  for (const dataSet of dataSets) {
    if (!isTrendLineAxis(dataSet.xAxisID as string)) {
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
  for (const { label, data, hidden } of dataSetsValues) {
    if (hidden) continue;
    const dataset: ChartDataset<"pie"> = {
      label,
      data,
      borderColor: definition.background || "#FFFFFF",
      backgroundColor,
      hoverOffset: 10,
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
    let { label, data, hidden } = dataSetsValues[index];
    label = definition.dataSets?.[index].label || label;

    const design = definition.dataSets?.[index];
    const color = colors.next();

    const type = design?.type ?? "line";
    const dataset: ChartDataset<"bar" | "line"> = {
      label: label,
      data,
      hidden,
      borderColor: color,
      backgroundColor: color,
      yAxisID: definition.dataSets?.[index].yAxisId || "y",
      xAxisID: "x",
      type,
      order: type === "bar" ? dataSetsValues.length + index : index,
      pointRadius: definition.hideDataMarkers ? 0 : LINE_DATA_POINT_RADIUS,
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
    let { label, data, hidden } = dataSetsValues[i];
    if (definition.dataSets?.[i]?.label) {
      label = definition.dataSets[i].label;
    }
    const borderColor = colors.next();
    const dataset: ChartDataset<"radar"> = {
      label,
      data,
      hidden,
      borderColor,
      backgroundColor: borderColor,
      pointRadius: definition.hideDataMarkers ? 0 : LINE_DATA_POINT_RADIUS,
    };
    if (fill) {
      dataset.backgroundColor = setColorAlpha(borderColor, LINE_FILL_TRANSPARENCY);
      dataset.fill = "start"; // fills from the start of the axes (default is to start at 0)
    }
    datasets.push(dataset);
  }
  return datasets;
}

export function getGeoChartDatasets(
  definition: GenericDefinition<GeoChartDefinition>,
  args: GeoChartRuntimeGenerationArgs
): ChartDataset[] {
  const { availableRegions, dataSetsValues, labels } = args;

  const regionName = definition.region || availableRegions[0]?.id;
  const features = regionName ? args.getGeoJsonFeatures(regionName) : undefined;

  const dataset: ChartDataset<"choropleth"> = {
    outline: features,
    showOutline: !!features,
    data: [],
  };

  if (features && regionName) {
    const labelsAndValues: { [featureId: string]: { value: number; label: string } } = {};
    if (dataSetsValues[0]) {
      for (let i = 0; i < dataSetsValues[0].data.length; i++) {
        if (!labels[i] || dataSetsValues[0].data[i] === undefined) {
          continue;
        }
        const featureId = args.geoFeatureNameToId(regionName, labels[i]);
        if (featureId) {
          labelsAndValues[featureId] = { value: dataSetsValues[0].data[i], label: labels[i] };
        }
      }
    }

    for (const feature of features) {
      if (!feature.id) {
        continue;
      }
      dataset.data.push({
        feature: {
          ...feature,
          properties: { name: labelsAndValues[feature.id]?.label },
        },
        value: labelsAndValues[feature.id]?.value,
      });
    }
  }

  return [dataset];
}

export function getFunnelChartDatasets(
  definition: FunnelChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"bar">[] {
  const dataSetsValues = args.dataSetsValues[0];
  const labels = args.labels;
  if (!dataSetsValues) {
    return [];
  }

  let { label: datasetLabel, data } = dataSetsValues;
  datasetLabel = definition.dataSets?.[0].label || datasetLabel;

  const dataset: ChartDataset<"bar"> = {
    label: datasetLabel,
    data: data.map((value) => (value <= 0 ? [0, 0] : [-value, value])),
    backgroundColor: getFunnelLabelColors(labels, definition.funnelColors),
    yAxisID: "y",
    xAxisID: "x",
    barPercentage: 1,
    categoryPercentage: 1,
    borderColor: definition.background || BACKGROUND_CHART_COLOR,
    borderWidth: 3,
  };

  return [dataset];
}

export function getFunnelLabelColors(labels: string[], colors?: FunnelChartColors): Color[] {
  const colorGenerator = new ColorGenerator(labels.length, colors);
  return labels.map(() => colorGenerator.next());
}

export function getSunburstChartDatasets(
  definition: GenericDefinition<SunburstChartDefinition>,
  args: ChartRuntimeGenerationArgs
): SunburstChartJSDataset[] {
  const { dataSetsValues, labels } = args;

  const tree = getSunburstTree(dataSetsValues, labels);
  const data = pyramidizeTree(tree);

  const rootData = data[0] || [];
  const colorGenerator = new ColorGenerator(rootData.length, definition.groupColors || []);
  const groupColors = rootData.map((rawValue) => ({
    label: rawValue.label,
    color: colorGenerator.next(),
  }));

  const dataSets: SunburstChartJSDataset[] = [];
  for (let i = data.length - 1; i >= 0; i--) {
    const dataset: SunburstChartJSDataset = {
      groupColors,
      parsing: { key: "value" },
      data: data[i] as any,
      borderColor: (ctx) => {
        const data = ctx.type === "data" ? (ctx.raw as SunburstChartRawData) : undefined;
        if (!data || data.label === GHOST_SUNBURST_VALUE) {
          return COLOR_TRANSPARENT;
        }
        return definition.background || BACKGROUND_CHART_COLOR;
      },
      backgroundColor: (ctx) => {
        const data = ctx.type === "data" ? (ctx.raw as SunburstChartRawData) : undefined;
        if (!data || data.label === GHOST_SUNBURST_VALUE) {
          return COLOR_TRANSPARENT;
        }
        const rootGroup = data.groups[0];
        return groupColors.find((groupColor) => groupColor.label === rootGroup)?.color;
      },
      hoverOffset: 10,
    };
    dataSets!.push(dataset);
  }
  return dataSets;
}

function getDataEntriesFromDatasets(hierarchicalDatasetValues: DatasetValues[], values: string[]) {
  const entries: Record<string, string | number>[] = [];
  const maxDatasetLength = Math.max(...hierarchicalDatasetValues.map((ds) => ds.data.length));
  for (let i = 0; i < maxDatasetLength; i++) {
    entries[i] = {};
    for (let j = 0; j < hierarchicalDatasetValues.length; j++) {
      const groupBy =
        hierarchicalDatasetValues[j].data[i] === null
          ? GHOST_SUNBURST_VALUE
          : String(hierarchicalDatasetValues[j].data[i]);
      entries[i][j] = groupBy;
    }
    entries[i].value = Number(values[i]);
  }
  return entries;
}

function getSunburstTree(
  hierarchicalDatasetValues: DatasetValues[],
  values: string[]
): SunburstTreeNode[] {
  const entries = getDataEntriesFromDatasets(hierarchicalDatasetValues, values);
  return sunburstGroupBy(entries, 0, hierarchicalDatasetValues.length, []);
}

function sunburstGroupBy(
  entries: Record<string, string | number>[],
  index: number,
  maxDepth: number,
  parentGroups: string[]
): SunburstTreeNode[] {
  if (index >= maxDepth) {
    return [];
  }
  const groups = Object.groupBy(entries, (item) => item[index]);
  return Object.keys(groups)
    .map((key) => {
      const total = groups[key]?.reduce((acc, item) => acc + Number(item.value), 0) || 0;
      const itemGroups = [...parentGroups, key];
      const tree = sunburstGroupBy(groups[key] || [], index + 1, maxDepth, [...parentGroups, key]);
      return {
        label: key,
        value: total,
        children: tree,
        groups: itemGroups,
        depth: index,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * Transform a tree into a "pyramid" array, ie. an array in which each level is an array of nodes at the same depth.
 *
 * Example:
 * ```
 *       A                  [
 *      / \                    [A],
 *     B   C       ===>        [B, C],
 *    / \   \                  [D, E, F],
 *   D   E   F              ]
 *  ```
 */
function pyramidizeTree(tree: SunburstTreeNode[]): SunburstTreeNode[][] {
  const flattened: SunburstTreeNode[][] = [];
  const queue = [...tree];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) {
      continue;
    }
    if (!flattened[node.depth]) {
      flattened[node.depth] = [];
    }
    flattened[node.depth].push(node);
    if (node.children) {
      queue.push(...node.children);
    }
  }
  return flattened;
}

export function getTreeMapChartDatasets(
  definition: TreeMapChartDefinition,
  args: ChartRuntimeGenerationArgs
): ChartDataset<"treemap">[] {
  const { dataSetsValues, labels, locale, axisFormats } = args;
  const localeFormat = { locale, format: axisFormats?.y };

  if (dataSetsValues.length === 0) {
    return [];
  }

  const tree = getSunburstTree(dataSetsValues, labels).sort((a, b) => b.value - a.value);
  const groupColors = getTreeMapGroupColors(definition, tree);

  const datasetEntries: TreeMapDataset = [];
  const maxDatasetLength = Math.max(...dataSetsValues.map((ds) => ds.data.length));
  for (let i = 0; i < maxDatasetLength; i++) {
    datasetEntries[i] = {};
    for (let j = 0; j < dataSetsValues.length; j++) {
      datasetEntries[i][j] = dataSetsValues[j].data[i]
        ? String(dataSetsValues[j].data[i])
        : undefined;
    }
    datasetEntries[i].value = Number(labels[i]);
  }

  const showLabels = definition.showLabels ?? TreeMapChartDefaults.showLabels;
  const showValues = definition.showValues ?? TreeMapChartDefaults.showValues;

  const coloringOption = definition.coloringOptions || TreeMapChartDefaults.coloringOptions;
  let colorScale: ((value: number) => string) | undefined;
  if (coloringOption?.type === "colorScale") {
    colorScale = getTreeMapColorScale(tree, coloringOption);
  }

  const dataSets: ChartDataset<"treemap">[] = [
    {
      data: [],
      tree: datasetEntries,
      labels: {
        display: showLabels || showValues,
        overflow: "hidden",
        ...getTextStyle(definition.valuesDesign, TreeMapChartDefaults.valuesDesign),
        formatter: (ctx) => {
          return [
            showLabels ? ctx.raw.g : undefined, // group name
            showValues ? formatValue(ctx.raw.v, localeFormat) : undefined, // formatted value
          ].filter(isDefined);
        },
      },
      captions: {
        display: definition.showHeaders ?? TreeMapChartDefaults.showHeaders,
        padding: 6,
        ...getTextStyle(definition.headerDesign, TreeMapChartDefaults.headerDesign),
      },
      key: "value",
      groups: range(0, dataSetsValues.length).map((i) => String(i)),
      borderWidth: 0,
      spacing: 1,
      displayMode: "headerBoxes",
      groupColors,
      backgroundColor: (ctx) => {
        if (ctx.type !== "data") {
          return "transparent";
        }
        if (!ctx.raw.isLeaf) {
          return definition.headerDesign?.fillColor || TreeMapChartDefaults.headerDesign?.fillColor;
        }
        if (coloringOption.type === "colorScale") {
          return colorScale?.(ctx.raw.v) || "#FF0000";
        } else if (coloringOption.type === "categoryColor") {
          return getTreeMapElementColor(ctx, tree, coloringOption, groupColors);
        }
        throw new Error(`Unsupported coloring option type}`);
      },
    },
  ];

  return dataSets;
}

function getTextStyle(design: TitleDesign | undefined, defaultDesign: TitleDesign) {
  const dynamicColor = (ctx: any) => {
    const backgroundColor = ctx.element.options.backgroundColor;
    return relativeLuminance(backgroundColor) > 0.7 ? "#666666" : "#FFFFFF";
  };
  return {
    align: design?.align ?? defaultDesign?.align,
    position: design?.verticalAlign ?? defaultDesign?.verticalAlign,
    color: design?.color || dynamicColor,
    hoverColor: design?.color || dynamicColor,
    font: {
      weight: design?.bold ?? defaultDesign?.bold ? "bold" : "normal",
      style: design?.italic ?? defaultDesign?.italic ? "italic" : "normal",
      size: design?.fontSize ?? defaultDesign?.fontSize,
    },
  } as const;
}

function getTrendingLineDataSet(
  dataset: ChartDataset<"line" | "bar">,
  config: TrendConfiguration,
  data: Point[]
): ChartDataset<"line"> {
  const defaultBorderColor = colorToRGBA(dataset.backgroundColor as Color);
  defaultBorderColor.a = 1;

  const borderColor = config.color || lightenColor(rgbaToHex(defaultBorderColor), 0.5);

  return {
    type: "line",
    xAxisID:
      config.type === "trailingMovingAverage"
        ? MOVING_AVERAGE_TREND_LINE_XAXIS_ID
        : TREND_LINE_XAXIS_ID,
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

function getTreeMapGroupColors(
  definition: TreeMapChartDefinition,
  tree: SunburstTreeNode[]
): TreeMapGroupColor[] {
  const colors =
    definition.coloringOptions?.type === "categoryColor" ? definition.coloringOptions.colors : [];
  const colorGenerator = new ColorGenerator(tree.length, colors);

  return tree.map((node) => ({
    label: node.label,
    color: colorGenerator.next(),
  }));
}

function getTreeMapColorScale(tree: SunburstTreeNode[], coloringOption: TreeMapColorScaleOptions) {
  const treeNodesByLevel = pyramidizeTree(tree);
  const nodes = treeNodesByLevel[treeNodesByLevel.length - 1];
  const minValue = Math.min(...nodes.map((node) => node.value));
  const maxValue = Math.max(...nodes.map((node) => node.value));
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
  tree: SunburstTreeNode[],
  coloringOption: TreeMapCategoryColorOptions,
  categoryColors: TreeMapGroupColor[]
) {
  const rootCategory = ctx.raw._data.children[0][0];
  const baseColor = categoryColors.find((color) => color.label === rootCategory)?.color;
  if (!baseColor || !coloringOption.useValueBasedGradient) {
    return baseColor || "#FF0000";
  }

  const rootNode = tree.find((node) => node.label === rootCategory);
  if (!rootNode || !rootNode.children.length) {
    return baseColor;
  }
  const treeNodesByLevel = pyramidizeTree(rootNode.children);
  const leafValues = treeNodesByLevel[treeNodesByLevel.length - 1];

  const max = Math.max(...leafValues.map((node) => node.value));
  const min = Math.min(...leafValues.map((node) => node.value));
  if (min === max || !isFinite(min) || !isFinite(max)) {
    return baseColor;
  }

  const value = Number(ctx.raw.v) || 0;
  const factor = ((value - max) / (min - max)) * 0.5;
  return lightenColor(baseColor, factor);
}
