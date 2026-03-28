import { BACKGROUND_CHART_COLOR } from "../../constants";
import { chartFontColor } from "../../helpers/figures/charts/chart_common";
import { chartRuntimeFactory } from "../../helpers/figures/charts/chart_factory";
import { chartToImageUrl } from "../../helpers/figures/charts/chart_ui_common";
import { overlap } from "../../helpers/zones";
import { ChartRuntime, ExcelChartDefinition } from "../../types/chart";
import {
  CoreViewCommand,
  invalidateCFEvaluationCommands,
  invalidateEvaluationCommands,
} from "../../types/commands";
import { Color, UID, Zone } from "../../types/misc";
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

  handle(cmd: CoreViewCommand) {
    // Commands that require full invalidation of all chart runtimes
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      (invalidateCFEvaluationCommands.has(cmd.type) && cmd.type !== "EVALUATE_CELLS") ||
      cmd.type === "EVALUATE_CHARTS"
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
      // Selectively invalidate only charts whose data ranges overlap the hidden/shown headers
      case "HIDE_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS": {
        const nRows = this.getters.getNumberRows(cmd.sheetId);
        const nCols = this.getters.getNumberCols(cmd.sheetId);
        for (const element of cmd.elements) {
          const zone: Zone =
            cmd.dimension === "COL"
              ? { left: element, right: element, top: 0, bottom: nRows - 1 }
              : { left: 0, right: nCols - 1, top: element, bottom: element };
          this.invalidateChartsOverlappingZone(cmd.sheetId, zone);
        }
        break;
      }
      // Selectively invalidate only charts whose data ranges overlap the grouped header range
      case "GROUP_HEADERS":
      case "UNGROUP_HEADERS":
      case "FOLD_HEADER_GROUP":
      case "UNFOLD_HEADER_GROUP": {
        const nRows = this.getters.getNumberRows(cmd.sheetId);
        const nCols = this.getters.getNumberCols(cmd.sheetId);
        const zone: Zone =
          cmd.dimension === "COL"
            ? { left: cmd.start, right: cmd.end, top: 0, bottom: nRows - 1 }
            : { left: 0, right: nCols - 1, top: cmd.start, bottom: cmd.end };
        this.invalidateChartsOverlappingZone(cmd.sheetId, zone);
        break;
      }
      // All header groups in a dimension are folded/unfolded: treat as the entire sheet on that sheet
      case "FOLD_ALL_HEADER_GROUPS":
      case "UNFOLD_ALL_HEADER_GROUPS": {
        const nRows = this.getters.getNumberRows(cmd.sheetId);
        const nCols = this.getters.getNumberCols(cmd.sheetId);
        this.invalidateChartsOverlappingZone(cmd.sheetId, {
          left: 0,
          right: nCols - 1,
          top: 0,
          bottom: nRows - 1,
        });
        break;
      }
      // Selectively invalidate only charts whose data ranges overlap the zone's columns/rows
      case "FOLD_HEADER_GROUPS_IN_ZONE":
      case "UNFOLD_HEADER_GROUPS_IN_ZONE": {
        const nRows = this.getters.getNumberRows(cmd.sheetId);
        const nCols = this.getters.getNumberCols(cmd.sheetId);
        const zone: Zone =
          cmd.dimension === "COL"
            ? { left: cmd.zone.left, right: cmd.zone.right, top: 0, bottom: nRows - 1 }
            : { left: 0, right: nCols - 1, top: cmd.zone.top, bottom: cmd.zone.bottom };
        this.invalidateChartsOverlappingZone(cmd.sheetId, zone);
        break;
      }
      // Selectively invalidate only charts whose data ranges overlap the updated table zone
      case "UPDATE_TABLE":
        this.invalidateChartsOverlappingZone(cmd.sheetId, cmd.zone);
        break;
      // Selectively invalidate only charts whose data ranges overlap the filter's table zone
      case "UPDATE_FILTER": {
        const table = this.getters.getCoreTable({
          sheetId: cmd.sheetId,
          col: cmd.col,
          row: cmd.row,
        });
        if (table) {
          this.invalidateChartsOverlappingZone(cmd.sheetId, table.range.zone);
        }
        break;
      }
    }
  }

  finalize() {
    const lastEvaluated = this.getters.getLastEvaluatedRanges();

    if (lastEvaluated === null) {
      // Full re-evaluation: invalidate all chart runtimes
      for (const chartId in this.charts) {
        this.charts[chartId] = undefined;
      }
      return;
    }

    if (lastEvaluated.length === 0) {
      return;
    }

    for (const chartId in this.charts) {
      if (this.charts[chartId] === undefined) {
        continue;
      }
      const chart = this.getters.getChart(chartId);
      if (!chart) {
        continue;
      }
      const isDirty = chart
        .getDataRanges()
        .some((chartRange) =>
          lastEvaluated.some(
            (evalRange) =>
              evalRange.sheetId === chartRange.sheetId && overlap(evalRange.zone, chartRange.zone)
          )
        );
      if (isDirty) {
        this.charts[chartId] = undefined;
      }
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

  private invalidateChartsOverlappingZone(sheetId: UID, zone: Zone) {
    for (const chartId in this.charts) {
      if (this.charts[chartId] === undefined) {
        continue;
      }
      const chart = this.getters.getChart(chartId);
      if (!chart) {
        continue;
      }
      const isDirty = chart
        .getDataRanges()
        .some((chartRange) => chartRange.sheetId === sheetId && overlap(chartRange.zone, zone));
      if (isDirty) {
        this.charts[chartId] = undefined;
      }
    }
  }
}
