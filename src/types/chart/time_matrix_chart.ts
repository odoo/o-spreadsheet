import { ChartConfiguration } from "chart.js";
import { AxesDesign, TitleDesign } from ".";
import { Color } from "../misc";
import { GeoChartColorScale } from "./geo_chart";

export type TimeMatrixGroupBy =
  | "year"
  | "month"
  | "weekday"
  | "hour"
  | "monthday"
  | "week"
  | "quarter"
  | "date"
  | "quarter-year"
  | "month-year"
  | "week-year";

export interface TimeMatrixChartDefinition {
  readonly dataRange: string;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly showValues?: boolean;
  readonly type: "timeMatrix";
  readonly colorScale?: GeoChartColorScale;
  readonly showColorBar?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly xStamp?: TimeMatrixGroupBy;
  readonly yStamp?: TimeMatrixGroupBy;
}

export type TimeMatrixChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
