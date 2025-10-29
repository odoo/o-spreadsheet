import { ChartConfiguration } from "chart.js";
import { Color } from "../..";
import { AxesDesign, TitleDesign } from "./chart";
import { LegendPosition, VerticalAxisPosition } from "./common_chart";
import { ScatterChartRuntime } from "./scatter_chart";

export type BubbleColorMode = "single" | "multiple";

export interface BubbleChartDefinition {
  readonly type: "bubble";
  readonly xRange?: string;
  readonly yRange?: string;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly humanize?: boolean;
  readonly sizeRange?: string;
  readonly colorMode: BubbleColorMode;
  readonly verticalAxisPosition: VerticalAxisPosition;
}

export type BubbleChartRuntime = Omit<ScatterChartRuntime, "chartJsConfig"> & {
  chartJsConfig: ChartConfiguration<"bubble">;
};
