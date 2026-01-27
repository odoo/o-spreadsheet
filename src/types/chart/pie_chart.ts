import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { Range } from "../range";
import { DataSourceChartDefinition } from "./common_chart";

export interface PieChartDefinition<T extends string | Range = Range>
  extends DataSourceChartDefinition<T> {
  readonly type: "pie";
  readonly slicesColors?: Color[];
  readonly aggregated?: boolean;
  readonly isDoughnut?: boolean;
  readonly showValues?: boolean;
  readonly pieHolePercentage?: number;
}

export type PieChartRuntime = {
  chartJsConfig: ChartConfiguration<"pie" | "doughnut">;
};
