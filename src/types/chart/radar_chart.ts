import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface RadarChartDefinition {
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly type: "radar";
  readonly stacked: boolean;
  readonly axesDesign?: AxesDesign;
  readonly fillArea?: boolean;
}

export type RadarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
