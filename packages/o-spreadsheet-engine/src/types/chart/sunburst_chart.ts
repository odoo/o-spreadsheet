import type { ChartConfiguration, ChartDataset } from "chart.js";
import { Color } from "../misc";
import { ChartRangeDataSource, ChartStyle, DataSetStyle, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface SunburstChartDefinition {
  readonly type: "sunburst";
  readonly dataSetStyles: DataSetStyle;
  readonly dataSource: ChartRangeDataSource;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly showValues?: boolean;
  readonly showLabels?: boolean;
  readonly valuesDesign?: ChartStyle;
  readonly groupColors?: (Color | undefined | null)[];
  readonly pieHolePercentage?: number;
  readonly humanize?: boolean;
}

export type SunburstChartRuntime = {
  chartJsConfig: ChartConfiguration<"doughnut">;
  background: Color;
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
