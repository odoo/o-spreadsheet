import { ChartConfiguration } from "chart.js";
import { Color } from "../..";
import { ScatterChartDefinition, ScatterChartRuntime } from "./scatter_chart";

export type BubbleColorMode = {
  color: "multiple" | Color;
  opacity?: boolean;
};

export interface BubbleChartDefinition extends Omit<ScatterChartDefinition, "type" | "aggregated"> {
  readonly type: "bubble";
  readonly xRange?: string;
  readonly sizeRange?: string;
  readonly bubbleColor: BubbleColorMode;
}

export type BubbleChartRuntime = Omit<ScatterChartRuntime, "chartJsConfig"> & {
  chartJsConfig: ChartConfiguration<"bubble">;
};
