import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { ZoomConfiguration } from "./chart";
import { CommonChartDefinition } from "./common_chart";

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
