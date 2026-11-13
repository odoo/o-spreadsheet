import { ChartConfiguration, ChartDataset } from "chart.js";
import { Color } from "../misc";
import { Range } from "../range";
import { ChartStyle } from "./chart";
import { HierarchicalChartDefinition } from "./common_chart";

export interface SunburstChartDefinition<T extends string | Range = Range>
  extends HierarchicalChartDefinition<T> {
  readonly type: "sunburst";
  readonly groupColors?: (Color | undefined | null)[];
  readonly pieHolePercentage?: number;
}

export type SunburstChartRuntime = {
  chartJsConfig: ChartConfiguration<"doughnut">;
};

export type SunburstChartRawData = {
  label: string;
  value: number;
  groups: string[];
};

export interface SunburstTreeNode extends SunburstChartRawData {
  children: SunburstTreeNode[];
  depth: number;
}

export const SunburstChartDefaults = {
  showValues: false,
  showLabels: true,
  valuesDesign: {
    align: "center",
    fontSize: 13,
  } as ChartStyle,
};

export interface SunburstChartJSDataset extends ChartDataset<"doughnut"> {
  groupColors: {
    label: string;
    color: Color;
  }[];
}
