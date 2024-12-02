import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { CommonChartDefinition } from "./common_chart";

export interface RadarChartDefinition extends CommonChartDefinition {
  readonly type: "radar";
  readonly aggregated?: boolean;
  readonly stacked: boolean;
  readonly fillArea?: boolean;
}

export type RadarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
