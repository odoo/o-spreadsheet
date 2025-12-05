import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { CommonChartDefinition } from "./index";

export interface BarChartDefinition extends CommonChartDefinition {
  readonly type: "bar";
  readonly stacked: boolean;
  readonly horizontal?: boolean;
  readonly zoomable?: boolean;
}

export type BarChartRuntime = {
  chartJsConfig: ChartConfiguration<"bar" | "line">;
  masterChartConfig?: ChartConfiguration<"bar">;
  background: Color;
  customisableSeries: { dataSetId: string; label: string }[];
};
