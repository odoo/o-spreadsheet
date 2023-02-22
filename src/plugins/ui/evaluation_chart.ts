import { BACKGROUND_CHART_COLOR } from "../../constants";
import { chartRuntimeFactory } from "../../helpers/charts";
import { Color, Range, UID } from "../../types";
import { ChartRuntime } from "../../types/chart/chart";
import {
  Command,
  invalidateCFEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class EvaluationChartPlugin extends UIPlugin {
  static getters = ["getChartRuntime", "getBackgroundOfSingleCellChart"] as const;

  readonly charts: { [sheetId: UID]: Record<UID, ChartRuntime | undefined> | undefined } = {};

  private createRuntimeChart = chartRuntimeFactory(this.getters);

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      invalidateCFEvaluationCommands.has(cmd.type) ||
      cmd.type === "EVALUATE_CELLS" ||
      cmd.type === "UPDATE_CELL"
    ) {
      for (const sheetId in this.charts) {
        for (const chartId in this.charts[sheetId]) {
          this.charts[sheetId]![chartId] = undefined;
        }
      }
    }

    switch (cmd.type) {
      case "UPDATE_CHART":
      case "CREATE_CHART":
      case "DELETE_FIGURE":
        if (this.charts[cmd.sheetId]) {
          this.charts[cmd.sheetId]![cmd.id] = undefined;
        }
        break;
      case "DELETE_SHEET":
        delete this.charts[cmd.sheetId];
        break;
    }
  }

  getChartRuntime(sheetId: UID, figureId: UID): ChartRuntime {
    if (!this.charts[sheetId]?.[figureId]) {
      const chart = this.getters.getChart(sheetId, figureId);
      if (!chart) {
        throw new Error(`No chart for the given id: ${figureId}`);
      }
      if (!this.charts[sheetId]) this.charts[sheetId] = {};
      this.charts[sheetId]![figureId] = this.createRuntimeChart(chart);
    }
    return this.charts[sheetId]![figureId]!;
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
    const style = this.getters.getCellComputedStyle(mainRange.sheetId, col, row);
    return style.fillColor || BACKGROUND_CHART_COLOR;
  }
}
