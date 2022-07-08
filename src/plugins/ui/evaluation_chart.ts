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
      case "REFRESH_CHART":
        this.charts[cmd.id] = undefined;
        this.evaluateUsedSheets([cmd.id]); //TODO Lazy evaluation for the win
        break;
      case "ACTIVATE_SHEET":
        const chartsIds = this.getters.getChartIds(cmd.sheetIdTo);
        this.evaluateUsedSheets(chartsIds); //TODO Lazy evaluation for the win
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

  private evaluateUsedSheets(chartsIds: UID[]) {
    const usedSheetsId: Set<UID> = new Set();
    for (let chartId of chartsIds) {
      const sheetIds = this.getters.getSheetIdsUsedInChartRanges(chartId) || [];
      sheetIds.forEach((sheetId) => {
        if (sheetId !== this.getters.getActiveSheetId()) {
          usedSheetsId.add(sheetId);
        }
      });
    }
    for (let sheetId of usedSheetsId) {
      this.dispatch("EVALUATE_CELLS", { sheetId });
    }
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
    const cfFormat = this.getters.getConditionalStyle(col, row, mainRange.sheetId);
    if (cfFormat && cfFormat.fillColor) {
      return cfFormat.fillColor;
    }
    const cell = this.getters.getCell(mainRange.sheetId, col, row);
    if (cell && cell.style && cell.style.fillColor) {
      return cell.style.fillColor;
    }
    return BACKGROUND_CHART_COLOR;
  }
}
