import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, TitleDesign, ZoomConfiguration } from "./chart";
import { LegendPosition } from "./common_chart";

export interface ComboBarChartDefinition {
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly zoom?: ZoomConfiguration;
}
