import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { AxesDesign, DatasetDesign, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface BarChartDefinition {
  readonly type: "bar";
  readonly dataSets: string[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: string | TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
}

export type BarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
