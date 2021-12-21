import {
  ChartColor,
  ChartConfiguration,
  ChartData,
  ChartDataSets,
  ChartLegendOptions,
  ChartTooltipItem,
} from "chart.js";
import { chartTerms } from "../../components/side_panel/translations_terms";
import { MAX_CHAR_LABEL } from "../../constants";
import { ChartColors } from "../../helpers/chart";
import { isDefined, isInside, overlap, recomputeZones, zoneToXc } from "../../helpers/index";
import { range } from "../../helpers/misc";
import { Mode } from "../../model";
import { Cell } from "../../types";
import { ChartDefinition, DataSet } from "../../types/chart";
import { Command } from "../../types/commands";
import { UID, Zone } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class EvaluationChartPlugin extends UIPlugin {
  static getters = ["getChartRuntime"];
  static modes: Mode[] = ["normal"];
  // contains the configuration of the chart with it's values like they should be displayed,
  // as well as all the options needed for the chart library to work correctly
  readonly chartRuntime: { [figureId: string]: ChartConfiguration } = {};
  private outOfDate: Set<UID> = new Set<UID>();

  beforeHandle(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_COLUMNS_ROWS":
        const sheet = this.getters.getSheet(cmd.sheetId);
        const length = cmd.dimension === "ROW" ? sheet.cols.length : sheet.rows.length;
        const zones: Zone[] = cmd.elements.map((el) => ({
          top: cmd.dimension === "ROW" ? el : 0,
          bottom: cmd.dimension === "ROW" ? el : length - 1,
          left: cmd.dimension === "ROW" ? 0 : el,
          right: cmd.dimension === "ROW" ? length - 1 : el,
        }));
        for (const chartId of Object.keys(this.chartRuntime)) {
          if (this.areZonesUsedInChart(cmd.sheetId, zones, chartId)) {
            this.outOfDate.add(chartId);
          }
        }
        break;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_CHART":
      case "CREATE_CHART":
        const chartDefinition = this.getters.getChartDefinition(cmd.id);
        if (chartDefinition) {
          this.chartRuntime[cmd.id] = this.mapDefinitionToRuntime(chartDefinition);
        }
        break;
      case "DELETE_FIGURE":
        delete this.chartRuntime[cmd.id];
        break;
      case "REFRESH_CHART":
        this.evaluateUsedSheets([cmd.id]);
        this.outOfDate.add(cmd.id);
        break;
      case "ACTIVATE_SHEET":
        const chartsIds = this.getters.getChartsIdBySheet(cmd.sheetIdTo);
        this.evaluateUsedSheets(chartsIds);
        break;
      case "UPDATE_CELL":
        for (let chartId of Object.keys(this.chartRuntime)) {
          if (this.isCellUsedInChart(cmd.sheetId, chartId, cmd.col, cmd.row)) {
            this.outOfDate.add(chartId);
          }
        }
        break;
      case "DELETE_SHEET":
        for (let chartId of Object.keys(this.chartRuntime)) {
          if (!this.getters.getChartDefinition(chartId)) {
            delete this.chartRuntime[chartId];
          }
        }
        break;
      case "ADD_COLUMNS_ROWS":
        const sheet = this.getters.getSheet(cmd.sheetId);
        const numberOfElem = cmd.dimension === "ROW" ? sheet.cols.length : sheet.rows.length;
        const offset = cmd.position === "before" ? 0 : 1;
        const zone: Zone = {
          top: cmd.dimension === "ROW" ? cmd.base + offset : 0,
          bottom: cmd.dimension === "ROW" ? cmd.base + cmd.quantity + offset : numberOfElem - 1,
          left: cmd.dimension === "ROW" ? 0 : cmd.base + offset,
          right: cmd.dimension === "ROW" ? numberOfElem - 1 : cmd.base + cmd.quantity + offset,
        };
        for (const chartId of Object.keys(this.chartRuntime)) {
          if (this.areZonesUsedInChart(cmd.sheetId, [zone], chartId)) {
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
        // if there was an async evaluation of cell, there is no way to know which was updated so all charts must be updated
        //TODO Need to check that someday
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

  private truncateLabel(label: string | undefined): string {
    if (!label) {
      return "";
    }
    if (label.length > MAX_CHAR_LABEL) {
      return label.substring(0, MAX_CHAR_LABEL) + "…";
    }
    return label;
  }

  private getDefaultConfiguration(
    definition: ChartDefinition,
    labels: string[]
  ): ChartConfiguration {
    const legend: ChartLegendOptions = {};
    if (!definition.labelRange && definition.dataSets.length === 1) {
      legend.display = false;
    } else {
      legend.position = definition.legendPosition;
    }
    const config: ChartConfiguration = {
      type: definition.type,
      options: {
        legend,
        // https://www.chartjs.org/docs/latest/general/responsive.html
        responsive: true, // will resize when its container is resized
        maintainAspectRatio: false, // doesn't maintain the aspect ration (width/height =2 by default) so the user has the choice of the exact layout
        layout: {
          padding: { left: 20, right: 20, top: definition.title ? 10 : 25, bottom: 10 },
        },
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
          display: !!definition.title,
          fontSize: 22,
          fontStyle: "normal",
          text: definition.title,
        },
      },
      data: {
        labels: labels.map(this.truncateLabel),
        datasets: [],
      },
    };

    if (definition.type !== "pie") {
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
            position: definition.verticalAxisPosition,
            ticks: {
              // y axis configuration
              beginAtZero: true, // the origin of the y axis is always zero
            },
          },
        ],
      };
      if (definition.type === "bar" && definition.stackedBar) {
        config.options!.scales.xAxes![0].stacked = true;
        config.options!.scales.yAxes![0].stacked = true;
      }
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

  private areZonesUsedInChart(sheetId: UID, zones: Zone[], chartId: UID): boolean {
    const chartDefinition = this.getters.getChartDefinition(chartId);
    if (!chartDefinition || sheetId !== chartDefinition?.sheetId) {
      return false;
    }
    const ranges = [
      ...chartDefinition.dataSets.map((ds) => ds.dataRange),
      chartDefinition.labelRange,
    ].filter(isDefined);
    for (let zone of zones) {
      for (let range of ranges) {
        if (range.sheetId === sheetId && overlap(range.zone, zone)) {
          return true;
        }
      }
    }
    return false;
  }

  private isCellUsedInChart(sheetId: UID, chartId: UID, col: number, row: number): boolean {
    const chartDefinition = this.getters.getChartDefinition(chartId);
    if (chartDefinition === undefined) {
      return false;
    }
    const ranges = [
      ...chartDefinition.dataSets.map((ds) => ds.dataRange),
      chartDefinition.labelRange,
    ].filter(isDefined);

    for (let range of ranges) {
      if (range.sheetId === sheetId && isInside(col, row, range.zone)) {
        return true;
      }
    }
    return false;
  }

  private getSheetIdsUsedInChart(chartDefinition: ChartDefinition): Set<UID> {
    const sheetIds: Set<UID> = new Set();
    for (let ds of chartDefinition.dataSets) {
      sheetIds.add(ds.dataRange.sheetId);
    }
    if (chartDefinition.labelRange) {
      sheetIds.add(chartDefinition.labelRange.sheetId);
    }
    return sheetIds;
  }

  private evaluateUsedSheets(chartsIds: UID[]) {
    const usedSheetsId: Set<UID> = new Set();
    for (let chartId of chartsIds) {
      const chartDefinition = this.getters.getChartDefinition(chartId);
      const sheetsIds =
        chartDefinition !== undefined ? this.getSheetIdsUsedInChart(chartDefinition) : [];
      sheetsIds.forEach((sheetId) => {
        if (sheetId !== this.getters.getActiveSheetId()) {
          usedSheetsId.add(sheetId);
        }
      });
    }
    for (let sheetId of usedSheetsId) {
      this.dispatch("EVALUATE_CELLS", { sheetId });
    }
  }

  private mapDefinitionToRuntime(definition: ChartDefinition): ChartConfiguration {
    let labels: string[] = [];
    if (definition.labelRange) {
      if (!definition.labelRange.invalidXc && !definition.labelRange.invalidSheetName) {
        labels = this.getters.getRangeFormattedValues(definition.labelRange).flat(1);
      }
    } else if (definition.dataSets.length === 1) {
      for (let i = 0; i < this.getData(definition.dataSets[0], definition.sheetId).length; i++) {
        labels.push("");
      }
    } else {
      if (definition.dataSets[0]) {
        const ranges = this.getData(definition.dataSets[0], definition.sheetId);
        labels = range(0, ranges.length).map((r) => r.toString());
      }
    }
    const runtime = this.getDefaultConfiguration(definition, labels);

    const colors = new ChartColors();
    const pieColors: ChartColor[] = [];
    if (definition.type === "pie") {
      const maxLength = Math.max(
        ...definition.dataSets.map((ds) => this.getData(ds, definition.sheetId).length)
      );
      for (let i = 0; i <= maxLength; i++) {
        pieColors.push(colors.next());
      }
    }
    for (const [dsIndex, ds] of Object.entries(definition.dataSets)) {
      let label: string;
      if (ds.labelCell) {
        const labelRange = ds.labelCell;
        const cell: Cell | undefined = labelRange
          ? this.getters.getCell(labelRange.sheetId, labelRange.zone.left, labelRange.zone.top)
          : undefined;
        label =
          cell && labelRange
            ? this.truncateLabel(cell.formattedValue)
            : (label = `${chartTerms.Series} ${parseInt(dsIndex) + 1}`);
      } else {
        label = label = `${chartTerms.Series} ${parseInt(dsIndex) + 1}`;
      }
      const color = definition.type !== "pie" ? colors.next() : "#FFFFFF"; // white border for pie chart
      const dataset: ChartDataSets = {
        label,
        data: ds.dataRange ? this.getData(ds, definition.sheetId) : [],
        lineTension: 0, // 0 -> render straight lines, which is much faster
        borderColor: color,
        backgroundColor: color,
      };
      if (definition.type === "pie") {
        // In case of pie graph, dataset.backgroundColor is an array of string
        // @ts-ignore - we know dataset.data is an array
        dataset.backgroundColor = pieColors;
      }
      runtime.data!.datasets!.push(dataset);
    }
    return runtime;
  }

  // TODO type this with Chart.js types.
  private getData(ds: DataSet, sheetId: UID): any[] {
    if (ds.dataRange) {
      const labelCellZone = ds.labelCell ? [zoneToXc(ds.labelCell.zone)] : [];
      const dataXC = recomputeZones([zoneToXc(ds.dataRange.zone)], labelCellZone)[0];
      if (dataXC === undefined) {
        return [];
      }
      const dataRange = this.getters.getRangeFromSheetXC(ds.dataRange.sheetId, dataXC);
      return this.getters.getRangeValues(dataRange).flat(1);
    }
    return [];
  }
}
