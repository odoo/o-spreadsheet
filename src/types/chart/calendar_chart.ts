import { ChartConfiguration } from "chart.js";
import { ChartColorScale, CommonChartDefinition } from ".";
import { Color } from "../misc";
import { Granularity } from "../pivot";

export interface CalendarChartDefinition extends CommonChartDefinition {
  readonly type: "calendar";
  readonly colorScale?: ChartColorScale;
  readonly missingValueColor?: Color;
  readonly horizontalGroupBy?: Granularity;
  readonly verticalGroupBy?: Granularity;
}

export type CalendarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
