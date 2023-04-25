import { BACKGROUND_CHART_COLOR } from "../../constants";
import { chartRuntimeFactory } from "../../helpers/figures/charts";
import { Color, Range, UID } from "../../types";
import { ChartRuntime } from "../../types/chart/chart";
import {
  CoreViewCommand,
  invalidateCFEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class EvaluationChartPlugin extends UIPlugin {
  static getters = ["getChartRuntime", "getBackgroundOfSingleCellChart"] as const;

  readonly charts: Record<UID, ChartRuntime | undefined> = {};

  private createRuntimeChart = chartRuntimeFactory(this.getters);

  handle(cmd: CoreViewCommand) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      invalidateCFEvaluationCommands.has(cmd.type) ||
      cmd.type === "EVALUATE_CELLS" ||
      cmd.type === "UPDATE_CELL"
    ) {
      for (const chartId in this.charts) {
        this.charts[chartId] = undefined;
      }
    }

    switch (cmd.type) {
      case "UPDATE_CHART":
      case "CREATE_CHART":
      case "DELETE_FIGURE":
        this.charts[cmd.id] = undefined;
        break;
      case "DELETE_SHEET":
        for (let chartId in this.charts) {
          if (!this.getters.isChartDefined(chartId)) {
            this.charts[chartId] = undefined;
          }
        }
        break;
    }
  }

  getChartRuntime(figureId: UID): ChartRuntime {
    if (!this.charts[figureId]) {
      const chart = this.getters.getChart(figureId);
      if (!chart) {
        throw new Error(`No chart for the given id: ${figureId}`);
      }
      this.charts[figureId] = this.createRuntimeChart(chart);
    }
    return this.charts[figureId]!;
  }

  /**
   * Get the background color of a chart based on the color of the first cell of the main range
   * of the chart. In order of priority, it will return :
   *
   *  - the chart background color if one is defined
   *  - the fill color of the cell if one is defined
   *  - the fill color of the cell from conditional formats if one is defined
   *  - the default chart color if no other color is defined
   */
  getBackgroundOfSingleCellChart(
    chartBackground: Color | undefined,
    mainRange: Range | undefined
  ): Color {
    if (chartBackground) return chartBackground;
    if (!mainRange) {
      return BACKGROUND_CHART_COLOR;
    }
    const col = mainRange.zone.left;
    const row = mainRange.zone.top;
    const sheetId = mainRange.sheetId;
    const style = this.getters.getCellComputedStyle({ sheetId, col, row });
    return style.fillColor || BACKGROUND_CHART_COLOR;
  }
}
