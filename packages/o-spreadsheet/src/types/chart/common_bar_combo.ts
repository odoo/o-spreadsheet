import { CommonChartDefinition } from "./common_chart";

export interface ComboBarChartDefinition extends CommonChartDefinition {
  readonly zoomable?: boolean;
}
