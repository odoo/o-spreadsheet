import { ChartConfiguration } from "chart.js";
import { Color, UID } from "../misc";
import { AxesDesign, DataSetDesign, TitleDesign } from "./chart";
import { ChartDataSource, LegendPosition } from "./common_chart";

export interface FunnelChartDefinition {
  readonly type: "funnel";
  readonly datasetsDesign: Record<UID, DataSetDesign>;
  readonly dataSource: ChartDataSource;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly horizontal?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly aggregated?: boolean;
  readonly showValues?: boolean;
  readonly funnelColors?: FunnelChartColors;
  readonly cumulative?: boolean;
  readonly humanize?: boolean;
}

export type FunnelChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};

export type FunnelChartColors = (Color | undefined)[];
