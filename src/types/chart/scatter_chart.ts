import { CustomizedDataSet } from "./chart";
import { LineChartDefinition, LineChartRuntime } from "./line_chart";

export type ScatterShowValuesMode = "value" | "label";

export type ScatterPointSizeMode = "fixed" | "range" | "value";

type ScatterDataSet = CustomizedDataSet & {
  readonly pointSizeMode?: ScatterPointSizeMode;
  readonly pointSize?: number;
  readonly pointSizeRange?: string;
};

export interface ScatterChartDefinition
  extends Omit<LineChartDefinition, "type" | "stacked" | "cumulative" | "dataSets"> {
  readonly type: "scatter";
  readonly dataSets: ScatterDataSet[];
  readonly showValuesMode?: ScatterShowValuesMode;
}

export type ScatterChartRuntime = LineChartRuntime;
