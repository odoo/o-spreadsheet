import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { BarChartDefinition } from "./bar_chart";

export interface FunnelChartDefinition extends Omit<BarChartDefinition, "type"> {
  readonly type: "funnel";
}

export type FunnelChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
