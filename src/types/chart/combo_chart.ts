import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { CustomizedDataSet } from "./chart";
import { ComboBarChartDefinition } from "./common_bar_combo";

export interface ComboChartDefinition extends ComboBarChartDefinition {
  readonly dataSets: ComboChartDataSet[];
  readonly type: "combo";
}

export type ComboChartDataSet = CustomizedDataSet & { type?: "bar" | "line" };

export type ComboChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
