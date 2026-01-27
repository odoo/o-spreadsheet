import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, TitleDesign } from "./chart";

export type VerticalAxisPosition = "left" | "right";
export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";

export interface CommonChartDefinition extends MinimalChartDefinition {
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
}

export interface MinimalChartDefinition {
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly humanize?: boolean;
  readonly annotationText?: string;
  readonly annotationLink?: string;
}
