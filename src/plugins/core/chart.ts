import {
  Command,
  ChartDefinition,
  CreateChartDefinition,
  DataSet,
  Zone,
  CommandResult,
  CancelledReason,
} from "../../types/index";
import { toXC, toZone, zoneToXc } from "../../helpers/index";
import { rangeReference } from "../../formulas/parser";
import { CorePlugin } from "../core_plugin";

/**
 * Chart plugin
 *
 * This plugin creates and displays charts
 * */

interface ChartState {
  readonly chartFigures: Set<string>;
}

export class ChartPlugin extends CorePlugin<ChartState> implements ChartState {
  static getters = ["getChartDefinition"];

  readonly chartFigures = new Set<string>();

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
            data: chartDefinition,
            x: 0,
            y: 0,
            height: 500,
            width: 800,
            tag: "chart",
          },
        });
        this.history.update("chartFigures", new Set(this.chartFigures).add(cmd.id));
        break;
      case "UPDATE_CHART": {
        const chartDefinition = this.getChartDefinition(cmd.id);
        if (chartDefinition === undefined) {
          break;
        }
        const newChartDefinition = this.createChartDefinition(
          cmd.definition,
          chartDefinition.sheetId
        );
        this.dispatch("UPDATE_FIGURE", {
          id: cmd.id,
          data: newChartDefinition,
        });
        break;
      }
      case "DELETE_FIGURE":
        if (this.chartFigures.has(cmd.id)) {
          const figures = new Set(this.chartFigures);
          figures.delete(cmd.id);
          this.history.update("chartFigures", figures);
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getChartDefinition(figureId: string): ChartDefinition | undefined {
    const figure = this.getters.getFigure<ChartDefinition>(figureId);
    return figure ? figure.data : undefined;
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
