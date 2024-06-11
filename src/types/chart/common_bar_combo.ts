import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, Title } from "./chart";
import { LegendPosition } from "./common_chart";

export interface ComboBarChartDefinition {
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: Title;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
}
