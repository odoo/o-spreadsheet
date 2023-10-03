import { BACKGROUND_CHART_COLOR } from "../../constants";
import { chartRuntimeFactory, chartToImage } from "../../helpers/figures/charts";
import { chartRegistry } from "../../registries";
import { Color, ExcelWorkbookData, FigureData, Range, UID } from "../../types";
import { ChartRuntime, ExcelChartDefinition } from "../../types/chart/chart";
import {
  Command,
  invalidateCFEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { Image } from "../../types/image";
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

  exportForExcel(data: ExcelWorkbookData) {
    for (let sheet of data.sheets) {
      if (!sheet.images) {
        sheet.images = [];
      }
      const sheetFigures = this.getters.getFigures(sheet.id);
      const figures: FigureData<ExcelChartDefinition>[] = [];
      const images: FigureData<Image>[] = [];
      for (let figure of sheetFigures) {
        if (figure && figure.tag === "chart") {
          const figureId = figure.id;
          const figureData = this.getters.getChart(figureId)?.getDefinitionForExcel();
          if (figureData) {
            figures.push({
              ...figure,
              data: figureData,
            });
          } else {
            const chart = this.getters.getChart(figureId);
            if (!chart) {
              continue;
            }
            const type = this.getters.getChartType(figureId);
            const runtime = chartRegistry.get(type)?.getChartRuntime(chart, this.getters);
            const img = chartToImage(runtime, figure, type);
            images.push({
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
      sheet.images = [...sheet.images, ...images];
      sheet.charts = figures;
    }
  }
}
