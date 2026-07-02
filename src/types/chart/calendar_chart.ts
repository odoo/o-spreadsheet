import { ChartConfiguration } from "chart.js";
import { Granularity } from "../pivot";
import { Range } from "../range";
import { ColorGridChartDefinition, DataSourceChartDefinition } from "./common_chart";

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
  extends DataSourceChartDefinition<T>,
    ColorGridChartDefinition {
  readonly type: "calendar";
  readonly horizontalGroupBy: CalendarChartGranularity;
  readonly verticalGroupBy: CalendarChartGranularity;
}

export type CalendarChartRuntime = {
  chartJsConfig: ChartConfiguration;
};
