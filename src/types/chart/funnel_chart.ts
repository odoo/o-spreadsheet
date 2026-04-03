import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { CommonChartDefinition } from "./common_chart";

export interface FunnelChartDefinition extends CommonChartDefinition {
  readonly type: "funnel";
  readonly horizontal?: boolean;
  readonly funnelColors?: FunnelChartColors;
  readonly cumulative?: boolean;
}

export type FunnelChartRuntime = {
  chartJsConfig: ChartConfiguration;
};

export type FunnelChartColors = (Color | undefined)[];
