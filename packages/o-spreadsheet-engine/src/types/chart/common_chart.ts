import { Color } from "../misc";
import { AxesDesign, RangeChartDataSet, TitleDesign } from "./chart";

export type VerticalAxisPosition = "left" | "right";
export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";

export interface CommonChartDefinition {
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly humanize?: boolean;
}

export interface ChartRangeDefinition extends CommonChartDefinition {
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly dataSets: RangeChartDataSet[];
}
