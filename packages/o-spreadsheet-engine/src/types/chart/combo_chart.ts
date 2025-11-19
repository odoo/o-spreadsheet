import { ChartConfiguration } from "chart.js";
import { Color, UID } from "../misc";
import { DataSetDesign } from "./chart";
import { ChartDataSource, CommonChartDefinition } from "./common_chart";

export interface ComboChartDefinition extends CommonChartDefinition {
  readonly datasetsDesign: Record<UID, ComboDataSetDesign>;
  readonly dataSource: ChartDataSource;
  readonly type: "combo";
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;
}

export type ComboDataSetDesign = DataSetDesign & { type?: "bar" | "line" };

export type ComboChartRuntime = {
  chartJsConfig: ChartConfiguration;
  masterChartConfig?: ChartConfiguration;
  background: Color;
};
