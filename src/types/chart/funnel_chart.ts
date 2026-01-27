import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { Range } from "../range";
import { DataSourceChartDefinition } from "./common_chart";

export interface FunnelChartDefinition<T extends string | Range = Range>
  extends DataSourceChartDefinition<T> {
  readonly type: "funnel";
  readonly horizontal?: boolean;
  readonly funnelColors?: FunnelChartColors;
  readonly cumulative?: boolean;
}

export type FunnelChartRuntime = {
  chartJsConfig: ChartConfiguration;
};

export type FunnelChartColors = (Color | undefined)[];
