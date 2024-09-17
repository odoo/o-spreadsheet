import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { ComboBarChartDefinition } from "./common_bar_combo";

export interface ComboChartDefinition extends ComboBarChartDefinition {
  readonly type: "combo";
}

export type ComboChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
