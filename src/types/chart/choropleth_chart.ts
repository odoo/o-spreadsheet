import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";

export interface ChoroplethChartDefinition {
  readonly type: "choropleth";
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: string;
  readonly background?: Color;
  readonly aggregated?: boolean;
}

export type ChoroplethChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
