import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { LegendPosition, VerticalAxisPosition } from "./common_chart";

export interface BarChartDefinition {
  readonly type: "bar";
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: string;
  readonly background?: Color;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly stackedBar: boolean;
}

export type BarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
