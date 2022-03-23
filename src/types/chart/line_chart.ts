import { ChartConfiguration } from "chart.js";
import { LegendPosition, VerticalAxisPosition } from "./common_chart";

export interface LineChartDefinition {
  readonly type: "line";
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: string;
  readonly background: string;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
}

export type LineChartRuntime = ChartConfiguration;
