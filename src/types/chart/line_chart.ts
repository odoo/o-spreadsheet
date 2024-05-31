import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface LineChartDefinition {
  readonly type: "line";
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly cumulative: boolean;
  readonly axesDesign?: AxesDesign;
  readonly fillArea?: boolean;
  readonly showValues?: boolean;
}

export type LineChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
