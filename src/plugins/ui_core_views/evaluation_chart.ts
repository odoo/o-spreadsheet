import { ChartConfiguration } from "chart.js";
import { SpreadsheetChart } from "../../helpers/figures/chart";
import { chartFontColor } from "../../helpers/figures/charts/chart_common";
import { chartToImageUrl } from "../../helpers/figures/charts/chart_ui_common";
import { generateMasterChartConfig } from "../../helpers/figures/charts/runtime/chart_zoom";
import { isDefined } from "../../helpers/misc";
import { isInside, overlap } from "../../helpers/zones";
import { ChartRuntime, ExcelChartDefinition } from "../../types/chart/chart";
import {
  CoreViewCommand,
  invalidateCFEvaluationCommands,
  invalidateChartEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { Color, UID } from "../../types/misc";
import { BoundedRange, Range } from "../../types/range";
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

  handle(cmd: CoreViewCommand) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      invalidateCFEvaluationCommands.has(cmd.type) ||
      (invalidateChartEvaluationCommands.has(cmd.type) && cmd.type !== "UPDATE_CELL")
    ) {
      for (const chartId in this.charts) {
        this.charts[chartId] = undefined;
      }
    }

    switch (cmd.type) {
      case "UPDATE_CELL":
        this.invalidateChartsAffectedByCell(cmd.sheetId, cmd.col, cmd.row);
        break;
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

  private invalidateChartsAffectedByCell(sheetId: UID, col: number, row: number): void {
    if (!Object.values(this.charts).some(isDefined)) {
      return;
    }
    const dependents = [...this.getters.getCellsDependingOn({ sheetId, col, row })];
    for (const chartId in this.charts) {
      if (this.charts[chartId] === undefined) {
        continue;
      }
      if (this.chartIsAffectedByCell(chartId, sheetId, col, row, dependents)) {
        this.charts[chartId] = undefined;
      }
    }
  }

  private chartIsAffectedByCell(
    chartId: UID,
    sheetId: UID,
    col: number,
    row: number,
    dependents: BoundedRange[]
  ): boolean {
    const chart = this.getters.getChart(chartId);
    if (!chart) {
      return false;
    }
    const chartRanges = chart.getRanges();
    for (const r of chartRanges) {
      if (r.sheetId === sheetId && isInside(col, row, r.zone)) {
        return true;
      }
      for (const dep of dependents) {
        if (r.sheetId === dep.sheetId && overlap(dep.zone, r.zone)) {
          return true;
        }
      }
    }
    return false;
  }

  getChartRuntime(chartId: UID): ChartRuntime {
    if (!this.charts[chartId]) {
      const chart = this.getters.getChart(chartId);
      if (!chart) {
        throw new Error(`No chart for the given id: ${chartId}`);
      }
      this.charts[chartId] = this.createRuntimeChart(chartId, chart);
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
    const themeBackground = this.getters.getSpreadsheetTheme().backgroundColor;
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

  private createRuntimeChart(chartId: UID, chart: SpreadsheetChart): ChartRuntime {
    const definition = chart.getRangeDefinition();
    const runtime = chart.getRuntime(this.getters, chartId);
    if ("chartJsConfig" in runtime && /line|combo|bar|scatter|waterfall/.test(definition.type)) {
      const chartJsConfig = runtime.chartJsConfig as ChartConfiguration<any>;
      runtime["masterChartConfig"] = generateMasterChartConfig(chartJsConfig);
    }
    return runtime;
  }
}
