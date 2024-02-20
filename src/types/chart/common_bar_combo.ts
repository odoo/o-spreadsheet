import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { DatasetDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface ComboBarChartDefinition {
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: string;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly dataSetDesign?: DatasetDesign[];
}

export type ComboBarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
