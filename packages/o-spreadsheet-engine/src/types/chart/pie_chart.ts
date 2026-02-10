import type { ChartConfiguration } from "chart.js";
import { CommonChartDefinition } from "./common_chart";

export interface PieChartDefinition extends CommonChartDefinition {
  readonly type: "pie";
  readonly aggregated?: boolean;
  readonly isDoughnut?: boolean;
  readonly showValues?: boolean;
  readonly pieHolePercentage?: number;
}

export type PieChartRuntime = {
  chartJsConfig: ChartConfiguration<"pie" | "doughnut">;
};
