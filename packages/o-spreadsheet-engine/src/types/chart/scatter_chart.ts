import { Range } from "../range";
import { LineChartDefinition, LineChartRuntime } from "./line_chart";

export interface ScatterChartDefinition<T extends string | Range = Range>
  extends Omit<LineChartDefinition<T>, "type" | "stacked" | "cumulative" | "hideDataMarkers"> {
  readonly type: "scatter";
}

export type ScatterChartRuntime = LineChartRuntime;
