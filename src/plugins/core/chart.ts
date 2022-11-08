import { DEFAULT_FIGURE_HEIGHT, DEFAULT_FIGURE_WIDTH } from "../../constants";
import { AbstractChart } from "../../helpers/charts/abstract_chart";
import { chartFactory, validateChartDefinition } from "../../helpers/charts/chart_factory";
import {
  ChartCreationContext,
  ChartDefinition,
  ChartType,
  ExcelChartDefinition,
} from "../../types/chart/chart";
import {
  ApplyRangeChange,
  Command,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  Figure,
  FigureData,
  Pixel,
  UID,
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
  readonly nextId: number;
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
  readonly nextId = 1;

  private createChart = chartFactory(this.getters);
  private validateChartDefinition = (definition: ChartDefinition) =>
    validateChartDefinition(this, definition);

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
      case "UPDATE_CHART":
        return this.validateChartDefinition(cmd.definition);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_CHART":
        this.addFigure(cmd.id, cmd.sheetId, cmd.position, cmd.size);
        this.addChart(cmd.id, cmd.sheetId, cmd.definition);
        break;
      case "UPDATE_CHART": {
        this.addChart(cmd.id, cmd.sheetId, cmd.definition);
        break;
      }
      case "DUPLICATE_SHEET": {
        const sheetFiguresFrom = this.getters.getFigures(cmd.sheetId);
        for (const fig of sheetFiguresFrom) {
          if (fig.tag === "chart") {
            const id = this.nextId.toString();
            this.history.update("nextId", this.nextId + 1);
            const chart = this.charts[fig.id]?.copyForSheetId(cmd.sheetIdTo);
            if (chart) {
              this.dispatch("CREATE_CHART", {
                id,
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
            this.history.update("nextId", this.nextId + 1);
            this.charts[figure.id] = this.createChart(figure.id, figure.data, sheet.id);
          }
        }
      }
    }
  }

  export(data: WorkbookData) {
    if (data.sheets) {
      for (let sheet of data.sheets) {
        // TODO This code is false, if two plugins want ot insert figures on the sheet, it will crash !
        const sheetFigures = this.getters.getFigures(sheet.id);
        const figures = sheetFigures as FigureData<any>[];
        for (let figure of figures) {
          if (figure && figure.tag === "chart") {
            figure.data = this.getChartDefinition(figure.id);
          }
        }
        sheet.figures = figures;
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (let sheet of data.sheets) {
      const sheetFigures = this.getters.getFigures(sheet.id);
      const figures: FigureData<ExcelChartDefinition>[] = [];
      for (let figure of sheetFigures) {
        if (figure && figure.tag === "chart") {
          const figureData = this.charts[figure.id]?.getDefinitionForExcel();
          if (figureData) {
            figures.push({
              ...figure,
              data: figureData,
            });
          }
        }
      }
      sheet.charts = figures;
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
    position: { x: Pixel; y: Pixel } = { x: 0, y: 0 },
    size: { width: Pixel; height: Pixel } = {
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
  private addChart(id: UID, sheetId: UID, definition: ChartDefinition) {
    this.history.update("charts", id, this.createChart(id, definition, sheetId));
  }
}
