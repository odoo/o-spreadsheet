import { LineChartDefinition, LineChartRuntime } from "./line_chart";

export interface ScatterChartDefinition
  extends Omit<LineChartDefinition, "type" | "stacked" | "cumulative" | "hideDataMarkers"> {
  readonly type: "scatter";
}

export type ScatterChartRuntime = LineChartRuntime;
