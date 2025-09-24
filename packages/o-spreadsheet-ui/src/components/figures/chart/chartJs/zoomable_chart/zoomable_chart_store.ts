import { Command, UID } from "../../../../..";
import {
  MOVING_AVERAGE_TREND_LINE_XAXIS_ID,
  TREND_LINE_XAXIS_ID,
} from "../../../../../helpers/figures/charts/chart_common";
import { SpreadsheetStore } from "../../../../../stores";

const TREND_LINE_AXES_IDS = [TREND_LINE_XAXIS_ID, MOVING_AVERAGE_TREND_LINE_XAXIS_ID] as const;
const ZOOMABLE_AXIS_IDS = ["x", ...TREND_LINE_AXES_IDS] as const;
export type AxisId = (typeof ZOOMABLE_AXIS_IDS)[number];
export type AxesLimits = {
  [chartId: UID]: { [axisId in AxisId]?: { min: number; max: number } | undefined };
};
export class ZoomableChartStore extends SpreadsheetStore {
  mutators = [
    "resetAxisLimits",
    "updateAxisLimits",
    "updateTrendLineConfiguration",
    "clearAxisLimits",
  ] as const;

  originalAxisLimits: AxesLimits = {};
  currentAxesLimits: AxesLimits = {};
  private idConversion: Record<UID, Set<UID>> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "DELETE_FIGURE":
        if (cmd.figureId && this.idConversion[cmd.figureId]) {
          for (const chartId of this.idConversion[cmd.figureId]) {
            delete this.originalAxisLimits[chartId];
            delete this.currentAxesLimits[chartId];
          }
        }
        break;
      case "UPDATE_CHART":
        const type = cmd.definition.type;
        const chartId = `${type}-${cmd.figureId}`;
        if (!this.idConversion[cmd.figureId]) {
          this.idConversion[cmd.figureId] = new Set<UID>();
        }
        this.idConversion[cmd.figureId].add(chartId);
        if (!("zoomable" in cmd.definition && cmd.definition.zoomable)) {
          this.clearAxisLimits(chartId);
        }
        break;
    }
  }

  clearAxisLimits(chartId: UID) {
    delete this.originalAxisLimits[chartId];
    delete this.currentAxesLimits[chartId];
    return "noStateChange";
  }

  resetAxisLimits(
    chartId: UID,
    limits: { [key: string]: { min: number; max: number } | undefined } | undefined
  ) {
    for (const axisId of ZOOMABLE_AXIS_IDS) {
      if (limits?.[axisId]) {
        if (!this.originalAxisLimits[chartId]?.[axisId]) {
          this.originalAxisLimits[chartId] = {
            ...this.originalAxisLimits[chartId],
            [axisId]: {},
          };
        }
        this.originalAxisLimits[chartId][axisId]!["min"] = limits[axisId].min;
        this.originalAxisLimits[chartId][axisId]!["max"] = limits[axisId].max;
      } else {
        if (this.originalAxisLimits[chartId]?.[axisId]) {
          delete this.originalAxisLimits[chartId][axisId];
        }
      }
    }
    return "noStateChange";
  }

  updateAxisLimits(chartId: UID, limits?: { min: number; max: number } | undefined) {
    if (limits === undefined) {
      delete this.currentAxesLimits[chartId];
      return "noStateChange";
    }
    let { min, max } = limits;
    if (min > max) {
      [min, max] = [max, min];
    }
    this.currentAxesLimits[chartId] = { x: { min, max } };
    return "noStateChange";
  }

  /* Update the trend line axis configuration based on the current axis limits.
   * This function calculates the new limits for the trend line axes based on the current x-axis
   * limits and the original limits of the trend line axes.
   * It assumes that the origininal trend line axes are linear transformations of the original x-axis
   * limits and applies the same transformation to the current x-axis limits to get the new limits
   * for the current trend line axes.
   */
  updateTrendLineConfiguration(chartId: UID) {
    if (!this.originalAxisLimits[chartId]) {
      return "noStateChange";
    }
    const chartLimits = this.originalAxisLimits[chartId].x;
    if (chartLimits === undefined) {
      return "noStateChange";
    }
    for (const axisId of TREND_LINE_AXES_IDS) {
      if (!this.originalAxisLimits[chartId][axisId]) {
        continue;
      }
      if (!this.currentAxesLimits[chartId]?.[axisId]) {
        this.currentAxesLimits[chartId] = {
          ...this.currentAxesLimits[chartId],
          [axisId]: {},
        };
      }
      if (this.currentAxesLimits[chartId]?.x === undefined) {
        return "noStateChange";
      }
      const realRange = chartLimits.max - chartLimits.min;
      const trendingLimits = this.originalAxisLimits[chartId][axisId];
      const trendingRange = trendingLimits.max! - trendingLimits.min!;
      const slope = trendingRange / realRange;
      const intercept = trendingLimits.min! - chartLimits.min * slope;
      const newXMin = this.currentAxesLimits[chartId].x.min;
      const newXMax = this.currentAxesLimits[chartId].x.max;
      this.currentAxesLimits[chartId][axisId]!.min = newXMin * slope + intercept;
      this.currentAxesLimits[chartId][axisId]!.max = newXMax * slope + intercept;
    }
    return "noStateChange";
  }
}
