import { ChartConfiguration } from "chart.js";
import { LegendPosition } from "./common_chart";

export interface PieChartDefinition {
  readonly type: "pie";
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: string;
  readonly background: string;
  readonly legendPosition: LegendPosition;
}

export type PieChartRuntime = ChartConfiguration;
