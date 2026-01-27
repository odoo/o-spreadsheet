import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { Range } from "../range";
import { AxesDesign, ChartDataSource, DataSetStyle } from "./chart";
import { BaseChartDefinition, LegendPosition } from "./common_chart";

export interface FunnelChartDefinition<T extends string | Range = Range>
  extends BaseChartDefinition {
  readonly type: "funnel";
  readonly dataSetStyles: DataSetStyle;
  readonly dataSource: ChartDataSource<T>;
  readonly legendPosition: LegendPosition;
  readonly horizontal?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly aggregated?: boolean;
  readonly showValues?: boolean;
  readonly funnelColors?: FunnelChartColors;
  readonly cumulative?: boolean;
}

export type FunnelChartRuntime = {
  chartJsConfig: ChartConfiguration;
};

export type FunnelChartColors = (Color | undefined)[];
