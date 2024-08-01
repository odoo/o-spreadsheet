import type { ChartConfiguration } from "chart.js";
import type { Color } from "../misc";
import type { LegendPosition, VerticalAxisPosition } from "./common_chart";

export interface BarChartDefinition {
  readonly type: "bar";
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: string;
  readonly background?: Color;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
}

export type BarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
