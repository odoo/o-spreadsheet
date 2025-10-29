import { ChartConfiguration } from "chart.js";
import { AxesDesign, Color, Range } from "../..";
import {
  LegendPosition,
  NonDataSourceBaseChartDefinition,
  VerticalAxisPosition,
} from "./common_chart";

export type BubbleColorMode = {
  color: "multiple" | Color;
  transparent?: boolean;
};

export interface BubbleChartDefinition<T extends string | Range = string>
  extends NonDataSourceBaseChartDefinition {
  readonly type: "bubble";
  readonly legendPosition: LegendPosition;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly dataSetsHaveTitle: boolean;
  readonly yRanges: T[];
  readonly xRange?: T;
  readonly labelRange?: T;
  readonly sizeRange?: T;
  readonly labelsAsText: boolean;
  readonly bubbleColor: BubbleColorMode;
  readonly verticalAxisPosition: VerticalAxisPosition;
}

export type BubbleChartRuntime = {
  chartJsConfig: ChartConfiguration<"line">;
};
