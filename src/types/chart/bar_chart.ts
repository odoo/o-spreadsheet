import { ChartConfiguration } from "chart.js";
import { CommonChartDefinition } from ".";
import { Color } from "../misc";

export interface BarChartDefinition extends CommonChartDefinition {
  readonly type: "bar";
  readonly stacked: boolean;
  readonly horizontal?: boolean;
}

export type BarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
