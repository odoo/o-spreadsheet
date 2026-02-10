import { ChartConfiguration } from "chart.js";
import { BarChartDefinition } from "./bar_chart";

export interface PyramidChartDefinition extends Omit<BarChartDefinition, "type" | "zoomable"> {
  readonly type: "pyramid";
}

export type PyramidChartRuntime = {
  chartJsConfig: ChartConfiguration;
};
