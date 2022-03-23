import { ChartConfiguration } from "chart.js";
import { LegendPosition, VerticalAxisPosition } from "./common_chart";

export interface BarChartDefinition {
  readonly type: "bar";
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: string;
  readonly background: string;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly stackedBar: boolean;
}

export type BarChartRuntime = ChartConfiguration;
