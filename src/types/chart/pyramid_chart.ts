import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface PyramidChartDefinition {
  readonly type: "pyramid";
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
}

export type PyramidChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
