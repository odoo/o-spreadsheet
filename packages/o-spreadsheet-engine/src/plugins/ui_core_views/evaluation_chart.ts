import { chartRuntimeFactory } from "../../helpers/figures/charts/chart_factory";
import { chartToImageUrl } from "../../helpers/figures/charts/chart_ui_common";
import { ChartRuntime, ExcelChartDefinition } from "../../types/chart";
import {
  CoreViewCommand,
  invalidateCFEvaluationCommands,
  invalidateChartEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { UID } from "../../types/misc";
import { ExcelWorkbookData, FigureData } from "../../types/workbook_data";
import { CoreViewPlugin } from "../core_view_plugin";

interface EvaluationChartState {
  charts: Record<UID, ChartRuntime | undefined>;
}

export class EvaluationChartPlugin extends CoreViewPlugin<EvaluationChartState> {
  static getters = ["getChartRuntime"] as const;

  charts: Record<UID, ChartRuntime | undefined> = {};

  private createRuntimeChart = chartRuntimeFactory(this.getters);

  handle(cmd: CoreViewCommand) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      invalidateCFEvaluationCommands.has(cmd.type) ||
      invalidateChartEvaluationCommands.has(cmd.type)
    ) {
      for (const chartId in this.charts) {
        this.charts[chartId] = undefined;
      }
    }

    switch (cmd.type) {
      case "UPDATE_CHART":
      case "CREATE_CHART":
        this.charts[cmd.chartId] = undefined;
        break;
      case "DELETE_CHART":
        this.charts[cmd.chartId] = undefined;
        break;
      case "DELETE_SHEET":
        for (const chartId in this.charts) {
          if (!this.getters.isChartDefined(chartId)) {
            this.charts[chartId] = undefined;
          }
        }
        break;
    }
  }

  getChartRuntime(chartId: UID): ChartRuntime {
    if (!this.charts[chartId]) {
      const chart = this.getters.getChart(chartId);
      if (!chart) {
        throw new Error(`No chart for the given id: ${chartId}`);
      }
      this.charts[chartId] = this.createRuntimeChart(chart);
    }
    return this.charts[chartId] as ChartRuntime;
  }

  async exportForExcel(data: ExcelWorkbookData) {
    for (const sheet of data.sheets) {
      if (!sheet.images) {
        sheet.images = [];
      }
      const sheetFigures = this.getters.getFigures(sheet.id);
      const figures: FigureData<ExcelChartDefinition>[] = [];
      for (const figure of sheetFigures) {
        if (!figure || figure.tag !== "chart") {
          continue;
        }
        const chartId = this.getters
          .getChartIds(sheet.id)
          .find((chartId) => this.getters.getFigureIdFromChartId(chartId) === figure.id);
        if (!chartId) {
          continue;
        }
        const chart = this.getters.getChart(chartId);
        const figureData = chart?.getDefinitionForExcel(this.getters);
        if (figureData) {
          figures.push({
            ...figure,
            data: figureData,
          });
        } else {
          if (!chart) {
            continue;
          }
          const type = this.getters.getChartType(chartId);
          const runtime = this.getters.getChartRuntime(chartId);
          const img = await chartToImageUrl(runtime, figure, type);
          if (img) {
            sheet.images.push({
              ...figure,
              tag: "image",
              data: {
                mimetype: "image/png",
                path: img,
                size: { width: figure.width, height: figure.height },
              },
            });
          }
        }
      }
      sheet.charts = figures;
    }
  }
}
