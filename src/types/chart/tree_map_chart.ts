import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { CustomizedDataSet, TitleDesign } from "./chart";
import { TreemapDataPoint } from "./chartjs_tree_map_type";
import { LegendPosition } from "./common_chart";

export interface TreeMapChartDefinition {
  readonly type: "treemap";
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  // readonly axesDesign?: AxesDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly showHeaders?: boolean;
  readonly headerDesign?: TitleDesign;
  readonly showValues?: boolean;
  readonly showLabels?: boolean;
  readonly valuesDesign?: TitleDesign;
  readonly coloringOptions?: TreeMapColoringOptions;
}

export type TreeMapCategoryColorOptions = {
  type: "categoryColor";
  colors: TreeMapGroupColor[];
  highlightBigValues: boolean;
};

export type TreeMapColorScaleOptions = {
  type: "colorScale";
  minColor: Color;
  midColor?: Color;
  maxColor: Color;
};

export interface TreeMapGroupColor {
  group: string;
  color: Color;
}

export type TreeMapTree = Record<string, string | number | undefined>[];

export type TreeMapColoringOptions = TreeMapCategoryColorOptions | TreeMapColorScaleOptions;

export type TreeMapChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
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
    highlightBigValues: true,
  } as TreeMapCategoryColorOptions,
};
