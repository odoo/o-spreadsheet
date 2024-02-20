import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { DatasetDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface PieChartDefinition {
  readonly type: "pie";
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: string;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly dataSetDesign?: DatasetDesign[];
}

export type PieChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
