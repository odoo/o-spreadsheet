import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { CustomizedDataSet, TitleDesign } from "./chart";
import { ComboBarChartDefinition } from "./common_bar_combo";
import { LegendPosition } from "./common_chart";

export interface TreeMapChartDefinition extends ComboBarChartDefinition {
  readonly type: "treemap";
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly showHeaders?: boolean;
  readonly headerDesign?: TitleDesign;
  readonly showValues?: boolean;
  readonly showLabels?: boolean;
  readonly valuesDesign?: TitleDesign;
  readonly coloringOptions?: TreeMapColoringOptions;
}
export type TreeMapSolidColorOptions = {
  type: "solidColor";
  colors: { group: string; color: Color }[];
  hasGradient: boolean;
};

export type TreeMapColorScaleOptions = {
  type: "colorScale";
  minColor: Color;
  midColor?: Color;
  maxColor: Color;
};

export type TreeMapColoringOptions = TreeMapSolidColorOptions | TreeMapColorScaleOptions;

export type TreeMapChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};

export const TreeMapChartDefaults = {
  showHeaders: true,
  headerDesign: {
    align: "center",
    fillColor: "#808080",
    bold: true,
  } as TitleDesign,
  showValues: true,
  showLabels: true,
  valuesDesign: {
    align: "left",
    verticalAlign: "bottom",
  } as TitleDesign,
  coloringOptions: {
    type: "solidColor",
    colors: [],
    hasGradient: true,
  } as TreeMapSolidColorOptions,
};
