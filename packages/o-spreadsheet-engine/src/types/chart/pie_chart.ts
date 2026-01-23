import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { Range } from "../range";
import { CommonChartDefinition } from "./common_chart";

export interface PieChartDefinition<T extends string | Range = Range>
  extends CommonChartDefinition<T> {
  readonly type: "pie";
  readonly aggregated?: boolean;
  readonly isDoughnut?: boolean;
  readonly showValues?: boolean;
  readonly pieHolePercentage?: number;
}

export type PieChartRuntime = {
  chartJsConfig: ChartConfiguration<"pie" | "doughnut">;
  background: Color;
};
