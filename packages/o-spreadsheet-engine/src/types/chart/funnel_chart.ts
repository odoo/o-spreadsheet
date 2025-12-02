import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { AxesDesign, ChartRangeDataSource, DataSetStyling, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface FunnelChartDefinition {
  readonly type: "funnel";
  readonly dataSets: DataSetStyling;
  readonly dataSource: ChartRangeDataSource;
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
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
