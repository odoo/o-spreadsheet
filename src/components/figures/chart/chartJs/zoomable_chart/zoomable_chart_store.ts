import { Command, UID } from "../../../../..";
import {
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
  TREND_LINE_XAXIS_ID,
} from "../../../../../helpers/figures/charts/chart_common";
import { SpreadsheetStore } from "../../../../../stores";

export const __ZOOMABLE_AXIS_IDS__ = [
  "x",
  TREND_LINE_XAXIS_ID,
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
] as const;
export type AxisId = (typeof __ZOOMABLE_AXIS_IDS__)[number];
export type AxesLimits = {
  [chartId: UID]: { [axisId in AxisId]: { min: number | undefined; max: number | undefined } };
};
export type ScaleLimits = { [chartId: UID]: { min: number | undefined; max: number | undefined } };

export class ZoomableChartStore extends SpreadsheetStore {
  mutators = ["resetAxisLimits", "updateAxisLimits", "updateTrendLineConfiguration"] as const;

  originalAxisLimits: AxesLimits = {};
  currentAxisLimits: ScaleLimits = {};
  trendLineAxisLimits: AxesLimits = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "DELETE_FIGURE":
        if (cmd.figureId) {
          delete this.originalAxisLimits[cmd.figureId];
          delete this.currentAxisLimits[cmd.figureId];
          delete this.trendLineAxisLimits[cmd.figureId];
        }
        break;
    }
  }

  resetAxisLimits(
    chartId: UID,
    limits: { [key: string]: { min: number | undefined; max: number | undefined } }
  ) {
    for (const axisId of __ZOOMABLE_AXIS_IDS__) {
      if (limits[axisId]) {
        if (!this.originalAxisLimits[chartId]?.[axisId]) {
          this.originalAxisLimits[chartId] = {
            ...this.originalAxisLimits[chartId],
            [axisId]: {},
          };
        }
        this.originalAxisLimits[chartId][axisId].min = limits[axisId].min;
        this.originalAxisLimits[chartId][axisId].max = limits[axisId].max;
      }
    }
  }

  updateAxisLimits(chartId: UID, limits?: { min: number | undefined; max: number | undefined }) {
    let { min, max } = limits ?? {};
    if (min !== undefined && max !== undefined) {
      if (min > max) {
        [min, max] = [max, min];
      }
    }
    this.currentAxisLimits[chartId] = limits ?? { min, max };
  }

  updateTrendLineConfiguration(chartId: UID) {
    if (!this.originalAxisLimits[chartId]) {
      return;
    }
    const chartLimits = this.originalAxisLimits[chartId].x;
    if (chartLimits.min === undefined || chartLimits.max === undefined) {
      return;
    }
    for (const axisId of __ZOOMABLE_AXIS_IDS__) {
      if (axisId === "x" || !this.originalAxisLimits[chartId][axisId]) {
        continue;
      }
      if (!this.trendLineAxisLimits[chartId]?.[axisId]) {
        this.trendLineAxisLimits[chartId] = {
          ...this.trendLineAxisLimits[chartId],
          [axisId]: {},
        };
      }
      const realRange = chartLimits.max - chartLimits.min;
      const trendingLimits = this.originalAxisLimits[chartId][axisId];
      const trendingRange = trendingLimits.max! - trendingLimits.min!;
      const slope = trendingRange / realRange;
      const intercept = trendingLimits.min! - chartLimits.min * slope;
      const newXMin = this.currentAxisLimits[chartId]?.min;
      const newXMax = this.currentAxisLimits[chartId]?.max;
      this.trendLineAxisLimits[chartId][axisId].min =
        newXMin !== undefined ? (newXMin as number) * slope + intercept : undefined;
      this.trendLineAxisLimits[chartId][axisId].max =
        newXMax !== undefined ? (newXMax as number) * slope + intercept : undefined;
    }
  }
}
