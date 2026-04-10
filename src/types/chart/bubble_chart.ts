import { ChartConfiguration } from "chart.js";
import { AxesDesign, Color, Range, TitleDesign } from "../..";
import { LegendPosition, VerticalAxisPosition } from "./common_chart";

export type BubbleColorMode = {
  color: "multiple" | Color;
  transparent?: boolean;
};

export interface BubbleChartDefinition<T extends string | Range = string> {
  readonly type: "bubble";
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly humanize?: boolean;
  readonly dataSetsHaveTitle: boolean;
  readonly yRanges: T[];
  readonly xRange?: T;
  readonly labelRange?: T;
  readonly sizeRange?: T;
  readonly labelsAsText: boolean;
  readonly bubbleColor: BubbleColorMode;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly dataSource?: undefined; // doesn't use a data source. Explicitly declaring the key ensures that `dataSource` can be safely accessed on the `ChartDefinition` union without TypeScript errors.
}

export type BubbleChartRuntime = {
  chartJsConfig: ChartConfiguration<"line">;
};
