import { ChartConfiguration } from "chart.js";
import { ChartColorScale, CommonChartDefinition } from ".";
import { Color } from "../misc";

export const TIME_MATRIX_GROUP_BY_CHOICES = [
  "year",
  "month",
  "weekday",
  "hour",
  "monthday",
  "week",
  "quarter",
  "date",
  "quarter-year",
  "month-year",
  "week-year",
] as const;

export type CalendarChartGroupBy = (typeof TIME_MATRIX_GROUP_BY_CHOICES)[number];

export interface CalendarChartDefinition extends CommonChartDefinition {
  readonly type: "calendar";
  readonly colorScale?: ChartColorScale;
  readonly missingValueColor?: Color;
  readonly showColorBar?: boolean;
  readonly horizontalGroupBy?: CalendarChartGroupBy;
  readonly verticalGroupBy?: CalendarChartGroupBy;
}

export type CalendarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
