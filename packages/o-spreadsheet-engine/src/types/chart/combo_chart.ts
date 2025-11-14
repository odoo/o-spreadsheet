import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { RangeChartDataSet } from "./chart";
import { ChartRangeDefinition } from "./common_chart";

export interface ComboChartDefinition extends ChartRangeDefinition {
  readonly dataSets: ComboChartDataSet[];
  readonly type: "combo";
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;
}

export type ComboChartDataSet = RangeChartDataSet & { type?: "bar" | "line" };

export type ComboChartRuntime = {
  chartJsConfig: ChartConfiguration;
  masterChartConfig?: ChartConfiguration;
  background: Color;
};
