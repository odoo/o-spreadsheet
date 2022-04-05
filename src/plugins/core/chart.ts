import { INCORRECT_RANGE_STRING } from "../../constants";
import {
  chartFontColor,
  getDefaultBasicChartDefinition,
  getDefaultScorecardChartDefinition,
  getRangesInChartDefinition,
} from "../../helpers/chart";
import {
  deepCopy,
  rangeReference,
  recomputeZones,
  zoneToDimension,
  zoneToXc,
} from "../../helpers/index";
import {
  ApplyRangeChange,
  BasicChartDefinition,
  BasicChartUIDefinition,
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
  Range,
  ScorecardChartDefinition,
  UID,
  UpdateChartCommand,
  WorkbookData,
  Zone,
} from "../../types/index";
import { toXlsxHexColor } from "../../xlsx/helpers/colors";
import { CorePlugin } from "../core_plugin";
import {
  BasicChartType,
  ChartDefinition,
  ChartType,
  ChartUIDefinitionUpdate,
  isBasicChartDefinition,
  isBasicChartUIDefinition,
  isBasicChartUpdate,
  isScorecardChartUpdate,
  ScorecardChartUIDefinition,
} from "./../../types/chart";

/**
 * Chart plugin
 *
 * This plugin creates and displays charts
 * */

interface ChartState {
  readonly chartFigures: Record<UID, BasicChartDefinition | undefined>;
  readonly scorecardFigures: Record<UID, ScorecardChartDefinition | undefined>;
  readonly nextId: number;
}

export class ChartPlugin extends CorePlugin<ChartState> implements ChartState {
  static getters = [
    "isChartDefined",
    "getChartSheetId",
    "getChartType",
    "getBasicChartDefinitionUI",
    "getBasicChartDefinition",
    "getScorecardChartDefinition",
    "getScorecardChartDefinitionUI",
    "getChartsIdBySheet",
    "getChartRanges",
  ] as const;
  readonly chartFigures: Record<UID, BasicChartDefinition> = {};
  readonly scorecardFigures: Record<UID, ScorecardChartDefinition> = {};

  readonly nextId = 1;

  adaptRanges(applyChange: ApplyRangeChange) {
    for (let [chartId, chart] of Object.entries(this.chartFigures)) {
      if (chart) {
        this.adaptDataSetRanges(chart, chartId, applyChange);
        this.adaptChartRange(chart.labelRange, applyChange, {
          onRemove: () => this.history.update("chartFigures", chartId, "labelRange", undefined),
          onChange: (range) => this.history.update("chartFigures", chartId, "labelRange", range),
        });
      }
    }

    for (let [chartId, chart] of Object.entries(this.scorecardFigures)) {
      if (chart) {
        this.adaptChartRange(chart.baseline, applyChange, {
          onRemove: () => this.history.update("scorecardFigures", chartId, "baseline", undefined),
          onChange: (range) => this.history.update("scorecardFigures", chartId, "baseline", range),
        });
        this.adaptChartRange(chart.keyValue, applyChange, {
          onRemove: () => this.history.update("scorecardFigures", chartId, "keyValue", undefined),
          onChange: (range) => this.history.update("scorecardFigures", chartId, "keyValue", range),
        });
      }
    }
  }

  private adaptDataSetRanges(
    chart: BasicChartDefinition,
    chartId: UID,
    applyChange: ApplyRangeChange
  ) {
    for (let ds of chart.dataSets) {
      if (ds.labelCell) {
        this.adaptChartRange(ds.labelCell, applyChange, {
          onRemove: () =>
            this.history.update(
              "chartFigures",
              chartId,
              "dataSets",
              chart.dataSets.indexOf(ds),
              "labelCell",
              undefined
            ),
          onChange: (range) =>
            this.history.update(
              "chartFigures",
              chartId,
              "dataSets",
              chart.dataSets.indexOf(ds),
              "labelCell",
              range
            ),
        });
      }
      this.adaptChartRange(ds.dataRange, applyChange, {
        onRemove: () => {
          const newDataSets = chart.dataSets.filter((dataset) => dataset !== ds);
          this.history.update("chartFigures", chartId, "dataSets", newDataSets);
        },
        onChange: (range) => {
          if (this.getters.getRangeString(range, range.sheetId) !== INCORRECT_RANGE_STRING) {
            this.history.update(
              "chartFigures",
              chartId,
              "dataSets",
              chart.dataSets.indexOf(ds),
              "dataRange",
              range
            );
          } else {
            const newDataSets = chart.dataSets.filter((dataset) => dataset !== ds);
            this.history.update("chartFigures", chartId, "dataSets", newDataSets);
          }
        },
      });
    }
  }

