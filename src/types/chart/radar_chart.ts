import { ChartConfiguration } from "chart.js";
import { CommonChartDefinition } from "./common_chart";

export interface RadarChartDefinition extends CommonChartDefinition {
  readonly type: "radar";
  readonly aggregated?: boolean;
  readonly stacked: boolean;
  readonly fillArea?: boolean;
  readonly hideDataMarkers?: boolean;
  readonly humanize?: boolean;
}

export type RadarChartRuntime = {
  chartJsConfig: ChartConfiguration;
};
