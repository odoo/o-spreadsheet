import { rangeReference } from "../../formulas/parser";
import { uuidv4, zoneToXc } from "../../helpers/index";
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
  readonly chartFigures: Record<UID, ChartDefinition | undefined>;
}

export class ChartPlugin extends CorePlugin<ChartState> implements ChartState {
  static getters = ["getChartDefinition", "getChartDefinitionUI"];
  readonly chartFigures = {};

  allowDispatch(cmd: Command): CommandResult {
    const success: CommandResult = { status: "SUCCESS" };
    switch (cmd.type) {
      case "UPDATE_CHART":
      case "CREATE_CHART":
        const error = this.checkChartDefinition(cmd.definition);
        return error
          ? { status: "CANCELLED", reason: error }
          : {
              status: "SUCCESS",
            };
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
      case "DUPLICATE_SHEET": {
        const sheetFiguresFrom = this.getters.getFigures(cmd.sheetIdFrom);
        for (const fig of sheetFiguresFrom) {
          if (fig.tag === "chart") {
            const id = uuidv4();
            const chartDefinition = { ...this.chartFigures[fig.id], id };
            this.dispatch("CREATE_FIGURE", {
              sheetId: cmd.sheetIdTo,
              figure: {
                id: id,
                x: fig.x,
                y: fig.y,
                height: fig.height,
                width: fig.width,
                tag: "chart",
              },
            });
            this.history.update("chartFigures", id, chartDefinition);
          }
        }
        break;
      }
      case "DELETE_FIGURE":
        this.history.update("chartFigures", cmd.id, undefined);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getChartDefinition(figureId: UID): ChartDefinition | undefined {
    return this.chartFigures[figureId];
  }

  getChartDefinitionUI(sheetId: UID, figureId: UID): CreateChartDefinition {
    const data: ChartDefinition = this.chartFigures[figureId];
    const dataSets: string[] = data.dataSets
      .map((ds: DataSet) => {
        if (ds) {
          const rangeString = this.getters.getRangeString(ds.dataRange, sheetId);
          return rangeString === "#REF" ? ds.inputValue : rangeString;
        } else {
          return "";
        }
      })
      .filter((ds) => {
        return ds !== ""; // && range !== INCORRECT_RANGE_STRING ? show incorrect #ref ?
      });
    const labelString = this.getters.getRangeString(data.labelRange.range, sheetId);
    return {
      title: data && data.title ? data.title : "",
      dataSets,
      labelRange: labelString === "#REF" ? data.labelRange.inputValue : labelString,
      type: data ? data.type : "bar",
      dataSetsHaveTitle: data && data.dataSets[0] ? Boolean(data.dataSets[0].labelCell) : false,
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
            const figureData: CreateChartDefinition = {
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

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private createChartDefinition(
    createCommand: CreateChartDefinition,
    sheetId: string
  ): ChartDefinition {
    let dataSets: DataSet[] = [];
    for (let sheetXC of createCommand.dataSets) {
      const dataRange = this.getters.getRangeFromSheetXC(sheetId, sheetXC, undefined, true);
      const { zone, sheetId: dataSetSheetId, invalidSheetName } = dataRange;
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
              sheetId,
              dataSetSheetId,
              columnZone,
              createCommand.dataSetsHaveTitle
                ? {
                    top: columnZone.top,
                    bottom: columnZone.top,
                    left: columnZone.left,
                    right: columnZone.left,
                  }
                : undefined,
              invalidSheetName
            )
          );
        }
      } else if (zone.left === zone.right && zone.top === zone.bottom) {
        // A single cell. If it's only the title, the dataset is not added.
        if (!createCommand.dataSetsHaveTitle) {
          dataSets.push(
            this.createDataSet(sheetId, dataSetSheetId, zone, undefined, invalidSheetName)
          );
        }
      } else {
        /* 1 row or 1 column */
        dataSets.push(
          this.createDataSet(
            sheetId,
            dataSetSheetId,
            zone,
            createCommand.dataSetsHaveTitle
              ? {
                  top: zone.top,
                  bottom: zone.top,
                  left: zone.left,
                  right: zone.left,
                }
              : undefined,
            invalidSheetName
          )
        );
      }
    }
    const labelRange = this.getters.getRangeFromSheetXC(sheetId, createCommand.labelRange);
    return {
      title: createCommand.title,
      type: createCommand.type,
      dataSets: dataSets,
      labelRange: {
        range: labelRange,
        inputValue: this.createInputValue(
          labelRange.invalidSheetName,
          labelRange.zone,
          sheetId,
          labelRange.sheetId
        ),
      },
      sheetId: sheetId,
    };
  }

  private createDataSet(
    chartSheetId: UID,
    dataSetsheetId: UID,
    fullZone: Zone,
    titleZone: Zone | undefined,
    invalidSheetName: string | undefined
  ): DataSet {
    if (fullZone.left !== fullZone.right && fullZone.top !== fullZone.bottom) {
      throw new Error(`Zone should be a single column or row: ${zoneToXc(fullZone)}`);
    }
    if (titleZone) {
      const dataXC = zoneToXc(fullZone);
      const labelCellXC = invalidSheetName
        ? invalidSheetName + "!" + zoneToXc(titleZone)
        : zoneToXc(titleZone);
      const labelCell = this.getters.getRangeFromSheetXC(dataSetsheetId, labelCellXC);
      const dataRange = this.getters.getRangeFromSheetXC(dataSetsheetId, dataXC);
      return {
        labelCell,
        dataRange,
        inputValue: this.createInputValue(invalidSheetName, fullZone, chartSheetId, dataSetsheetId),
      };
    } else {
      const dataXC = zoneToXc(fullZone);
      return {
        labelCell: undefined,
        dataRange: this.getters.getRangeFromSheetXC(dataSetsheetId, dataXC),
        inputValue: this.createInputValue(invalidSheetName, fullZone, chartSheetId, dataSetsheetId),
      };
    }
  }

  private createInputValue(
    invalidSheetName: string | undefined,
    zone: Zone,
    chartSheetId: UID,
    dataSetSheetId: UID
  ): string {
    return invalidSheetName
      ? invalidSheetName + "!" + zoneToXc(zone)
      : chartSheetId !== dataSetSheetId
      ? this.getters.getSheetName(dataSetSheetId) + "!" + zoneToXc(zone)
      : zoneToXc(zone);
  }

  private checkChartDefinition(createCommand: CreateChartDefinition): CancelledReason | null {
    if (createCommand.dataSets.length) {
      const invalidRanges =
        createCommand.dataSets.find((range) => !rangeReference.test(range)) !== undefined;
      if (invalidRanges) {
        return CancelledReason.InvalidDataSet;
      }
    } else {
      return CancelledReason.EmptyDataSet;
    }
    if (createCommand.labelRange) {
      const invalidLabels = !rangeReference.test(createCommand.labelRange);
      if (invalidLabels) {
        return CancelledReason.InvalidLabelRange;
      }
    } else {
      return CancelledReason.EmptyLabelRange;
    }
    return null;
  }
}
