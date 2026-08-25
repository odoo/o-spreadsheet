import { ChartConfiguration } from "chart.js";
import { COLOR_THEMES } from "../../helpers/color_themes";
import { SpreadsheetChart } from "../../helpers/figures/chart";
import { chartFontColor } from "../../helpers/figures/charts/chart_common";
import { chartToImageUrl } from "../../helpers/figures/charts/chart_ui_common";
import { generateMasterChartConfig } from "../../helpers/figures/charts/runtime/chart_zoom";
import { ChartRuntime, ExcelChartDefinition } from "../../types/chart/chart";
import {
  Command,
  invalidateCFEvaluationCommands,
  invalidateChartEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { Color, UID } from "../../types/misc";
import { Range } from "../../types/range";
import { ColorThemeName } from "../../types/rendering";
import { ExcelWorkbookData, FigureData } from "../../types/workbook_data";
import { EvaluationPlugin } from "../evaluation_plugin";

interface EvaluationChartStyle {
  background: Color;
  fontColor: Color;
}

interface EvaluationChartState {
  charts: Record<UID, Partial<Record<ColorThemeName, ChartRuntime | undefined>>>;
}

export class EvaluationChartPlugin extends EvaluationPlugin<EvaluationChartState> {
  static getters = ["getStyleOfSingleCellChart", "getChartRuntimeWithTheme"] as const;

  charts: Record<UID, Partial<Record<ColorThemeName, ChartRuntime | undefined>>> = {};

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      invalidateCFEvaluationCommands.has(cmd.type) ||
      invalidateChartEvaluationCommands.has(cmd.type)
    ) {
      for (const chartId in this.charts) {
        this.charts[chartId] = {};
      }
    }

    switch (cmd.type) {
      case "UPDATE_CHART":
      case "CREATE_CHART":
        this.charts[cmd.chartId] = {};
        break;
      case "DELETE_CHART":
        this.charts[cmd.chartId] = {};
        break;
      case "DELETE_SHEET":
        for (const chartId in this.charts) {
          if (!this.getters.isChartDefined(chartId)) {
            this.charts[chartId] = {};
          }
        }
        break;
    }
  }

  getChartRuntimeWithTheme(chartId: UID, colorThemeName: ColorThemeName): ChartRuntime {
    if (!this.charts[chartId]) {
      this.charts[chartId] = {};
    }
    if (!this.charts[chartId][colorThemeName]) {
      const chart = this.getters.getChart(chartId);
      if (!chart) {
        throw new Error(`No chart for the given id: ${chartId}`);
      }
      this.charts[chartId][colorThemeName] = this.createRuntimeChart(
        chartId,
        chart,
        colorThemeName
      );
    }
    return this.charts[chartId][colorThemeName] as ChartRuntime;
  }

  /**
   * Get the background and textColor of a chart based on the color of the first cell of the main range of the chart.
   */
  getStyleOfSingleCellChart(
    chartBackground: Color | undefined,
    mainRange: Range | undefined,
    colorThemeName: ColorThemeName
  ): EvaluationChartStyle {
    const themeBackground = COLOR_THEMES[colorThemeName].backgroundColor;
    if (chartBackground) {
      return { background: chartBackground, fontColor: chartFontColor(chartBackground) };
    }
    if (!mainRange) {
      return {
        background: themeBackground,
        fontColor: chartFontColor(themeBackground),
      };
    }
    const col = mainRange.zone.left;
    const row = mainRange.zone.top;
    const sheetId = mainRange.sheetId;
    const style = this.getters.getCellComputedStyle({ sheetId, col, row });
    const background = style.fillColor || themeBackground;
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
          // Export excel should always export its chart using light theme.
          const runtime = this.getChartRuntimeWithTheme(chartId, "light");
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

  private createRuntimeChart(
    chartId: UID,
    chart: SpreadsheetChart,
    colorThemeName: ColorThemeName
  ): ChartRuntime {
    const definition = chart.getRangeDefinition();
    const runtime = chart.getRuntime(this.getters, chartId, colorThemeName);
    if ("chartJsConfig" in runtime && /line|combo|bar|scatter|waterfall/.test(definition.type)) {
      const chartJsConfig = runtime.chartJsConfig as ChartConfiguration<any>;
      runtime["masterChartConfig"] = generateMasterChartConfig(chartJsConfig);
    }
    return runtime;
  }
}
