import { BACKGROUND_CHART_COLOR } from "../../constants";
import { chartFontColor } from "../../helpers/figures/charts/chart_common";
import { chartRuntimeFactory } from "../../helpers/figures/charts/chart_factory";
import { chartToImageUrl } from "../../helpers/figures/charts/chart_ui_common";
import { ChartRuntime, ExcelChartDefinition } from "../../types/chart";
import { Command, CoreViewCommand, invalidateChartEvaluationCommands } from "../../types/commands";
import { Color, UID } from "../../types/misc";
import { Range } from "../../types/range";
import { ExcelWorkbookData, FigureData } from "../../types/workbook_data";
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

  beforeHandle(cmd: Command) {
    switch (cmd.type) {
      case "START":
        this.getters
          .getEntityDependencyRegistry()
          .registerInvalidationCallback("chart", (chartId) => this.invalidateChart(chartId));

        // Register dependencies for all existing charts
        for (const sheetId of this.getters.getSheetIds()) {
          for (const chartId of this.getters.getChartIds(sheetId)) {
            this.registerChartDependencies(chartId);
          }
        }
        break;
    }
  }

  handle(cmd: CoreViewCommand) {
    // Invalidate all charts for commands that affect chart rendering
    // but don't change cell values (hide/unhide, filters, formatting, etc.)
    if (invalidateChartEvaluationCommands.has(cmd.type)) {
      this.invalidateAllCharts();
    }

    switch (cmd.type) {
      case "CREATE_CHART":
        this.registerChartDependencies(cmd.chartId);
        this.charts[cmd.chartId] = undefined;
        break;
      case "UPDATE_CHART":
        this.registerChartDependencies(cmd.chartId);
        this.charts[cmd.chartId] = undefined;
        break;
      case "DELETE_CHART":
        this.getters.getEntityDependencyRegistry().unregisterEntity(cmd.chartId);
        delete this.charts[cmd.chartId];
        break;
      case "DELETE_SHEET":
        for (const chartId in this.charts) {
          if (!this.getters.isChartDefined(chartId)) {
            this.getters.getEntityDependencyRegistry().unregisterEntity(chartId);
            delete this.charts[chartId];
          }
        }
        break;
      case "DUPLICATE_SHEET":
        for (const chartId of this.getters.getChartIds(cmd.sheetIdTo)) {
          this.registerChartDependencies(chartId);
        }
        break;
      case "UNDO":
      case "REDO":
        // Re-register all chart dependencies after undo/redo
        this.getters.getEntityDependencyRegistry().unregisterAllEntitiesOfType("chart");
        for (const sheetId of this.getters.getSheetIds()) {
          for (const chartId of this.getters.getChartIds(sheetId)) {
            this.registerChartDependencies(chartId);
          }
        }
        break;
    }
  }

  private invalidateChart(chartId: UID): void {
    this.charts[chartId] = undefined;
  }

  private invalidateAllCharts(): void {
    for (const chartId in this.charts) {
      this.charts[chartId] = undefined;
    }
  }

  private registerChartDependencies(chartId: UID): void {
    const chart = this.getters.getChart(chartId);
    if (!chart) {
      return;
    }

    const dependencies = chart.getDependencies();
    if (dependencies.length === 0) {
      return;
    }

    this.getters.getEntityDependencyRegistry().registerEntity({
      id: chartId,
      type: "chart",
      dependencies,
    });
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
    if (chartBackground) {
      return { background: chartBackground, fontColor: chartFontColor(chartBackground) };
    }
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
