import { ComboBarChartDefinition } from "./common_bar_combo";

export interface ComboChartDefinition extends ComboBarChartDefinition {
  readonly type: "combo";
  readonly useBothYAxis?: boolean;
}
