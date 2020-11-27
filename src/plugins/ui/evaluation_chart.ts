import { ChartConfiguration, ChartType } from "chart.js";
import { chartTerms } from "../../components/side_panel/translations_terms";
import { isInside, recomputeZones, zoneToXc } from "../../helpers/index";
import { Mode } from "../../model";
import { ChartDefinition, DataSet } from "../../types/chart";
import { Command } from "../../types/commands";
import { Cell, UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

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

export class EvaluationChartPlugin extends UIPlugin {
  static getters = ["getChartRuntime"];
  static modes: Mode[] = ["normal", "readonly"];
  // contains the configuration of the chart with it's values like they should be displayed,
  // as well as all the options needed for the chart library to work correctly
  readonly chartRuntime: { [figureId: string]: ChartConfiguration } = {};
  private outOfDate: Set<string> = new Set<string>();

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_CHART":
      case "CREATE_CHART":
        const chartDefinition = this.getters.getChartDefinition(cmd.id)!;
        this.chartRuntime[cmd.id] = this.mapDefinitionToRuntime(chartDefinition);
        break;
      case "DELETE_FIGURE":
        delete this.chartRuntime[cmd.id];
        break;
      case "UPDATE_CELL":
        for (let chartId of Object.keys(this.chartRuntime)) {
          if (this.isCellUsedInChart(cmd.sheetId, chartId, cmd.col, cmd.row)) {
            this.outOfDate.add(chartId);
          }
        }
        break;
      case "UNDO":
      case "REDO":
        for (let chartId of Object.keys(this.chartRuntime)) {
          this.outOfDate.add(chartId);
        }
        break;
      case "EVALUATE_CELLS":
      case "START":
        // if there was an async evaluation of cell, there is no way to know which was updated so all charts must be updated
        for (let id in this.chartRuntime) {
          this.outOfDate.add(id);
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getChartRuntime(figureId: string): ChartConfiguration | undefined {
    if (this.outOfDate.has(figureId) || !(figureId in this.chartRuntime)) {
      const chartDefinition = this.getters.getChartDefinition(figureId);
      if (chartDefinition === undefined) return;
      this.chartRuntime[figureId] = this.mapDefinitionToRuntime(chartDefinition);
      this.outOfDate.delete(figureId);
    }
    return this.chartRuntime[figureId];
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

  private isCellUsedInChart(sheetId: UID, chartId: UID, col: number, row: number): boolean {
    const chart = this.getters.getChartDefinition(chartId);
    if (chart === undefined) {
      return false;
    }
    if (chart.labelRange && isInside(col, row, chart.labelRange.zone)) {
      return true;
    }
    for (let ds of chart.dataSets) {
      const dataRange = ds.dataRange;
      if (dataRange && dataRange.zone && isInside(col, row, dataRange.zone)) {
        return true;
      }
    }
    return false;
  }

  private mapDefinitionToRuntime(definition: ChartDefinition): ChartConfiguration {
    let labels: string[] = [];
    if (definition.labelRange) {
      const rangeString = this.getters.getRangeString(definition.labelRange, definition.sheetId);
      if (rangeString !== "#REF") {
        labels = this.getters.getRangeFormattedValues(rangeString, definition.sheetId).flat(1);
      }
    }
    const runtime = this.getDefaultConfiguration(definition.type, definition.title, labels);

    let graphColorIndex = 0;
    for (const ds of definition.dataSets) {
      let label;
      if (ds.labelCell) {
        const labelRange = ds.labelCell;
        const cell: Cell | undefined = labelRange
          ? this.getters.getCell(labelRange.sheetId, labelRange.zone.left, labelRange.zone.top)
          : undefined;
        label =
          cell && labelRange
            ? this.getters.getCellText(cell, labelRange.sheetId)
            : chartTerms.Series;
      } else {
        label = chartTerms.Series;
      }
      const dataset = {
        label,
        data: ds.dataRange ? this.getData(ds, definition.sheetId) : [],
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

  private getData(ds: DataSet, sheetId: UID) {
    if (ds.dataRange) {
      const labelCellZone = ds.labelCell ? [zoneToXc(ds.labelCell.zone)] : [];
      const dataXC = recomputeZones([zoneToXc(ds.dataRange.zone)], labelCellZone)[0];
      const dataRange = this.getters.getRangeFromSheetXC(sheetId, dataXC);
      const dataRangeXc = this.getters.getRangeString(dataRange, sheetId);
      return this.getters.getRangeValues(dataRangeXc, ds.dataRange.sheetId).flat(1);
    }
    return [];
  }
}
