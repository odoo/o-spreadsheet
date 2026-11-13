import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { Range } from "../range";
import { TitleDesign } from "./chart";
import { TreemapDataPoint } from "./chartjs_tree_map_type";
import { HierarchicalChartDefinition } from "./common_chart";

export interface TreeMapChartDefinition<T extends string | Range = Range>
  extends HierarchicalChartDefinition<T> {
  readonly type: "treemap";
  readonly showHeaders?: boolean;
  readonly headerDesign?: TitleDesign;
  readonly coloringOptions?: TreeMapColoringOptions;
}

export type TreeMapCategoryColorOptions = {
  type: "categoryColor";
  colors: (Color | undefined | null)[];
  useValueBasedGradient: boolean;
};

export type TreeMapColorScaleOptions = {
  type: "colorScale";
  minColor: Color;
  midColor?: Color;
  maxColor: Color;
};

export interface TreeMapGroupColor {
  label: string;
  color: Color;
}

export type TreeMapDataset = Record<string, string | number | undefined>[];

export type TreeMapColoringOptions = TreeMapCategoryColorOptions | TreeMapColorScaleOptions;

export type TreeMapChartRuntime = {
  chartJsConfig: ChartConfiguration;
};

export type TreeMapItem = {
  raw: TreemapDataPoint;
};

export const TreeMapChartDefaults = {
  showHeaders: true,
  headerDesign: {
    align: "center",
    fillColor: "#808080",
    bold: true,
    fontSize: 15,
  } as TitleDesign,
  showValues: true,
  showLabels: true,
  valuesDesign: {
    align: "left",
    verticalAlign: "bottom",
    fontSize: 12,
  } as TitleDesign,
  coloringOptions: {
    type: "categoryColor",
    colors: [],
    useValueBasedGradient: true,
  } as TreeMapCategoryColorOptions,
};
