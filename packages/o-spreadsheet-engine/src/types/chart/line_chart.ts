import type { ChartConfiguration } from "chart.js";
import { Range } from "../range";
import { CommonChartDefinition } from "./common_chart";

export interface LineChartDefinition<T extends string | Range = Range>
  extends CommonChartDefinition<T> {
  readonly type: "line";
  readonly labelsAsText: boolean;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly cumulative: boolean;
  readonly fillArea?: boolean;
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;
}

export type LineChartRuntime = {
  chartJsConfig: ChartConfiguration<"line">;
  masterChartConfig?: ChartConfiguration<"line">;
  customizableSeries: { dataSetId: string; label: string }[];
};
