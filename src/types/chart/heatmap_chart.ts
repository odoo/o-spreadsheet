import { ChartConfiguration } from "chart.js";
import { CancelledReason, CommandResult } from "../commands";
import { Range } from "../range";
import { ColorGridChartDefinition, NonDataSourceBaseChartDefinition } from "./common_chart";

export const heatMapRangeKeys = ["xRange", "yRange", "sizeRange"] as const;
export type HeatmapRangeKey = (typeof heatMapRangeKeys)[number];

type HeatmapRanges<T extends string | Range = Range> = {
  readonly [K in HeatmapRangeKey]?: T;
};
export interface HeatmapChartDefinition<T extends string | Range = Range>
  extends NonDataSourceBaseChartDefinition,
    ColorGridChartDefinition,
    HeatmapRanges<T> {
  readonly type: "heatmap";
  readonly dataSetsHaveTitle: boolean;
}

export type HeatmapChartRuntime = {
  chartJsConfig: ChartConfiguration<"calendar">;
};

export const INVALID_RANGE_RESULTS: Record<HeatmapRangeKey, CancelledReason> = {
  xRange: CommandResult.InvalidXRange,
  yRange: CommandResult.InvalidYRange,
  sizeRange: CommandResult.InvalidHeatmapSizeRange,
};
