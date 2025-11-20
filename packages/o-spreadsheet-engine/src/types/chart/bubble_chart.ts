import { ChartConfiguration } from "chart.js";
import { VerticalAxisPosition } from "./common_chart";
import { ScatterChartDefinition, ScatterChartRuntime } from "./scatter_chart";

export type BubbleColorMode = "single" | "multiple";

export interface BubbleChartDefinition extends Omit<ScatterChartDefinition, "type"> {
  readonly type: "bubble";
  readonly xRange?: string;
  readonly sizeRange?: string;
  readonly colorMode?: BubbleColorMode;
  readonly verticalAxisPosition: VerticalAxisPosition;
}

export type BubbleChartRuntime = Omit<ScatterChartRuntime, "chartJsConfig"> & {
  chartJsConfig: ChartConfiguration<"bubble">;
};
