import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { CommonChartDefinition } from "./common_chart";

export interface PieChartDefinition extends CommonChartDefinition {
  readonly type: "pie";
  readonly aggregated?: boolean;
  readonly isDoughnut?: boolean;
}

export type PieChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
