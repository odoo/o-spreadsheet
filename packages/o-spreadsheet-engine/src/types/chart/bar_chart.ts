import { ChartConfiguration } from "chart.js";
import { Color, UID } from "../misc";
import { ChartDataSource, CommonChartDefinition, DataSetDesign } from "./index";

export interface BarChartDefinition extends CommonChartDefinition {
  readonly type: "bar";
  readonly stacked: boolean;
  readonly horizontal?: boolean;
  readonly zoomable?: boolean;
  readonly datasetsDesign: Record<UID, DataSetDesign>;
  readonly dataSource: ChartDataSource;
}

export type BarChartRuntime = {
  chartJsConfig: ChartConfiguration<"bar" | "line">;
  masterChartConfig?: ChartConfiguration<"bar">;
  background: Color;
};
