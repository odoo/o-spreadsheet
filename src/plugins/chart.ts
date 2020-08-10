import {
  Command,
  LAYERS,
  ChartDefinition,
  WorkbookData,
  CreateChartDefinition,
  DataSet,
  Zone,
  CommandResult,
  CancelledReason,
} from "../types/index";
import { ChartConfiguration } from "chart.js";
import { BasePlugin } from "../base_plugin";
import { isInside, toXC, toZone, zoneToXc } from "../helpers/index";
import { rangeReference } from "../formulas/parser";

/**
 * Chart plugin
 *
 * This plugin creates and displays charts
 * */

// the same colors as defined in the the composer colors, except at 30% transparency

import { colors } from "../helpers/color";

const GraphColors = colors.map((c) => {
  return `rgba(${parseInt(c.slice(1, 3), 16)},
  ${parseInt(c.slice(3, 5), 16)},
  ${parseInt(c.slice(5, 7), 16)}, 0.3)`.replace(/\s/g, "");
});

export class ChartPlugin extends BasePlugin {
  static getters = ["getChartRuntime"];
  static layers = [LAYERS.Chart];

  private chartFigures: Set<string> = new Set();

  // contains the configuration of the chart with it's values like they should be displayed,
  // as well as all the options needed for the chart library to work correctly
  private chartRuntime: { [figureId: string]: ChartConfiguration } = {};
  private outOfDate: Set<string> = new Set<string>();

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
          sheet: cmd.sheetId,
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

        this.history.updateLocalState(["chartFigures"], new Set(this.chartFigures).add(cmd.id));
        this.history.updateLocalState(
          ["chartRuntime", cmd.id],
          this.mapDefinitionToRuntime(chartDefinition)
        );
        break;
      case "UPDATE_CHART": {
        const chartDefinition = this.createChartDefinition(
          cmd.definition,
          this.getChartDefinition(cmd.id).sheetId
        );
        this.dispatch("UPDATE_FIGURE", {
          id: cmd.id,
          data: chartDefinition,
        });
        this.history.updateLocalState(
          ["chartRuntime", cmd.id],
          this.mapDefinitionToRuntime(chartDefinition)
        );
        break;
      }
      case "DELETE_FIGURE":
        if (this.chartFigures.has(cmd.id)) {
          const figures = new Set(this.chartFigures);
          figures.delete(cmd.id);
          this.history.updateLocalState(["chartFigures"], figures);
          this.history.updateLocalState(["chartRuntime", cmd.id], undefined);
        }
        break;
      case "UPDATE_CELL":
        for (let chartId of this.chartFigures) {
          const chart = this.getChartDefinition(chartId);
          if (this.isCellUsedInChart(chart, cmd.col, cmd.row)) {
            this.outOfDate.add(chartId);
          }
        }
        break;
    }
  }

  finalize(cmd: Command) {
    switch (cmd.type) {
      case "EVALUATE_CELLS":
      case "START":
        // if there was an async evaluation of cell, there is no way to know which was updated so all charts must be updated
        for (let id in this.chartRuntime) {
          this.outOfDate.add(id);
        }
        break;
    }
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      for (let f of sheet.figures) {
        if (f.tag === "chart") {
          this.outOfDate.add(f.id);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  getChartRuntime(figureId: string): ChartConfiguration | undefined {
    if (this.outOfDate.has(figureId)) {
      this.chartRuntime[figureId] = this.mapDefinitionToRuntime(this.getChartDefinition(figureId));
      this.outOfDate.delete(figureId);
    }
    return this.chartRuntime[figureId];
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private getChartDefinition(figureId: string): ChartDefinition {
    return this.getters.getFigure<ChartDefinition>(figureId).data;
  }

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

  private mapDefinitionToRuntime(definition: ChartDefinition): ChartConfiguration {
    let runtime: ChartConfiguration = {
      type: definition.type,
      options: {
        // https://www.chartjs.org/docs/latest/general/responsive.html
        responsive: true, // will resize when its container is resized
        maintainAspectRatio: false, // doesn't maintain the aspect ration (width/height =2 by default) so the user has the choice of the exact layout

        animation: {
          duration: 0, // general animation time
        },
        hover: {
          animationDuration: 0, // duration of animations when hovering an item
        },
        responsiveAnimationDuration: 0, // animation duration after a resize
        title: {
          display: true,
          text: definition.title,
        },
      },
      data: {
        labels:
          definition.labelRange !== ""
            ? this.getters
                .getRangeFormattedValues(definition.labelRange, definition.sheetId)
                .flat(1)
            : [],
        datasets: [],
      },
    };

    let graphColorIndex = 0;
    for (const ds of definition.dataSets) {
      const dataset = {
        label: ds.labelCell ? this.getters.evaluateFormula(ds.labelCell, definition.sheetId) : "",
        data: ds.dataRange
          ? this.getters.getRangeValues(ds.dataRange, definition.sheetId).flat(1)
          : [],
        lineTension: 0, // 0 -> render straight lines, which is much faster
        backgroundColor: GraphColors[graphColorIndex],
      };
      graphColorIndex = ++graphColorIndex % GraphColors.length;
      runtime.data!.datasets!.push(dataset);
    }

    return runtime;
  }

  private isCellUsedInChart(chart: ChartDefinition, col: number, row: number): boolean {
    if (isInside(col, row, toZone(chart.labelRange))) {
      return true;
    }
    for (let db of chart.dataSets) {
      if (db.dataRange && db.dataRange.length > 0 && isInside(col, row, toZone(db.dataRange))) {
        return true;
      }
      if (db.labelCell && db.labelCell.length > 0 && isInside(col, row, toZone(db.labelCell))) {
        return true;
      }
    }
    return false;
  }
}
