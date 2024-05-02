import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { TitleDesign } from "./chart";
import { LegendPosition, VerticalAxisPosition } from "./common_chart";

export interface LineChartDefinition {
  readonly type: "line";
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly cumulative: boolean;
}

export type LineChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
