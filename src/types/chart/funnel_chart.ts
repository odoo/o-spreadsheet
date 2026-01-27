import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { Range } from "../range";
import { AxesDesign, ChartDataSource, DataSetStyle, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface FunnelChartDefinition<T extends string | Range = Range> {
  readonly type: "funnel";
  readonly dataSetStyles: DataSetStyle;
  readonly dataSource: ChartDataSource<T>;
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
  readonly annotationText?: string;
  readonly annotationLink?: string;
}

export type FunnelChartRuntime = {
  chartJsConfig: ChartConfiguration;
};

export type FunnelChartColors = (Color | undefined)[];
