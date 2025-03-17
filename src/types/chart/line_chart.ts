import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { CommonChartDefinition } from "./common_chart";
import { ZoomConfiguration } from "./chart";

export interface LineChartDefinition extends CommonChartDefinition {
  readonly type: "line";
  readonly labelsAsText: boolean;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly cumulative: boolean;
  readonly fillArea?: boolean;
  readonly showValues?: boolean;
  readonly zoom?: ZoomConfiguration;
}

export type LineChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
