import {
  Command,
  ChartDefinition,
  WorkbookData,
  CreateChartDefinition,
  DataSet,
  Zone,
  CommandResult,
  CancelledReason,
  CellUpdatedEvent,
} from "../../types/index";
import { ChartConfiguration, ChartType } from "chart.js";
import { BasePlugin } from "./base_plugin";

import { isInside, toXC, toZone, zoneToXc } from "../../helpers/index";
import { rangeReference } from "../../formulas/parser";
import { chartTerms } from "../../components/side_panel/translations_terms";

/**
 * Chart plugin
 *
 * This plugin creates and displays charts
 * */

const GraphColors = [
  // the same colors as those used in odoo reporting
  "rgb(31,119,180)",
  "rgb(255,127,14)",
  "rgb(174,199,232)",
  "rgb(255,187,120)",
  "rgb(44,160,44)",
  "rgb(152,223,138)",
  "rgb(214,39,40)",
  "rgb(255,152,150)",
  "rgb(148,103,189)",
  "rgb(197,176,213)",
  "rgb(140,86,75)",
  "rgb(196,156,148)",
  "rgb(227,119,194)",
  "rgb(247,182,210)",
  "rgb(127,127,127)",
  "rgb(199,199,199)",
  "rgb(188,189,34)",
  "rgb(219,219,141)",
  "rgb(23,190,207)",
  "rgb(158,218,229)",
];

export class ChartPlugin extends BasePlugin {
  static getters = ["getChartRuntime"];

  private chartFigures: Set<string> = new Set();

  // contains the configuration of the chart with it's values like they should be displayed,
  // as well as all the options needed for the chart library to work correctly
  private chartRuntime: { [figureId: string]: ChartConfiguration } = {};
  private outOfDate: Set<string> = new Set<string>();

  protected registerListener() {
    this.bus.on("cell-updated", this, (event: CellUpdatedEvent) => {
      for (let chartId of this.chartFigures) {
        const chart = this.getChartDefinition(chartId);
        if (this.isCellUsedInChart(chart, event.col, event.row)) {
          this.outOfDate.add(chartId);
        }
      }
    })
  }

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

        this.history.update(["chartFigures"], new Set(this.chartFigures).add(cmd.id));
        this.history.update(["chartRuntime", cmd.id], this.mapDefinitionToRuntime(chartDefinition));
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
        this.history.update(["chartRuntime", cmd.id], this.mapDefinitionToRuntime(chartDefinition));
        break;
      }
      case "DELETE_FIGURE":
        if (this.chartFigures.has(cmd.id)) {
          const figures = new Set(this.chartFigures);
          figures.delete(cmd.id);
          this.history.update(["chartFigures"], figures);
          this.history.update(["chartRuntime", cmd.id], undefined);
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

  private getDefaultConfiguration(
    type: ChartType,
    title: string | undefined,
    labels: string[]
  ): ChartConfiguration {
    const config: ChartConfiguration = {
      type,
      options: {
        // https://www.chartjs.org/docs/latest/general/responsive.html
        responsive: true, // will resize when its container is resized
        maintainAspectRatio: false, // doesn't maintain the aspect ration (width/height =2 by default) so the user has the choice of the exact layout
        layout: { padding: { left: 20, right: 20, top: 10, bottom: 10 } },
        elements: {
          line: {
            fill: false, // do not fill the area under line charts
          },
          point: {
            hitRadius: 15, // increased hit radius to display point tooltip when hovering nearby
          },
        },
        animation: {
          duration: 0, // general animation time
        },
        hover: {
          animationDuration: 10, // duration of animations when hovering an item
        },
        responsiveAnimationDuration: 0, // animation duration after a resize
        title: {
          display: true,
          fontSize: 22,
          fontStyle: "normal",
          text: title,
        },
      },
      data: {
        labels,
        datasets: [],
      },
    };

    if (type !== "pie") {
      config.options!.scales = {
        xAxes: [
          {
            ticks: {
              // x axis configuration
              maxRotation: 60,
              minRotation: 15,
              padding: 5,
              labelOffset: 2,
            },
          },
        ],
        yAxes: [
          {
            ticks: {
              // y axis configuration
              beginAtZero: true, // the origin of the y axis is always zero
            },
          },
        ],
      };
    }
    return config;
  }

  private mapDefinitionToRuntime(definition: ChartDefinition): ChartConfiguration {
    const labels =
      definition.labelRange !== ""
        ? this.getters.getRangeFormattedValues(definition.labelRange, definition.sheetId).flat(1)
        : [];
    const runtime = this.getDefaultConfiguration(definition.type, definition.title, labels);

    let graphColorIndex = 0;
    for (const ds of definition.dataSets) {
      let label;
      if (ds.labelCell) {
        try {
          label = this.getters.evaluateFormula(ds.labelCell, definition.sheetId);
        } catch (e) {
          // We want here to catch issue linked to async formula
          label = chartTerms.Series;
        }
      } else {
        label = chartTerms.Series;
      }
      const dataset = {
        label,
        data: ds.dataRange
          ? this.getters.getRangeValues(ds.dataRange, definition.sheetId).flat(1)
          : [],
        lineTension: 0, // 0 -> render straight lines, which is much faster
        borderColor: definition.type !== "pie" ? GraphColors[graphColorIndex] : "#FFFFFF", // white border for pie chart
        backgroundColor: GraphColors[graphColorIndex],
      };
      if (definition.type === "pie") {
        const colors: string[] = [];
        for (let i = 0; i <= dataset.data.length - 1; i++) {
          colors.push(GraphColors[graphColorIndex]);
          graphColorIndex = ++graphColorIndex % GraphColors.length;
        }
        // In case of pie graph, dataset.backgroundColor is an array of string
        // @ts-ignore
        dataset.backgroundColor = colors;
      }
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