  private adaptChartRange(
    range: Range | undefined,
    applyChange: ApplyRangeChange,
    callbacks: { onRemove: (range: Range) => void; onChange: (range: Range) => void }
  ) {
    if (!range) return;
    const labelRangeChange = applyChange(range);
    switch (labelRangeChange.changeType) {
      case "REMOVE":
        callbacks.onRemove(labelRangeChange.range);
        break;
      case "RESIZE":
      case "MOVE":
      case "CHANGE":
        callbacks.onChange(labelRangeChange.range);
        break;
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
          this.chainValidations(this.checkEmptyChartMainData, this.checkValidChartMainData),
          this.checkChartAuxiliaryRanges
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
        const chartDefinition = isBasicChartUIDefinition(cmd.definition)
          ? this.createBasicChartDefinition(cmd.definition, cmd.sheetId)
          : this.createScorecardChartDefinition(cmd.definition, cmd.sheetId);
        this.addChartFigure(cmd.sheetId, chartDefinition, {
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
            const id = this.nextId.toString();
            this.history.update("nextId", this.nextId + 1);
            const chartDefinitionToCopy: ChartDefinition =
              this.chartFigures[fig.id] || this.scorecardFigures[fig.id];

            const chartDefinition = deepCopy(chartDefinitionToCopy);
            chartDefinition.sheetId = cmd.sheetIdTo;
            const rangesInChart = getRangesInChartDefinition(chartDefinition);
            rangesInChart.forEach((range) => {
              if (range.sheetId === cmd.sheetId) {
                range.sheetId = cmd.sheetIdTo;
              }
            });

            const figure: Figure = { ...fig, id };
            this.addChartFigure(cmd.sheetIdTo, chartDefinition, figure);
          }
        }
        break;
      }
      case "DELETE_FIGURE":
        if (this.chartFigures[cmd.id]) {
          this.history.update("chartFigures", cmd.id, undefined);
        }
        if (this.scorecardFigures[cmd.id]) {
          this.history.update("scorecardFigures", cmd.id, undefined);
        }
        break;
      case "DELETE_SHEET":
        for (let id of Object.keys(this.chartFigures)) {
          if (this.chartFigures[id]?.sheetId === cmd.sheetId) {
            this.history.update("chartFigures", id, undefined);
          }
        }
        for (let id of Object.keys(this.scorecardFigures)) {
          if (this.scorecardFigures[id]?.sheetId === cmd.sheetId) {
            this.history.update("scorecardFigures", id, undefined);
          }
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getBasicChartDefinition(figureId: UID): BasicChartDefinition | undefined {
    return this.chartFigures[figureId];
  }

  getScorecardChartDefinition(figureId: UID): ScorecardChartDefinition | undefined {
    return this.scorecardFigures[figureId];
  }

  getChartType(figureId: UID): ChartType | undefined {
    const def = this.chartFigures[figureId] || this.scorecardFigures[figureId];
    return def?.type;
  }

  isChartDefined(figureId: UID): boolean {
    const def = this.chartFigures[figureId] || this.scorecardFigures[figureId];
    return def !== undefined;
  }

  getChartSheetId(figureId: UID): UID | undefined {
    const def = this.chartFigures[figureId] || this.scorecardFigures[figureId];
    return def?.sheetId;
  }

  getChartsIdBySheet(sheetId: UID) {
    return [...Object.entries(this.chartFigures), ...Object.entries(this.scorecardFigures)]
      .filter((chart) => {
        return chart[1].sheetId === sheetId;
      })
      .map((chart) => chart[0]);
  }

  getBasicChartDefinitionUI(sheetId: UID, figureId: UID): BasicChartUIDefinition | undefined {
    const data = this.chartFigures[figureId];
    if (!data) return undefined;
    const dataSets: string[] = data.dataSets
      .map((ds: DataSet) => (ds ? this.getters.getRangeString(ds.dataRange, sheetId) : ""))
      .filter((ds) => {
        return ds !== ""; // && range !== INCORRECT_RANGE_STRING ? show incorrect #ref ?
      });
    return {
      title: data.title ? data.title : "",
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
      labelsAsText: data.labelsAsText,
    };
  }

  getScorecardChartDefinitionUI(
    sheetId: UID,
    figureId: UID
  ): ScorecardChartUIDefinition | undefined {
    const data = this.scorecardFigures[figureId];
    if (!data) return undefined;
    return {
      ...data,
      title: data && data.title ? data.title : "",
      keyValue: data.keyValue ? this.getters.getRangeString(data.keyValue, sheetId) : undefined,
      baseline: data.baseline ? this.getters.getRangeString(data.baseline, sheetId) : undefined,
    };
  }

  /** Returns all the ranges contained in the chart corresponding to the given figure ID */
  getChartRanges(figureId: UID): Range[] {
    const chartDefinition = this.chartFigures[figureId] || this.scorecardFigures[figureId];
    return getRangesInChartDefinition(chartDefinition);
  }

  private getChartDefinitionExcel(sheetId: UID, figureId: UID): ExcelChartDefinition | undefined {
    const data: ChartDefinition = this.chartFigures[figureId];
    const dataSets: ExcelChartDataset[] = data.dataSets
      .map((ds: DataSet) => this.toExcelDataset(ds))
      .filter((ds) => ds.range !== ""); // && range !== INCORRECT_RANGE_STRING ? show incorrect #ref ?
    const chartDefUI = this.getBasicChartDefinitionUI("forceSheetReference", figureId);
    // chartDefUI is undefined for scorecard charts, that are not supported in Excel
    if (!chartDefUI) {
      return undefined;
    }
    return {
      ...chartDefUI,
      backgroundColor: toXlsxHexColor(data.background),
      fontColor: toXlsxHexColor(chartFontColor(data.background)),
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
            const figureData: BasicChartUIDefinition = {
              ...figure.data,
            };
            const chartDefinition = isBasicChartUIDefinition(figureData)
              ? this.createBasicChartDefinition(figureData, sheet.id)
              : this.createScorecardChartDefinition(figureData, sheet.id);

            if (isBasicChartDefinition(chartDefinition)) {
              this.chartFigures[figure.id] = chartDefinition;
            } else if (chartDefinition.type === "scorecard") {
              this.scorecardFigures[figure.id] = chartDefinition;
            }
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
            figure.data =
              this.getBasicChartDefinitionUI(sheet.id, figure.id) ||
              this.getScorecardChartDefinitionUI(sheet.id, figure.id);
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
          const figureData = this.getChartDefinitionExcel(sheet.id, figure.id);
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
   * Create a new chart definition based on the given UI definition
   */
  private createBasicChartDefinition(
    definition: BasicChartUIDefinition,
    sheetId: UID
  ): BasicChartDefinition {
    return {
      ...definition,
      dataSets: this.createDataSets(definition.dataSets, sheetId, definition.dataSetsHaveTitle),
      labelRange: definition.labelRange
        ? this.getters.getRangeFromSheetXC(sheetId, definition.labelRange)
        : undefined,
      sheetId,
    };
  }

  private createScorecardChartDefinition(
    definition: ScorecardChartUIDefinition,
    sheetId: UID
  ): ScorecardChartDefinition {
    return {
      ...definition,
      keyValue: definition.keyValue
        ? this.getters.getRangeFromSheetXC(sheetId, definition.keyValue)
        : undefined,
      baseline: definition.baseline
        ? this.getters.getRangeFromSheetXC(sheetId, definition.baseline)
        : undefined,
      sheetId,
    };
  }

  /**
   * Update the chart definition linked to the given id with the attributes
   * given in the partial UI definition
   */
  private updateChartDefinition(id: UID, definition: ChartUIDefinitionUpdate) {
    let chart: ChartDefinition = this.chartFigures[id] || this.scorecardFigures[id];
    if (!chart) {
      throw new Error(`There is no chart with the given id: ${id}`);
    }
    if (definition.type !== undefined) {
      this.updateChartType(id, definition.type);
    }
    const figureType = this.chartFigures[id] ? "chartFigures" : "scorecardFigures";
    if (definition.title !== undefined) {
      this.history.update(figureType, id, "title", definition.title);
    }
    if (definition.background !== undefined) {
      this.history.update(figureType, id, "background", definition.background);
    }

    if (isBasicChartUpdate(definition)) {
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
      if (definition.labelsAsText !== undefined) {
        this.history.update("chartFigures", id, "labelsAsText", definition.labelsAsText);
      }
    } else if (isScorecardChartUpdate(definition)) {
      if (definition.keyValue !== undefined) {
        const keyValueRange = definition.keyValue
          ? this.getters.getRangeFromSheetXC(chart.sheetId, definition.keyValue)
          : undefined;
        this.history.update("scorecardFigures", id, "keyValue", keyValueRange);
      }
      if (definition.baseline !== undefined) {
        const baselineRange = definition.baseline
          ? this.getters.getRangeFromSheetXC(chart.sheetId, definition.baseline)
          : undefined;
        this.history.update("scorecardFigures", id, "baseline", baselineRange);
      }
      if (definition.baselineDescr !== undefined) {
        this.history.update("scorecardFigures", id, "baselineDescr", definition.baselineDescr);
      }
      if (definition.baselineMode) {
        this.history.update("scorecardFigures", id, "baselineMode", definition.baselineMode);
      }
      if (definition.baselineColorUp) {
        this.history.update("scorecardFigures", id, "baselineColorUp", definition.baselineColorUp);
      }
      if (definition.baselineColorDown) {
        this.history.update(
          "scorecardFigures",
          id,
          "baselineColorDown",
          definition.baselineColorDown
        );
      }
    }
  }

  /**
   * Update the type of a chart. We may need to convert the data of the chart, losing some in the process.
   */
  private updateChartType(id: UID, newType: ChartType) {
    let chart: ChartDefinition;
    if ((chart = this.chartFigures[id])) {
      if (["pie", "line", "bar"].includes(newType)) {
        this.history.update("chartFigures", id, "type", newType as BasicChartType);
      }
      if (newType === "scorecard") {
        const dataset = chart.dataSets[0];
        this.history.update("scorecardFigures", id, {
          ...getDefaultScorecardChartDefinition(chart.sheetId),
          keyValue: dataset ? this.getDatasetData(dataset) : undefined,
          title: chart.title,
        });
        this.history.update("chartFigures", id, undefined);
      }
    } else if ((chart = this.scorecardFigures[id])) {
      if (["pie", "line", "bar"].includes(newType)) {
        this.history.update("chartFigures", id, {
          ...getDefaultBasicChartDefinition(chart.sheetId),
          type: newType as BasicChartType,
          dataSets: chart.keyValue
            ? this.createDataSets(
                [this.getters.getRangeString(chart.keyValue, chart.sheetId)],
                chart.sheetId,
                false
              )
            : [],
          title: chart.title,
        });
        this.history.update("scorecardFigures", id, undefined);
      }
    }
  }

  /** Get the data of a dataset (range without the labels) */
  private getDatasetData(ds: DataSet): Range {
    if (!ds.labelCell) {
      return ds.dataRange;
    }
    // TODO : this is ugly but it's the same thing we do in evaluation_chart.ts getData(). Maybe improve this
    // in a future task.
    const labelCellZone = ds.labelCell ? [zoneToXc(ds.labelCell.zone)] : [];
    const dataXC = recomputeZones([zoneToXc(ds.dataRange.zone)], labelCellZone)[0];

    return this.getters.getRangeFromSheetXC(ds.dataRange.sheetId, dataXC);
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
    if (isBasicChartDefinition(data)) {
      this.history.update("chartFigures", figure.id, data);
    } else if (data.type === "scorecard") {
      this.history.update("scorecardFigures", figure.id, data);
    }
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

  private checkEmptyChartMainData(cmd: CreateChartCommand | UpdateChartCommand): CommandResult {
    if ("keyValue" in cmd.definition) {
      return cmd.definition.keyValue ? CommandResult.Success : CommandResult.EmptyScorecardKeyValue;
    }

    if ("dataSets" in cmd.definition) {
      return cmd.definition.dataSets && cmd.definition.dataSets.length === 0
        ? CommandResult.EmptyDataSet
        : CommandResult.Success;
    }

    return CommandResult.Success;
  }

  private checkValidChartMainData(cmd: CreateChartCommand | UpdateChartCommand): CommandResult {
    if ("keyValue" in cmd.definition && cmd.definition.keyValue) {
      const invalidRanges = !rangeReference.test(cmd.definition.keyValue);
      return invalidRanges ? CommandResult.InvalidScorecardKeyValue : CommandResult.Success;
    }
    if ("dataSets" in cmd.definition && cmd.definition.dataSets) {
      const invalidRanges =
        cmd.definition.dataSets.find((range) => !rangeReference.test(range)) !== undefined;
      return invalidRanges ? CommandResult.InvalidDataSet : CommandResult.Success;
    }
    return CommandResult.Success;
  }

  private checkChartAuxiliaryRanges(cmd: CreateChartCommand | UpdateChartCommand): CommandResult {
    if ("labelRange" in cmd.definition && cmd.definition.labelRange) {
      return rangeReference.test(cmd.definition.labelRange)
        ? CommandResult.Success
        : CommandResult.InvalidLabelRange;
    }
    if ("baseline" in cmd.definition && cmd.definition.baseline) {
      return rangeReference.test(cmd.definition.baseline)
        ? CommandResult.Success
        : CommandResult.InvalidScorecardBaseline;
    }

    return CommandResult.Success;
  }
}
