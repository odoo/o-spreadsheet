import { LineChartDefinition, LineChartRuntime } from "./line_chart";

export interface ScatterChartDefinition
  extends Omit<LineChartDefinition, "type" | "stacked" | "cumulative" | "zoomable"> {
  readonly type: "scatter";
}

export type ScatterChartRuntime = LineChartRuntime;
