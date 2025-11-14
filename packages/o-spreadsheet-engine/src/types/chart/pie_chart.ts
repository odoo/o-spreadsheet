import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { ChartRangeDefinition } from "./common_chart";

export interface PieChartDefinition extends ChartRangeDefinition {
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
