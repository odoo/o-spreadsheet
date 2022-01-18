import { INCORRECT_RANGE_STRING } from "../../constants";
import { deepCopy, rangeReference, zoneToDimension, zoneToXc } from "../../helpers/index";
import {
  ApplyRangeChange,
  ChartDefinition,
  ChartUIDefinition,
  ChartUIDefinitionUpdate,
  Command,
  CommandResult,
  CoreCommand,
  CreateChartCommand,
  DataSet,
  ExcelChartDataset,
  ExcelChartDefinition,
  ExcelWorkbookData,
  Figure,
  FigureData,
  UID,
  UpdateChartCommand,
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
  readonly chartFigures: Record<UID, ChartDefinition | undefined>;
}

export class ChartPlugin extends CorePlugin<ChartState> implements ChartState {
  static getters = ["getChartDefinition", "getChartDefinitionUI", "getChartsIdBySheet"] as const;
  readonly chartFigures: Record<UID, ChartDefinition> = {};

  adaptRanges(applyChange: ApplyRangeChange) {
    for (let [chartId, chart] of Object.entries(this.chartFigures)) {
      if (chart) {
        this.adaptDataSetRanges(chart, chartId, applyChange);
        this.adaptLabelRanges(chart, chartId, applyChange);
      }
    }
  }

