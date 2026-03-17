import { ChartConfiguration } from "chart.js";
import { Range } from "../range";
import { CommonChartDefinition } from "./index";

export interface BarChartDefinition<T extends string | Range = Range>
  extends CommonChartDefinition<T> {
  readonly type: "bar";
  readonly stacked: boolean;
  readonly horizontal?: boolean;
  readonly zoomable?: boolean;
}

export type BarChartRuntime = {
  chartJsConfig: ChartConfiguration<"bar" | "line">;
  masterChartConfig?: ChartConfiguration<"bar">;
  customizableSeries: { dataSetId: string; label: string }[];
};
