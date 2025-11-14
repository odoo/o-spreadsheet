import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { ChartRangeDefinition } from "./common_chart";

export interface RadarChartDefinition extends ChartRangeDefinition {
  readonly type: "radar";
  readonly aggregated?: boolean;
  readonly stacked: boolean;
  readonly fillArea?: boolean;
  readonly hideDataMarkers?: boolean;
  readonly humanize?: boolean;
}

export type RadarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
