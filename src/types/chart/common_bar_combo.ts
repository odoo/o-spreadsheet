import { Color } from "../misc";
import { TitleDesign } from "./chart";
import { LegendPosition, VerticalAxisPosition } from "./common_chart";

export interface ComboBarChartDefinition {
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
}
