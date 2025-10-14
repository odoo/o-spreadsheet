import { LineChartDefinition, LineChartRuntime } from "./line_chart";

export type ScatterShowValuesMode = "value" | "label";

export interface ScatterChartDefinition
  extends Omit<LineChartDefinition, "type" | "stacked" | "cumulative"> {
  readonly type: "scatter";
  readonly showValuesMode?: ScatterShowValuesMode;
}

export type ScatterChartRuntime = LineChartRuntime;
