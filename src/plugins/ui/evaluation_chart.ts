import { chartRuntimeFactory } from "../../helpers/charts";
import { ChartRuntime } from "../../types/chart/chart";
import { Command, invalidateEvaluationCommands } from "../../types/commands";
import { UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class EvaluationChartPlugin extends UIPlugin {
  static getters = ["getChartRuntime"] as const;

  readonly charts: Record<UID, ChartRuntime | undefined> = {};

  private createRuntimeChart = chartRuntimeFactory(this.getters);

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      cmd.type === "EVALUATE_CELLS" ||
      (cmd.type === "UPDATE_CELL" && "content" in cmd)
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
}
