import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, TitleDesign } from "./chart";

export type VerticalAxisPosition = "left" | "right";
export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";

export interface CommonChartDefinition {
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRanges?: string[];
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly humanize?: boolean;
  /**
   * When multiple label ranges are configured, reorder data points so that
   * entries sharing the same outermost secondary label are grouped together.
   * When false/undefined the data points keep the original dataset order.
   */
  readonly groupBySecondaryLabels?: boolean;
}
