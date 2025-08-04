import { DEFAULT_FIGURE_HEIGHT, DEFAULT_FIGURE_WIDTH, FIGURE_ID_SPLITTER } from "../../constants";
import { deepEquals } from "../../helpers";
import { AbstractChart } from "../../helpers/figures/charts/abstract_chart";
import { chartFactory, validateChartDefinition } from "../../helpers/figures/charts/chart_factory";
import { ChartCreationContext, ChartDefinition, ChartType } from "../../types/chart/chart";
import {
  ApplyRangeChange,
  Command,
  CommandResult,
  CoreCommand,
  CreateChartCommand,
  DOMDimension,
  FigureData,
  HeaderIndex,
  PixelPosition,
  UID,
  UpdateChartCommand,
  WorkbookData,
} from "../../types/index";
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
    "getChartFromFigureId",
    "getChartIdFromFigureId",
    "getFigureIdFromChartId",
    "getContextCreationChart",
  ] as const;

  readonly charts: Record<UID, FigureChart | undefined> = {};

  private createChart = chartFactory(this.getters);
  private validateChartDefinition = (cmd: CreateChartCommand | UpdateChartCommand) =>
    validateChartDefinition(this, cmd.definition);

  adaptRanges(applyChange: ApplyRangeChange) {
    for (const [chartId, chart] of Object.entries(this.charts)) {
      if (!chart) {
        continue;
      }
      const newChart = chart.chart.updateRanges(applyChange);
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
          this.chainValidations(this.validateChartDefinition, this.checkChartDuplicate)
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
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_CHART":
        this.addFigure(cmd.figureId, cmd.sheetId, cmd.col, cmd.row, cmd.offset, cmd.size);
        this.addChart(cmd.figureId, cmd.chartId, cmd.definition);
        break;
      case "UPDATE_CHART": {
        this.addChart(cmd.figureId, cmd.chartId, cmd.definition);
        break;
      }
      case "DUPLICATE_SHEET": {
        const sheetFiguresFrom = this.getters.getFigures(cmd.sheetId);
        for (const fig of sheetFiguresFrom) {
          if (fig.tag === "chart") {
            const figureIdBase = fig.id.split(FIGURE_ID_SPLITTER).pop();
            const duplicatedFigureId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${figureIdBase}`;
            const chart = this.getChartFromFigureId(fig.id)?.duplicateInDuplicatedSheet(
              cmd.sheetIdTo
            );
            if (chart) {
              this.dispatch("CREATE_CHART", {
                figureId: duplicatedFigureId,
                chartId: duplicatedFigureId,
                col: fig.col,
                row: fig.row,
                offset: fig.offset,
                size: { width: fig.width, height: fig.height },
                definition: chart.getDefinition(),
                sheetId: cmd.sheetIdTo,
              });
            }
          }
        }
        break;
      }
      case "DELETE_FIGURE":
        for (const chartId in this.charts) {
          if (this.charts[chartId]?.figureId === cmd.figureId) {
            this.history.update("charts", chartId, undefined);
          }
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

  getChartFromFigureId(figureId: UID): AbstractChart | undefined {
    return Object.values(this.charts).find((chart) => chart?.figureId === figureId)?.chart;
  }

  getChartIdFromFigureId(figureId: UID): UID | undefined {
    return Object.keys(this.charts).find((chartId) => this.charts[chartId]?.figureId === figureId);
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
            const chart = this.createChart(figure.id, figure.data, sheet.id);
            this.charts[chartId] = { chart, figureId: figure.id };
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
          const chartId = this.getters.getChartIdFromFigureId(figure?.id);
          if (figure && figure.tag === "chart" && chartId) {
            const data = this.charts[chartId]?.chart.getDefinition();
            if (data) {
              figure.data = { ...data, chartId };
              figures.push(figure);
            }
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
    if (this.getters.getFigure(sheetId, figureId)) {
      return;
    }
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

  private checkChartExists(cmd: UpdateChartCommand): CommandResult {
    return this.isChartDefined(cmd.chartId)
      ? CommandResult.Success
      : CommandResult.ChartDoesNotExist;
  }

  private checkChartChanged(cmd: UpdateChartCommand): CommandResult {
    return deepEquals(this.getChartDefinition(cmd.chartId), cmd.definition)
      ? CommandResult.NoChanges
      : CommandResult.Success;
  }
}
