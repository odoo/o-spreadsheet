import { ChartConfiguration } from "chart.js";
import { ChartColorScale, CommonChartDefinition } from ".";
import { Color } from "../misc";
import { Granularity } from "../pivot";
import { Range } from "../range";

export const CALENDAR_CHART_GRANULARITIES = [
  "year",
  "quarter_number",
  "month_number",
  "iso_week_number",
  "day_of_month",
  "day_of_week",
  "hour_number",
  "minute_number",
  "second_number",
] satisfies Granularity[];

export type CalendarChartGranularity = (typeof CALENDAR_CHART_GRANULARITIES)[number];

export interface CalendarChartDefinition<T extends string | Range = Range>
  extends CommonChartDefinition<T> {
  readonly type: "calendar";
  readonly horizontalGroupBy: CalendarChartGranularity;
  readonly verticalGroupBy: CalendarChartGranularity;
  readonly colorScale?: ChartColorScale;
  readonly missingValueColor?: Color;
}

export type CalendarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
