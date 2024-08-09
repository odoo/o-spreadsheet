import { DEFAULT_FIGURE_HEIGHT, DEFAULT_FIGURE_WIDTH, FIGURE_ID_SPLITTER } from "../../constants";
import { AbstractChart } from "../../helpers/figures/charts/abstract_chart";
import { chartFactory, validateChartDefinition } from "../../helpers/figures/charts/chart_factory";
import { ChartCreationContext, ChartDefinition, ChartType } from "../../types/chart/chart";
import {
  ApplyRangeChange,
  Command,
  CommandResult,
  CoreCommand,
  CreateChartCommand,
  DOMCoordinates,
  DOMDimension,
  Figure,
  FigureData,
  Range,
  UID,
  UpdateChartCommand,
  WorkbookData,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

/**
 * Chart plugin
 *
 * This plugin manages charts
 * */

interface ChartState {
  readonly charts: Record<UID, AbstractChart | undefined>;
}

export class ChartPlugin extends CorePlugin<ChartState> implements ChartState {
  static getters = [
    "isChartDefined",
    "getChartDefinition",
    "getChartType",
    "getChartIds",
    "getChart",
    "getContextCreationChart",
  ] as const;

  readonly charts: Record<UID, AbstractChart | undefined> = {};

  private createChart = chartFactory(this.getters);
  private validateChartDefinition = (cmd: CreateChartCommand | UpdateChartCommand) =>
    validateChartDefinition(this, cmd.definition);

  adaptRanges(applyChange: ApplyRangeChange) {
    for (const [chartId, chart] of Object.entries(this.charts)) {
      this.history.update("charts", chartId, chart?.updateRanges(applyChange));
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
          this.chainValidations(this.validateChartDefinition, this.checkChartExists)
        );
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_CHART":
        this.addFigure(cmd.id, cmd.sheetId, cmd.position, cmd.size);
        this.addChart(cmd.id, cmd.definition);
        break;
      case "UPDATE_CHART": {
        this.addChart(cmd.id, cmd.definition);
        break;
      }
      case "DUPLICATE_SHEET": {
        const sheetFiguresFrom = this.getters.getFigures(cmd.sheetId);
        for (const fig of sheetFiguresFrom) {
          if (fig.tag === "chart") {
            const figureIdBase = fig.id.split(FIGURE_ID_SPLITTER).pop();
            const duplicatedFigureId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${figureIdBase}`;
            const chart = this.charts[fig.id]?.copyForSheetId(cmd.sheetIdTo);
            if (chart) {
              this.dispatch("CREATE_CHART", {
                id: duplicatedFigureId,
                position: { x: fig.x, y: fig.y },
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
        this.history.update("charts", cmd.id, undefined);
        break;
      case "DELETE_SHEET":
        for (let id of this.getChartIds(cmd.sheetId)) {
          this.history.update("charts", id, undefined);
        }
        break;
      case "MOVE_REFERENCES": {
        const target = { sheetId: cmd.targetSheetId, col: cmd.targetCol, row: cmd.targetRow };
        const adaptRange = (range: Range) =>
          this.getters.moveRangeInsideZone(range, cmd.sheetId, cmd.zone, target);
        for (const [chartId, chart] of Object.entries(this.charts)) {
          this.history.update("charts", chartId, chart?.updateRanges(adaptRange));
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getContextCreationChart(figureId: UID): ChartCreationContext | undefined {
    return this.charts[figureId]?.getContextCreation();
  }

  getChart(figureId: UID): AbstractChart | undefined {
    return this.charts[figureId];
  }

  getChartType(figureId: UID): ChartType {
    const type = this.charts[figureId]?.type;
    if (!type) {
      throw new Error("Chart not defined.");
    }
    return type;
  }

  isChartDefined(figureId: UID): boolean {
    return figureId in this.charts && this.charts !== undefined;
  }

  getChartIds(sheetId: UID) {
    return Object.entries(this.charts)
      .filter(([, chart]) => chart?.sheetId === sheetId)
      .map(([id]) => id);
  }

  getChartDefinition(figureId: UID): ChartDefinition {
    const definition = this.charts[figureId]?.getDefinition();
    if (!definition) {
      throw new Error(`There is no chart with the given figureId: ${figureId}`);
    }
    return definition;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      if (sheet.figures) {
        for (let figure of sheet.figures) {
          // TODO:
          // figure data should be external IMO => chart should be in sheet.chart
          // instead of in figure.data
          if (figure.tag === "chart") {
            this.charts[figure.id] = this.createChart(figure.id, figure.data, sheet.id);
          }
        }
      }
    }
  }

  export(data: WorkbookData) {
    if (data.sheets) {
      for (let sheet of data.sheets) {
        // TODO This code is false, if two plugins want to insert figures on the sheet, it will crash !
        const sheetFigures = this.getters.getFigures(sheet.id);
        const figures: FigureData<any>[] = [];
        for (let sheetFigure of sheetFigures) {
          const figure = sheetFigure as FigureData<any>;
          if (figure && figure.tag === "chart") {
            const data = this.charts[figure.id]?.getDefinition();
            if (data) {
              figure.data = data;
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
    id: UID,
    sheetId: UID,
    position: DOMCoordinates = { x: 0, y: 0 },
    size: DOMDimension = {
      width: DEFAULT_FIGURE_WIDTH,
      height: DEFAULT_FIGURE_HEIGHT,
    }
  ) {
    if (this.getters.getFigure(sheetId, id)) {
      return;
    }
    const figure: Figure = {
      id,
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      tag: "chart",
    };
    this.dispatch("CREATE_FIGURE", { sheetId, figure });
  }

  /**
   * Add a chart in the local state. If a chart already exists, this chart is
   * replaced
   */
  private addChart(id: UID, definition: ChartDefinition) {
    const sheetId = this.getters.getFigureSheetId(id);
    if (sheetId) {
      this.history.update("charts", id, this.createChart(id, definition, sheetId));
    }
  }

  private checkChartDuplicate(cmd: CreateChartCommand): CommandResult {
    return this.getters.getFigureSheetId(cmd.id)
      ? CommandResult.DuplicatedChartId
      : CommandResult.Success;
  }

  private checkChartExists(cmd: UpdateChartCommand): CommandResult {
    return this.getters.getFigureSheetId(cmd.id)
      ? CommandResult.Success
      : CommandResult.ChartDoesNotExist;
  }
}