  private adaptDataSetRanges(chart: ChartDefinition, chartId: UID, applyChange: ApplyRangeChange) {
    for (let ds of chart.dataSets) {
      if (ds.labelCell) {
        const labelCellChange = applyChange(ds.labelCell);
        switch (labelCellChange.changeType) {
          case "REMOVE":
            this.history.update(
              "chartFigures",
              chartId,
              "dataSets",
              chart.dataSets.indexOf(ds),
              "labelCell",
              undefined
            );
            break;
          case "RESIZE":
          case "MOVE":
          case "CHANGE":
            this.history.update(
              "chartFigures",
              chartId,
              "dataSets",
              chart.dataSets.indexOf(ds),
              "labelCell",
              labelCellChange.range
            );
        }
      }
      const dataRangeChange = applyChange(ds.dataRange);
      switch (dataRangeChange.changeType) {
        case "REMOVE":
          const newDataSets = chart.dataSets.filter((dataset) => dataset !== ds);
          this.history.update("chartFigures", chartId, "dataSets", newDataSets);
          break;
        case "RESIZE":
        case "MOVE":
        case "CHANGE":
          // We have to remove the ranges that are #REF
          if (
            this.getters.getRangeString(dataRangeChange.range, dataRangeChange.range.sheetId) !==
            INCORRECT_RANGE_STRING
          ) {
            this.history.update(
              "chartFigures",
              chartId,
              "dataSets",
              chart.dataSets.indexOf(ds),
              "dataRange",
              dataRangeChange.range
            );
          } else {
            const newDataSets = chart.dataSets.filter((dataset) => dataset !== ds);
            this.history.update("chartFigures", chartId, "dataSets", newDataSets);
          }
          break;
      }
    }
  }
  private adaptLabelRanges(chart: ChartDefinition, chartId: UID, applyChange: ApplyRangeChange) {
    if (chart.labelRange) {
      const labelRangeChange = applyChange(chart.labelRange);
      switch (labelRangeChange.changeType) {
        case "REMOVE":
          this.history.update("chartFigures", chartId, "labelRange", undefined);
          break;
        case "RESIZE":
        case "MOVE":
        case "CHANGE":
          this.history.update("chartFigures", chartId, "labelRange", labelRangeChange.range);
          break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command) {
    const success: CommandResult = CommandResult.Success;
    switch (cmd.type) {
      case "UPDATE_CHART":
      case "CREATE_CHART":
        return this.checkValidations(
          cmd,
          this.chainValidations(this.checkEmptyDataset, this.checkDataset),
          this.checkLabelRange
        );
      default:
        return success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_CHART":
        const x = cmd.position ? cmd.position.x : 0;
        const y = cmd.position ? cmd.position.y : 0;
        this.addChartFigure(cmd.sheetId, this.createChartDefinition(cmd.definition, cmd.sheetId), {
          id: cmd.id,
          x,
          y,
          height: 335,
          width: 536,
          tag: "chart",
        });
        break;
      case "UPDATE_CHART": {
        this.updateChartDefinition(cmd.id, cmd.definition);
        break;
      }
      case "DUPLICATE_SHEET": {
        const sheetFiguresFrom = this.getters.getFigures(cmd.sheetId);
        for (const fig of sheetFiguresFrom) {
          if (fig.tag === "chart") {
            const id = this.uuidGenerator.uuidv4();
            const chartDefinition = { ...deepCopy(this.chartFigures[fig.id]), id };
            chartDefinition.sheetId = cmd.sheetIdTo;
            chartDefinition.dataSets.forEach((dataset) => {
              if (dataset.dataRange.sheetId === cmd.sheetId) {
                dataset.dataRange.sheetId = cmd.sheetIdTo;
              }
              if (dataset.labelCell?.sheetId === cmd.sheetId) {
                dataset.labelCell.sheetId = cmd.sheetIdTo;
              }
            });
            if (chartDefinition.labelRange?.sheetId === cmd.sheetId) {
              chartDefinition.labelRange.sheetId = cmd.sheetIdTo;
            }

            const figure: Figure = {
              id: id,
              x: fig.x,
              y: fig.y,
              height: fig.height,
              width: fig.width,
              tag: "chart",
            };
            this.addChartFigure(cmd.sheetIdTo, chartDefinition, figure);
          }
        }
        break;
      }
      case "DELETE_FIGURE":
        this.history.update("chartFigures", cmd.id, undefined);
        break;
      case "DELETE_SHEET":
        for (let id of Object.keys(this.chartFigures)) {
          if (this.chartFigures[id]?.sheetId === cmd.sheetId) {
            this.history.update("chartFigures", id, undefined);
          }
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getChartDefinition(figureId: UID): ChartDefinition | undefined {
    return this.chartFigures[figureId];
  }

  getChartsIdBySheet(sheetId: UID) {
    return Object.entries(this.chartFigures)
      .filter((chart) => {
        return chart[1].sheetId === sheetId;
      })
      .map((chart) => chart[0]);
  }

  getChartDefinitionUI(sheetId: UID, figureId: UID): ChartUIDefinition {
    const data: ChartDefinition = this.chartFigures[figureId];
    const dataSets: string[] = data.dataSets
      .map((ds: DataSet) => (ds ? this.getters.getRangeString(ds.dataRange, sheetId) : ""))
      .filter((ds) => {
        return ds !== ""; // && range !== INCORRECT_RANGE_STRING ? show incorrect #ref ?
      });
    return {
      title: data && data.title ? data.title : "",
      dataSets,
      labelRange: data.labelRange
        ? this.getters.getRangeString(data.labelRange, sheetId)
        : undefined,
      type: data ? data.type : "bar",
      dataSetsHaveTitle:
        data && dataSets.length !== 0 ? Boolean(data.dataSets[0].labelCell) : false,
      background: data.background,
      verticalAxisPosition: data.verticalAxisPosition,
      legendPosition: data.legendPosition,
      stackedBar: data.stackedBar,
    };
  }

  private getChartDefinitionExcel(sheetId: UID, figureId: UID): ExcelChartDefinition {
    const data: ChartDefinition = this.chartFigures[figureId];
    const dataSets: ExcelChartDataset[] = data.dataSets
      .map((ds: DataSet) => this.toExcelDataset(ds))
      .filter((ds) => ds.range !== ""); // && range !== INCORRECT_RANGE_STRING ? show incorrect #ref ?
    return {
      ...this.getChartDefinitionUI("forceSheetReference", figureId),
      backgroundColor: data.background,
      dataSets,
    };
  }

  private toExcelDataset(ds: DataSet): ExcelChartDataset {
    const labelZone = ds.labelCell?.zone;
    let dataZone = ds.dataRange.zone;
    if (labelZone) {
      const { height, width } = zoneToDimension(dataZone);
      if (height === 1) {
        dataZone = { ...dataZone, left: dataZone.left + 1 };
      } else if (width === 1) {
        dataZone = { ...dataZone, top: dataZone.top + 1 };
      }
    }

    const dataRange = {
      ...ds.dataRange,
      zone: dataZone,
    };

    return {
      label: ds.labelCell
        ? this.getters.getRangeString(ds.labelCell, "forceSheetReference")
        : undefined,
      range: this.getters.getRangeString(dataRange, "forceSheetReference"),
    };
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      if (sheet.figures) {
        for (let figure of sheet.figures) {
          if (figure.tag === "chart") {
            const figureData: ChartUIDefinition = {
              ...figure.data,
            };
            this.chartFigures[figure.id] = this.createChartDefinition(figureData, sheet.id);
            delete figure.data;
          }
        }
      }
    }
  }

  export(data: WorkbookData) {
    if (data.sheets) {
      for (let sheet of data.sheets) {
        const sheetFigures = this.getters.getFigures(sheet.id);
        const figures = sheetFigures as FigureData<any>[];
        for (let figure of figures) {
          if (figure && figure.tag === "chart") {
            figure.data = this.getChartDefinitionUI(sheet.id, figure.id);
          }
        }
        sheet.figures = figures;
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    for (let sheet of data.sheets) {
      const sheetFigures = this.getters.getFigures(sheet.id);
      const figures = sheetFigures as FigureData<ExcelChartDefinition>[];
      for (let figure of figures) {
        if (figure && figure.tag === "chart") {
          figure.data = this.getChartDefinitionExcel(sheet.id, figure.id);
        }
      }
      sheet.charts = figures;
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Create a new chart definition based on the given UI definition
   */
  private createChartDefinition(definition: ChartUIDefinition, sheetId: UID): ChartDefinition {
    return {
      ...definition,
      dataSets: this.createDataSets(definition.dataSets, sheetId, definition.dataSetsHaveTitle),
      labelRange: definition.labelRange
        ? this.getters.getRangeFromSheetXC(sheetId, definition.labelRange)
        : undefined,
      sheetId,
    };
  }

  /**
   * Update the chart definition linked to the given id with the attributes
   * given in the partial UI definition
   */
  private updateChartDefinition(id: UID, definition: ChartUIDefinitionUpdate) {
    const chart = this.chartFigures[id];
    if (!chart) {
      throw new Error(`There is no chart with the given id: ${id}`);
    }
    if (definition.title !== undefined) {
      this.history.update("chartFigures", id, "title", definition.title);
    }
    if (definition.type) {
      this.history.update("chartFigures", id, "type", definition.type);
    }
    if (definition.dataSets) {
      const dataSetsHaveTitle = !!definition.dataSetsHaveTitle;
      const dataSets = this.createDataSets(definition.dataSets, chart.sheetId, dataSetsHaveTitle);
      this.history.update("chartFigures", id, "dataSets", dataSets);
    }
    if (definition.labelRange !== undefined) {
      const labelRange = definition.labelRange
        ? this.getters.getRangeFromSheetXC(chart.sheetId, definition.labelRange)
        : undefined;
      this.history.update("chartFigures", id, "labelRange", labelRange);
    }
    if (definition.background) {
      this.history.update("chartFigures", id, "background", definition.background);
    }
    if (definition.verticalAxisPosition) {
      this.history.update(
        "chartFigures",
        id,
        "verticalAxisPosition",
        definition.verticalAxisPosition
      );
    }
    if (definition.legendPosition) {
      this.history.update("chartFigures", id, "legendPosition", definition.legendPosition);
    }
    if (definition.stackedBar !== undefined) {
      this.history.update("chartFigures", id, "stackedBar", definition.stackedBar);
    }
  }

  private createDataSets(
    dataSetsString: string[],
    sheetId: UID,
    dataSetsHaveTitle: boolean
  ): DataSet[] {
    const dataSets: DataSet[] = [];
    for (const sheetXC of dataSetsString) {
      const dataRange = this.getters.getRangeFromSheetXC(sheetId, sheetXC);
      const { zone, sheetId: dataSetSheetId, invalidSheetName } = dataRange;
      if (invalidSheetName) {
        continue;
      }
      if (zone.left !== zone.right && zone.top !== zone.bottom) {
        // It's a rectangle. We treat all columns (arbitrary) as different data series.
        for (let column = zone.left; column <= zone.right; column++) {
          const columnZone = {
            left: column,
            right: column,
            top: zone.top,
            bottom: zone.bottom,
          };
          dataSets.push(
            this.createDataSet(
              dataSetSheetId,
              columnZone,
              dataSetsHaveTitle
                ? {
                    top: columnZone.top,
                    bottom: columnZone.top,
                    left: columnZone.left,
                    right: columnZone.left,
                  }
                : undefined
            )
          );
        }
      } else if (zone.left === zone.right && zone.top === zone.bottom) {
        // A single cell. If it's only the title, the dataset is not added.
        if (!dataSetsHaveTitle) {
          dataSets.push(this.createDataSet(dataSetSheetId, zone, undefined));
        }
      } else {
        /* 1 row or 1 column */
        dataSets.push(
          this.createDataSet(
            dataSetSheetId,
            zone,
            dataSetsHaveTitle
              ? {
                  top: zone.top,
                  bottom: zone.top,
                  left: zone.left,
                  right: zone.left,
                }
              : undefined
          )
        );
      }
    }
    return dataSets;
  }

  private addChartFigure(sheetId: string, data: ChartDefinition, figure: Figure) {
    this.dispatch("CREATE_FIGURE", {
      sheetId,
      figure,
    });
    this.history.update("chartFigures", figure.id, data);
  }

  private createDataSet(sheetId: UID, fullZone: Zone, titleZone: Zone | undefined): DataSet {
    if (fullZone.left !== fullZone.right && fullZone.top !== fullZone.bottom) {
      throw new Error(`Zone should be a single column or row: ${zoneToXc(fullZone)}`);
    }
    if (titleZone) {
      const dataXC = zoneToXc(fullZone);
      const labelCellXC = zoneToXc(titleZone);
      return {
        labelCell: this.getters.getRangeFromSheetXC(sheetId, labelCellXC),
        dataRange: this.getters.getRangeFromSheetXC(sheetId, dataXC),
      };
    } else {
      return {
        labelCell: undefined,
        dataRange: this.getters.getRangeFromSheetXC(sheetId, zoneToXc(fullZone)),
      };
    }
  }

  private checkEmptyDataset(cmd: CreateChartCommand | UpdateChartCommand): CommandResult {
    return cmd.definition.dataSets && cmd.definition.dataSets.length === 0
      ? CommandResult.EmptyDataSet
      : CommandResult.Success;
  }

  private checkDataset(cmd: CreateChartCommand | UpdateChartCommand): CommandResult {
    if (!cmd.definition.dataSets) {
      return CommandResult.Success;
    }
    const invalidRanges =
      cmd.definition.dataSets.find((range) => !rangeReference.test(range)) !== undefined;
    return invalidRanges ? CommandResult.InvalidDataSet : CommandResult.Success;
  }

  private checkLabelRange(cmd: CreateChartCommand | UpdateChartCommand): CommandResult {
    if (!cmd.definition.labelRange) {
      return CommandResult.Success;
    }
    const invalidLabels = !rangeReference.test(cmd.definition.labelRange || "");
    return invalidLabels ? CommandResult.InvalidLabelRange : CommandResult.Success;
  }
}
