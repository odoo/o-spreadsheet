import { ChartConfiguration } from "chart.js";
import { AxesDesign, TitleDesign } from ".";
import { Color } from "../misc";
import { GeoChartColorScale } from "./geo_chart";

export interface TimeMatrixChartDefinition {
  readonly dataRange: string;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly showValues?: boolean;
  readonly type: "timeMatrix";
  readonly colorScale?: GeoChartColorScale;
  readonly axesDesign?: AxesDesign;
}

export type TimeMatrixChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
