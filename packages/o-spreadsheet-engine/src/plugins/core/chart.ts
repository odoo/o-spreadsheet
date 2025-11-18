import { DEFAULT_FIGURE_HEIGHT, DEFAULT_FIGURE_WIDTH, FIGURE_ID_SPLITTER } from "../../constants";
import { AbstractChart } from "../../helpers/figures/charts/abstract_chart";
import { chartFactory, validateChartDefinition } from "../../helpers/figures/charts/chart_factory";
import { deepEquals } from "../../helpers/misc";
import { ChartCreationContext, ChartDefinition, ChartType } from "../../types/chart";
import {
  Command,
  CommandResult,
  CoreCommand,
  CreateChartCommand,
  DeleteChartCommand,
  UpdateChartCommand,
} from "../../types/commands";
import {
  AdaptSheetName,
  ApplyRangeChange,
  HeaderIndex,
  PixelPosition,
  UID,
} from "../../types/misc";
import { DOMDimension } from "../../types/rendering";
import { FigureData, WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

interface FigureChart {
  figureId: UID;
  chart: AbstractChart;
}

interface ChartState {
  readonly charts: Record<UID, FigureChart | undefined>;
}

export class ChartPlugin extends CorePlugin<ChartState> implements ChartState {
  static getters = [
    "isChartDefined",
    "getChartDefinition",
    "getChartType",
    "getChartIds",
    "getChart",
    "getFigureIdFromChartId",
    "getContextCreationChart",
  ] as const;

  readonly charts: Record<UID, FigureChart | undefined> = {};

  private createChart = chartFactory(this.getters);
  private validateChartDefinition = (cmd: CreateChartCommand | UpdateChartCommand) =>
    validateChartDefinition(this, cmd.definition);

  adaptRanges(applyChange: ApplyRangeChange, sheetId: UID, adaptSheetName: AdaptSheetName) {
    for (const [chartId, chart] of Object.entries(this.charts)) {
      if (!chart) {
        continue;
      }
      const newChart = chart.chart.updateRanges(applyChange, sheetId, adaptSheetName);
      this.history.update(
        "charts",
        chartId,
        newChart ? { figureId: chart.figureId, chart: newChart } : undefined
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_CHART":
        return this.checkValidations(
          cmd,
          this.chainValidations(
            this.checkFigureArguments,
            this.validateChartDefinition,
            this.checkChartDuplicate
          )
        );
      case "UPDATE_CHART":
        return this.checkValidations(
          cmd,
          this.chainValidations(
            this.validateChartDefinition,
            this.checkChartExists,
            this.checkChartChanged
          )
        );
      case "DELETE_CHART":
        return this.checkChartExists(cmd);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_CHART":
        const { col, row, offset, size, sheetId, figureId } = cmd;
        // If figure position is not defined, it means that the figure already exist (see allowDispatch)
        if (
          !this.getters.getFigure(sheetId, figureId) &&
          offset !== undefined &&
          col !== undefined &&
          row !== undefined
        ) {
          this.addFigure(figureId, sheetId, col, row, offset, size);
        }
        this.addChart(cmd.figureId, cmd.chartId, cmd.definition);
        break;
      case "UPDATE_CHART": {
        this.addChart(cmd.figureId, cmd.chartId, cmd.definition);
        break;
      }
      case "DUPLICATE_SHEET": {
        for (const chartId of this.getChartIds(cmd.sheetId)) {
          const { chart, figureId } = this.charts[chartId] || {};
          if (!chart || !figureId) {
            continue;
          }
          const fig = this.getters.getFigure(cmd.sheetId, figureId);
          if (!fig) {
            continue;
          }
          const figureIdBase = figureId.split(FIGURE_ID_SPLITTER).pop();
          const duplicatedFigureId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${figureIdBase}`;
          const chartIdBase = chartId.split(FIGURE_ID_SPLITTER).pop();
          const duplicatedChartId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${chartIdBase}`;
          const newChart = chart.duplicateInDuplicatedSheet(cmd.sheetIdTo);
          if (newChart) {
            this.dispatch("CREATE_CHART", {
              figureId: duplicatedFigureId,
              chartId: duplicatedChartId,
              col: fig.col,
              row: fig.row,
              offset: fig.offset,
              size: { width: fig.width, height: fig.height },
              definition: newChart.getDefinition(),
              sheetId: cmd.sheetIdTo,
            });
          }
        }
        break;
      }
      case "DELETE_FIGURE":
        for (const chartId in this.charts) {
          if (this.charts[chartId]?.figureId === cmd.figureId) {
            this.dispatch("DELETE_CHART", { chartId, sheetId: cmd.sheetId });
          }
        }
        break;
      case "DELETE_CHART":
        if (this.isChartDefined(cmd.chartId)) {
          this.history.update("charts", cmd.chartId, undefined);
        }
        break;
      case "DELETE_SHEET":
        for (const id of this.getChartIds(cmd.sheetId)) {
          this.history.update("charts", id, undefined);
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getContextCreationChart(chartId: UID): ChartCreationContext | undefined {
    return this.charts[chartId]?.chart.getContextCreation();
  }

  getChart(chartId: UID): AbstractChart | undefined {
    return this.charts[chartId]?.chart;
  }

  getFigureIdFromChartId(chartId: UID): UID {
    if (!this.charts[chartId]) {
      throw new Error(`Chart with id ${chartId} does not exist.`);
    }
    return this.charts[chartId].figureId;
  }

  getChartType(chartId: UID): ChartType {
    const type = this.charts[chartId]?.chart.type;
    if (!type) {
      throw new Error("Chart not defined.");
    }
    return type;
  }

  isChartDefined(chartId: UID): boolean {
    return chartId in this.charts && this.charts !== undefined;
  }

  getChartIds(sheetId: UID) {
    return Object.entries(this.charts)
      .filter(([, chart]) => chart?.chart.sheetId === sheetId)
      .map(([id]) => id);
  }

  getChartDefinition(chartId: UID): ChartDefinition {
    const definition = this.charts[chartId]?.chart.getDefinition();
    if (!definition) {
      throw new Error(`There is no chart with the given id: ${chartId}`);
    }
    return definition;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      if (sheet.figures) {
        for (const figure of sheet.figures) {
          // TODO:
          // figure data should be external IMO => chart should be in sheet.chart
          // instead of in figure.data
          if (figure.tag === "chart") {
            const chartId = figure.data.chartId;
            const definition = { ...figure.data };
            delete definition.chartId;
            const chart = this.createChart(figure.id, definition, sheet.id);
            this.charts[chartId] = { chart, figureId: figure.id };
          } else if (figure.tag === "carousel") {
            for (const chartId in figure.data.chartDefinitions || {}) {
              const chartDefinition = figure.data.chartDefinitions[chartId];
              const chart = this.createChart(figure.id, chartDefinition, sheet.id);
              this.charts[chartId] = { chart, figureId: figure.id };
            }
          }
        }
      }
    }
  }

  export(data: WorkbookData) {
    if (data.sheets) {
      for (const sheet of data.sheets) {
        // TODO This code is false, if two plugins want to insert figures on the sheet, it will crash !
        const sheetFigures = this.getters.getFigures(sheet.id);
        const figures: FigureData<any>[] = [];
        for (const sheetFigure of sheetFigures) {
          const figure = sheetFigure as FigureData<any>;
          const chartId = Object.keys(this.charts).find(
            (chartId) => this.charts[chartId]?.figureId === sheetFigure.id
          );
          if (figure && figure.tag === "chart" && chartId) {
            const data = this.charts[chartId]?.chart.getDefinition();
            if (data) {
              figure.data = { ...data, chartId };
              figures.push(figure);
            }
          } else if (figure && figure.tag === "carousel") {
            const chartIds = Object.keys(this.charts).filter(
              (chartId) => this.charts[chartId]?.figureId === sheetFigure.id
            );
            const data = {};
            for (const chartId of chartIds) {
              data[chartId] = this.charts[chartId]?.chart.getDefinition();
            }
            figure.data = { chartDefinitions: data };
            figures.push(figure);
          } else {
            figures.push(figure);
          }
        }
        sheet.figures = figures;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Add a figure with tag chart with the given id at the given position
   */
  private addFigure(
    figureId: UID,
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    offset: PixelPosition,
    size: DOMDimension = {
      width: DEFAULT_FIGURE_WIDTH,
      height: DEFAULT_FIGURE_HEIGHT,
    }
  ) {
    this.dispatch("CREATE_FIGURE", {
      sheetId,
      figureId,
      col,
      row,
      offset,
      size,
      tag: "chart",
    });
  }

  /**
   * Add a chart in the local state. If a chart already exists, this chart is
   * replaced
   */
  private addChart(figureId: UID, chartId: UID, definition: ChartDefinition) {
    const sheetId = this.getters.getFigureSheetId(figureId);
    if (sheetId) {
      const chart = this.createChart(figureId, definition, sheetId);
      this.history.update("charts", chartId, { figureId, chart });
    }
  }

  private checkChartDuplicate(cmd: CreateChartCommand): CommandResult {
    return this.isChartDefined(cmd.chartId)
      ? CommandResult.DuplicatedChartId
      : CommandResult.Success;
  }

  private checkChartExists(
    cmd: UpdateChartCommand | CreateChartCommand | DeleteChartCommand
  ): CommandResult {
    return this.isChartDefined(cmd.chartId)
      ? CommandResult.Success
      : CommandResult.ChartDoesNotExist;
  }

  private checkChartChanged(cmd: UpdateChartCommand): CommandResult {
    if (cmd.figureId !== this.charts[cmd.chartId]?.figureId) {
      return CommandResult.Success;
    }
    return deepEquals(this.getChartDefinition(cmd.chartId), cmd.definition)
      ? CommandResult.NoChanges
      : CommandResult.Success;
  }

  /** If the command is meant to create a new figure, the position & offset argument need to be defined in the command */
  private checkFigureArguments(cmd: CreateChartCommand): CommandResult {
    if (this.getters.getFigure(cmd.sheetId, cmd.figureId)) {
      return CommandResult.Success;
    }

    return cmd.offset !== undefined && cmd.col !== undefined && cmd.row !== undefined
      ? CommandResult.Success
      : CommandResult.MissingFigureArguments;
  }
}
