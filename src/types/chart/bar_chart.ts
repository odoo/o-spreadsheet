import { Color } from "../misc";
import { ComboBarChartDefinition } from "./common_bar_combo";

export interface BarChartDefinition extends ComboBarChartDefinition {
  readonly type: "bar";
  readonly stacked: boolean;
  readonly horizontal?: boolean;
}

export type BarChartRuntime = {
  chartJsConfig: any; // ADRM TODO ChartConfiguration;
  background: Color;
};
