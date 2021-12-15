import { ChartColor, ChartConfiguration, ChartData, ChartTooltipItem, ChartType } from "chart.js";
import { BasePlugin } from "../base_plugin";
import { chartTerms } from "../components/side_panel/translations_terms";
import { rangeReference } from "../formulas/parser";
import { deepCopy, isInside, toXC, toZone, uuidv4, zoneToXc } from "../helpers/index";
import {
  CancelledReason,
  ChartDefinition,
  Command,
  CommandResult,
  CreateChartDefinition,
  DataSet,
  Figure,
  LAYERS,
  WorkbookData,
  Zone,
} from "../types/index";

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
        this.addChartFigure(cmd.sheetId, {
          id: cmd.id,
          data: this.createChartDefinition(cmd.definition, cmd.sheetId),
          x: 0,
          y: 0,
          height: 500,
          width: 800,
          tag: "chart",
        });
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
      case "DUPLICATE_SHEET": {
        const newSheetId = cmd.id;
        const figures = [...this.chartFigures]
          .map((figureId) => this.getters.getFigure<ChartDefinition>(figureId))
          .filter((figure) => figure.data.sheetId === cmd.sheet)
          .map(deepCopy);
        for (let figure of figures) {
          figure.data.sheetId = newSheetId;
          figure.id = uuidv4();
          this.addChartFigure(newSheetId, figure);
        }
        break;
      }
      case "DELETE_SHEET":
        const figures = new Set(this.chartFigures);
        const runtime = { ...this.chartRuntime };
        for (let figureId of this.chartFigures) {
          const figure = this.getters.getFigure(figureId);
          if (!figure) {
            figures.delete(figureId);
            delete runtime[figureId];
          }
        }
        this.history.updateLocalState(["chartFigures"], figures);
        this.history.updateLocalState(["chartRuntime"], runtime);
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
          this.chartFigures.add(f.id);
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
    } else {
      config.options!.tooltips = {
        callbacks: {
          title: function (tooltipItems: ChartTooltipItem[], data: ChartData) {
            return data.datasets![tooltipItems[0]!.datasetIndex!].label!;
          },
        },
      };
    }
    return config;
  }

  private extractDataFromRange(sheetId: string, reference?: string): any[] {
    return reference ? this.getters.getRangeValues(reference, sheetId).flat(1) : [];
  }

  private mapDefinitionToRuntime(definition: ChartDefinition): ChartConfiguration {
    const labels =
      definition.labelRange !== ""
        ? this.getters.getRangeFormattedValues(definition.labelRange, definition.sheetId).flat(1)
        : [];
    const runtime = this.getDefaultConfiguration(definition.type, definition.title, labels);

    let graphColorIndex = 0;
    const pieColors: ChartColor[] = [];
    if (definition.type === "pie") {
      const maxLength = Math.max(
        ...definition.dataSets.map(
          (ds) => this.extractDataFromRange(definition.sheetId, ds.dataRange).length
        )
      );
      for (let i = 0; i <= maxLength; i++) {
        pieColors.push(GraphColors[graphColorIndex]);
        graphColorIndex = ++graphColorIndex % GraphColors.length;
      }
    }
    for (const [dsIndex, ds] of Object.entries(definition.dataSets)) {
      let label;
      if (ds.labelCell) {
        try {
          label = this.getters.evaluateFormula(ds.labelCell, definition.sheetId);
        } catch (e) {
          // We want here to catch issue linked to async formula
          label = `${chartTerms.Series} ${parseInt(dsIndex) + 1}`;
        }
      } else {
        label = `${chartTerms.Series} ${parseInt(dsIndex) + 1}`;
      }
      const dataset = {
        label,
        data: this.extractDataFromRange(definition.sheetId, ds.dataRange),
        lineTension: 0, // 0 -> render straight lines, which is much faster
        borderColor: definition.type !== "pie" ? GraphColors[graphColorIndex] : "#FFFFFF", // white border for pie chart
        backgroundColor: GraphColors[graphColorIndex],
      };
      if (definition.type === "pie") {
        // In case of pie graph, dataset.backgroundColor is an array of string
        // @ts-ignore
        dataset.backgroundColor = pieColors;
      }
      graphColorIndex = ++graphColorIndex % GraphColors.length;
      runtime.data!.datasets!.push(dataset);
    }
    return runtime;
  }

  private addChartFigure(sheetId: string, figure: Figure<ChartDefinition>) {
    this.dispatch("CREATE_FIGURE", {
      sheet: sheetId,
      figure,
    });
    this.history.updateLocalState(["chartFigures"], new Set(this.chartFigures).add(figure.id));
    this.history.updateLocalState(
      ["chartRuntime", figure.id],
      this.mapDefinitionToRuntime(figure.data)
    );
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
