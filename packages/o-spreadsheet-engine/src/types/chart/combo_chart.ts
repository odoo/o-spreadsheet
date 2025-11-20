import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { DataSetDesign } from "./chart";
import { CommonChartDefinition } from "./common_chart";

export interface ComboChartDefinition extends CommonChartDefinition {
  readonly type: "combo";
  readonly datasetsDesign: Record<string, ComboDataSetDesign>;
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;
}

export type ComboDataSetDesign = DataSetDesign & { type?: "bar" | "line" };

export type ComboChartRuntime = {
  chartJsConfig: ChartConfiguration;
  masterChartConfig?: ChartConfiguration;
  background: Color;
};
