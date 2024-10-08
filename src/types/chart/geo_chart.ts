import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface GeoChartDefinition {
  readonly type: "geo";
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly axesDesign?: AxesDesign;
  readonly aggregated?: boolean;
}

export type GeoChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
