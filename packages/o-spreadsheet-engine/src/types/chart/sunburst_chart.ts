import type { ChartConfiguration, ChartDataset } from "chart.js";
import { Color } from "../misc";
import { ChartStyle, CustomizedDataSet } from "./chart";
import { LegendPosition, MinimalChartDefinition } from "./common_chart";

export interface SunburstChartDefinition extends MinimalChartDefinition {
  readonly type: "sunburst";
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly legendPosition: LegendPosition;
  readonly showValues?: boolean;
  readonly showLabels?: boolean;
  readonly valuesDesign?: ChartStyle;
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
