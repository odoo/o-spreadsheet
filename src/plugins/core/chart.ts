import { rangeReference } from "../../formulas/parser";
import { toXC, toZone, zoneToXc } from "../../helpers/index";
import {
  CancelledReason,
  ChartDefinition,
  Command,
  CommandResult,
  CreateChartDefinition,
  DataSet,
  FigureData,
  UID,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

/**
 * Chart plugin
 *
 * This plugin creates and displays charts
 * */

interface ChartState {
  readonly chartFigures: Record<UID, ChartDefinition>;
}

export class ChartPlugin extends CorePlugin<ChartState> implements ChartState {
  static getters = ["getChartDefinition"];
  readonly chartFigures = {};

  allowDispatch(cmd: Command): CommandResult {
    const success: CommandResult = { status: "SUCCESS" };
    switch (cmd.type) {
      case "UPDATE_CHART":
      case "CREATE_CHART":
        const invalidRanges =
          cmd.definition.dataSets.find((range) => !rangeReference.test(range.split("!").pop()!)) !==
          undefined;
        const invalidLabels = !rangeReference.test(cmd.definition.labelRange.split("!").pop()!);
        return invalidRanges || invalidLabels
          ? { status: "CANCELLED", reason: CancelledReason.InvalidChartDefinition }
          : success;
      default:
        return success;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CREATE_CHART":
        const chartDefinition = this.createChartDefinition(cmd.definition, cmd.sheetId);
        this.dispatch("CREATE_FIGURE", {
          sheetId: cmd.sheetId,
          figure: {
            id: cmd.id,
            x: 0,
            y: 0,
            height: 500,
            width: 800,
            tag: "chart",
          },
        });
        this.history.update("chartFigures", cmd.id, chartDefinition);
        break;
      case "UPDATE_CHART": {
        const newChartDefinition = this.createChartDefinition(cmd.definition, cmd.sheetId);
        this.history.update("chartFigures", cmd.id, newChartDefinition);
        break;
      }
      case "DELETE_FIGURE":
        const figures = Object.assign({}, this.chartFigures);
        delete figures[cmd.id];
        this.history.update("chartFigures", figures);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getChartDefinition(figureId: UID): ChartDefinition | undefined {
    return this.chartFigures[figureId];
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      if (sheet.figures) {
        for (let figure of sheet.figures) {
          if (figure.tag === "chart") {
            this.chartFigures[figure.id] = figure.data;
          }
        }
      }
    }
  }

  export(data: WorkbookData) {
    if (data.sheets) {
      for (let sheet of data.sheets) {
        const figures = this.getters.getFigures(sheet.id) as FigureData<
          ChartDefinition | undefined
        >[];
        if (figures) {
          for (let figure of figures) {
            const data = this.getChartDefinition(figure.id);
            if (data) {
              figure.data = data;
            }
          }
        }
        sheet.figures = figures;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private createChartDefinition(
    createCommand: CreateChartDefinition,
    sheetId: string
  ): ChartDefinition {
    let dataSets: DataSet[] = [];

    for (let range of createCommand.dataSets) {
      let zone = toZone(range);
      if (zone.left !== zone.right && zone.top !== zone.bottom) {
        // It's a rectangle. We treat all columns (arbitrary) as different data series.
        for (let column = zone.left; column <= zone.right; column++) {
          const columnZone = {
            left: column,
            right: column,
            top: zone.top,
            bottom: zone.bottom,
          };
          dataSets.push(this.createDataset(columnZone, createCommand.seriesHasTitle));
        }
      } else if (zone.left === zone.right && zone.top === zone.bottom) {
        // A single cell. If it's only the title, the dataset is not added.
        if (!createCommand.seriesHasTitle) {
          dataSets.push({ dataRange: zoneToXc(zone) });
        }
      } else {
        dataSets.push(this.createDataset(zone, createCommand.seriesHasTitle));
      }
    }

    return {
      title: createCommand.title,
      type: createCommand.type,
      dataSets: dataSets,
      labelRange: createCommand.labelRange,
      sheetId: sheetId,
    };
  }

  /**
   * Create a chart dataset from a Zone.
   * The zone should be a single column or a single row
   */
  private createDataset(zone: Zone, withTitle: boolean): DataSet {
    if (zone.left !== zone.right && zone.top !== zone.bottom) {
      throw new Error(`Zone should be a single column or row: ${zoneToXc(zone)}`);
    }
    const labelCell = withTitle ? toXC(zone.left, zone.top) : undefined;
    const offset = withTitle ? 1 : 0;
    const isColumn = zone.top !== zone.bottom && zone.left === zone.right;
    const dataRange = zoneToXc({
      top: isColumn ? zone.top + offset : zone.top,
      bottom: zone.bottom,
      left: isColumn ? zone.left : zone.left + offset,
      right: zone.right,
    });
    return { labelCell, dataRange };
  }
}
