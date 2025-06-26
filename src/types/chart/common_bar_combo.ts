import { ZoomConfiguration } from ".";
import { CommonChartDefinition } from "./common_chart";

export interface ComboBarChartDefinition extends CommonChartDefinition {
  readonly zoom?: ZoomConfiguration;
}
