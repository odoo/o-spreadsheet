import { BACKGROUND_CHART_COLOR } from "../../constants";
import { chartFontColor, chartRuntimeFactory, chartToImageUrl } from "../../helpers/figures/charts";
import { Color, ExcelWorkbookData, Range, UID } from "../../types";
import { ChartRuntime } from "../../types/chart/chart";
import {
  CoreViewCommand,
  invalidateCFEvaluationCommands,
  invalidateChartEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { Image } from "../../types/image";
import { CoreViewPlugin } from "../core_view_plugin";

interface EvaluationChartStyle {
  background: Color;
  fontColor: Color;
}

interface EvaluationChartState {
  charts: Record<UID, ChartRuntime | undefined>;
}

export class EvaluationChartPlugin extends CoreViewPlugin<EvaluationChartState> {
  static getters = ["getChartRuntime", "getStyleOfSingleCellChart"] as const;

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
    const style = this.getters.getCellComputedStyle({ sheetId, col, row });
    const background = style.fillColor || BACKGROUND_CHART_COLOR;
    return {
      background,
      fontColor: style.textColor || chartFontColor(background),
    };
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (const sheet of data.sheets) {
      for (const chartId of this.getters.getChartIds(sheet.id)) {
        const chart = this.getters.getChart(chartId);
        const excelDefinition = chart?.getDefinitionForExcel(this.getters);
        const figureId = this.getters.getFigureIdFromChartId(chartId);

        if (excelDefinition) {
          sheet.charts[chartId] = { figureId, chart: excelDefinition };
        } else {
          const type = this.getters.getChartType(chartId);
          const runtime = this.getters.getChartRuntime(chartId);
          const figure = this.getters.getFigure(sheet.id, figureId);
          const figureData = sheet.figures.find((f) => f.id === figureId);

          if (figure && figureData) {
            const imgSrc = chartToImageUrl(runtime, figure, type);
            if (imgSrc) {
              const image: Image = {
                mimetype: "image/png",
                path: imgSrc,
                size: { width: figure.width, height: figure.height },
              };
              sheet.images[figureId] = { figureId, image };
              figureData.tag = "image";
              delete sheet.charts[chartId];
            }
          }
        }
      }
    }
  }
}
