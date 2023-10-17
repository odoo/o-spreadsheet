import { BACKGROUND_CHART_COLOR } from "../../constants";
import { chartFontColor, chartRuntimeFactory } from "../../helpers/charts";
import { Color, Range, UID } from "../../types";
import { ChartRuntime } from "../../types/chart/chart";
import {
  Command,
  invalidateCFEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

interface EvaluationChartStyle {
  background: Color;
  fontColor: Color;
}

export class EvaluationChartPlugin extends UIPlugin {
  static getters = ["getChartRuntime", "getStyleOfSingleCellChart"] as const;

  readonly charts: Record<UID, ChartRuntime | undefined> = {};

  private createRuntimeChart = chartRuntimeFactory(this.getters);

  handle(cmd: Command) {
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
   * Get the background and textColor of a chart based on the color of the first cell of the main range of the chart.
   */
  getStyleOfSingleCellChart(
    chartBackground: Color | undefined,
    mainRange: Range | undefined
  ): EvaluationChartStyle {
    if (chartBackground)
      return { background: chartBackground, fontColor: chartFontColor(chartBackground) };
    if (!mainRange) {
      return {
        background: BACKGROUND_CHART_COLOR,
        fontColor: chartFontColor(BACKGROUND_CHART_COLOR),
      };
    }
    const col = mainRange.zone.left;
    const row = mainRange.zone.top;
    const sheetId = mainRange.sheetId;
    const style = this.getters.getCellComputedStyle(sheetId, col, row);
    const background = style.fillColor || BACKGROUND_CHART_COLOR;
    return {
      background,
      fontColor: style.textColor || chartFontColor(background),
    };
  }
}
