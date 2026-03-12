import { ChartConfiguration } from "chart.js";
import { Color } from "../..";
import { ScatterChartDefinition } from "./scatter_chart";

export type BubbleColorMode = {
  color: "multiple" | Color;
  transparent?: boolean;
};

export interface BubbleChartDefinition extends Omit<ScatterChartDefinition, "type" | "aggregated"> {
  readonly type: "bubble";
  readonly xRange?: string;
  readonly sizeRange?: string;
  readonly bubbleColor: BubbleColorMode;
}

export type BubbleChartRuntime = {
  chartJsConfig: ChartConfiguration<"line">;
};
