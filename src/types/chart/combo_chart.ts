import { ChartConfiguration } from "chart.js";
import { Color, DeepPartial } from "../misc";
import { CustomizedDataSet } from "./chart";
import { ComboBarChartDefinition } from "./common_bar_combo";

export interface ComboChartDefinition extends ComboBarChartDefinition {
  readonly dataSets: ComboChartDataSet[];
  readonly type: "combo";
  readonly hideDataMarkers?: boolean;
}

export type ComboChartDataSet = CustomizedDataSet & { type?: "bar" | "line" };

export type ComboChartRuntime = {
  chartJsConfig: DeepPartial<ChartConfiguration>;
  masterChartConfig?: DeepPartial<ChartConfiguration>;
  background: Color;
};
