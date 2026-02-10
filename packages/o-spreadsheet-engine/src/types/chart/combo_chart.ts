import { ChartConfiguration } from "chart.js";
import { CustomizedDataSet } from "./chart";
import { CommonChartDefinition } from "./common_chart";

export interface ComboChartDefinition extends CommonChartDefinition {
  readonly dataSets: ComboChartDataSet[];
  readonly type: "combo";
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;
}

export type ComboChartDataSet = CustomizedDataSet & { type?: "bar" | "line" };

export type ComboChartRuntime = {
  chartJsConfig: ChartConfiguration;
  masterChartConfig?: ChartConfiguration;
};
