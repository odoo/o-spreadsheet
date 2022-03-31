import { INCORRECT_RANGE_STRING } from "../../constants";
import {
  chartFontColor,
  getDefaultBasicChartDefinition,
  getDefaultGaugeChartDefinition,
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
  DataSet,
  ExcelChartDataset,
  ExcelChartDefinition,
  ExcelWorkbookData,
  Figure,
  FigureData,
  GaugeChartDefinition,
  Range,
  ScorecardChartDefinition,
  UID,
  Validation,
  WorkbookData,
  Zone,
} from "../../types/index";
import { toXlsxHexColor } from "../../xlsx/helpers/colors";
import { CorePlugin } from "../core_plugin";
import {
  BasicChartType,
  BasicChartUIDefinitionUpdate,
  ChartDefinition,
  ChartType,
  ChartUIDefinition,
  ChartUIDefinitionUpdate,
  GaugeChartUIDefinition,
  GaugeChartUIDefinitionUpdate,
  isBasicChartUpdate,
  isGaugeChartUpdate,
  isScorecardChartUpdate,
  ScorecardChartUIDefinition,
  ScorecardChartUIDefinitionUpdate,
} from "./../../types/chart";

type RangeLimitsValidation = (rangeLimit: string, rangeLimitName: string) => CommandResult;

type InflectionPointValueValidation = (
  inflectionPointValue: string,
  inflectionPointName: string
) => CommandResult;

/**
 * Chart plugin
 *
 * This plugin creates and displays charts
 * */

interface ChartState {
  readonly chartFigures: Record<UID, BasicChartDefinition | undefined>;
  readonly scorecardFigures: Record<UID, ScorecardChartDefinition | undefined>;
  readonly gaugeFigures: Record<UID, GaugeChartDefinition | undefined>;
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
    "getGaugeChartDefinition",
    "getGaugeChartDefinitionUI",
    "getChartsIdBySheet",
    "getChartRanges",
  ] as const;
  readonly chartFigures: Record<UID, BasicChartDefinition> = {};
  readonly scorecardFigures: Record<UID, ScorecardChartDefinition> = {};
  readonly gaugeFigures: Record<UID, GaugeChartDefinition> = {};

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

    for (let [chartId, chart] of Object.entries(this.gaugeFigures)) {
      if (chart) {
        this.adaptChartRange(chart.dataRange, applyChange, {
          onRemove: () => this.history.update("gaugeFigures", chartId, "dataRange", undefined),
          onChange: (range) => this.history.update("gaugeFigures", chartId, "dataRange", range),
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
        const definition = cmd.definition;
        if (isBasicChartUpdate(definition)) {
          return this.checkValidations(
            definition,
            this.chainValidations(this.checkEmptyDataset, this.checkDataset),
            this.checkLabelRange
          );
        }
        if (isScorecardChartUpdate(definition)) {
          return this.checkValidations(
            definition,
            this.chainValidations(this.checkEmptyKeyValue, this.checkKeyValue),
            this.checkBaseline
          );
        }
        if (isGaugeChartUpdate(definition)) {
          return this.checkValidations(
            definition,
            this.chainValidations(this.checkEmptyDataRange, this.checkDataRange),
            this.chainValidations(
              this.checkRangeLimits(this.checkEmpty),
              this.checkRangeLimits(this.checkNaN),
              this.checkRangeMinBiggerThanRangeMax
            ),
            this.chainValidations(this.checkInflectionPointsValue(this.checkNaN))
          );
        }
        return success;
      default:
        return success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_CHART":
        const x = cmd.position ? cmd.position.x : 0;
        const y = cmd.position ? cmd.position.y : 0;
        const chartDefinition = this.createChartDefinition(cmd.definition, cmd.sheetId);
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
            const chartDefinitionToCopy: ChartDefinition = this.getChartDefinition(fig.id);
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
        const chartToDelete = this.getChartDefinition(cmd.id);
        if (chartToDelete) {
          this.history.update(this.getFigureType(chartToDelete), cmd.id, undefined);
        }
        break;
      case "DELETE_SHEET":
        for (let id of this.getChartsIdBySheet(cmd.sheetId)) {
          const chartToDelete = this.getChartDefinition(id);
          this.history.update(this.getFigureType(chartToDelete), id, undefined);
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

  getGaugeChartDefinition(figureId: UID): GaugeChartDefinition | undefined {
    return this.gaugeFigures[figureId];
  }

  getChartType(figureId: UID): ChartType | undefined {
    return this.getChartDefinition(figureId)?.type;
  }

  isChartDefined(figureId: UID): boolean {
    return this.getChartDefinition(figureId) !== undefined;
  }

  getChartSheetId(figureId: UID): UID | undefined {
    return this.getChartDefinition(figureId)?.sheetId;
  }

  getChartsIdBySheet(sheetId: UID) {
    return [
      ...Object.entries(this.chartFigures),
      ...Object.entries(this.scorecardFigures),
      ...Object.entries(this.gaugeFigures),
    ]
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

  getGaugeChartDefinitionUI(sheetId: UID, figureId: UID): GaugeChartUIDefinition | undefined {
    const data = this.gaugeFigures[figureId];
    if (!data) return undefined;
    return {
      ...data,
      title: data && data.title ? data.title : "",
      dataRange: data.dataRange ? this.getters.getRangeString(data.dataRange, sheetId) : undefined,
    };
  }

  /** Returns all the ranges contained in the chart corresponding to the given figure ID */
  getChartRanges(figureId: UID): Range[] {
    const chartDefinition = this.getChartDefinition(figureId);
    return getRangesInChartDefinition(chartDefinition);
  }

  private getChartDefinition(figureId: UID): ChartDefinition {
    return (
      this.chartFigures[figureId] || this.scorecardFigures[figureId] || this.gaugeFigures[figureId]
    );
  }

  private getChartDefinitionExcel(sheetId: UID, figureId: UID): ExcelChartDefinition | undefined {
    const data: ChartDefinition = this.chartFigures[figureId];
    const dataSets: ExcelChartDataset[] = data.dataSets
      .map((ds: DataSet) => this.toExcelDataset(ds))
      .filter((ds) => ds.range !== ""); // && range !== INCORRECT_RANGE_STRING ? show incorrect #ref ?
    const chartDefUI = this.getBasicChartDefinitionUI("forceSheetReference", figureId);
    // chartDefUI is undefined for scorecard and gauge charts, that are not supported in Excel
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
            const figureData: ChartUIDefinition = {
              ...figure.data,
            };
            const chartDefinition = this.createChartDefinition(figureData, sheet.id);
            switch (chartDefinition.type) {
              case "line":
              case "bar":
              case "pie":
                this.chartFigures[figure.id] = chartDefinition;
                break;
              case "scorecard":
                this.scorecardFigures[figure.id] = chartDefinition;
                break;
              case "gauge":
                this.gaugeFigures[figure.id] = chartDefinition;
                break;
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
              this.getScorecardChartDefinitionUI(sheet.id, figure.id) ||
              this.getGaugeChartDefinitionUI(sheet.id, figure.id);
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
  private createChartDefinition(definition: ChartUIDefinition, sheetId: UID): ChartDefinition {
    switch (definition.type) {
      case "bar":
      case "line":
      case "pie":
        return this.createBasicChartDefinition(definition, sheetId);
      case "scorecard":
        return this.createScorecardChartDefinition(definition, sheetId);
      case "gauge":
        return this.createGaugeChartDefinition(definition, sheetId);
    }
  }

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

  private createGaugeChartDefinition(
    definition: GaugeChartUIDefinition,
    sheetId: UID
  ): GaugeChartDefinition {
    return {
      ...definition,
      dataRange: definition.dataRange
        ? this.getters.getRangeFromSheetXC(sheetId, definition.dataRange)
        : undefined,
      sheetId,
    };
  }

  private getFigureType(
    chartDefinition: ChartDefinition
  ): "chartFigures" | "scorecardFigures" | "gaugeFigures" {
    switch (chartDefinition.type) {
      case "line":
      case "bar":
      case "pie":
        return "chartFigures";
      case "scorecard":
        return "scorecardFigures";
      case "gauge":
        return "gaugeFigures";
    }
  }

  /**
   * Update the chart definition linked to the given id with the attributes
   * given in the partial UI definition
   */
  private updateChartDefinition(id: UID, definition: ChartUIDefinitionUpdate) {
    const chart = this.getChartDefinition(id);
    if (!chart) {
      throw new Error(`There is no chart with the given id: ${id}`);
    }
    if (definition.type !== undefined) {
      this.updateChartType(id, definition.type);
    }
    const figureType = this.getFigureType(chart);
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
    } else if (isGaugeChartUpdate(definition)) {
      if (definition.dataRange !== undefined) {
        const dataRange = definition.dataRange
          ? this.getters.getRangeFromSheetXC(chart.sheetId, definition.dataRange)
          : undefined;
        this.history.update("gaugeFigures", id, "dataRange", dataRange);
      }
      if (definition.sectionRule !== undefined) {
        this.history.update("gaugeFigures", id, "sectionRule", definition.sectionRule);
      }
    }
  }

  /**
   * Update the type of a chart. We may need to convert the data of the chart, losing some in the process.
   */
  private updateChartType(id: UID, newType: ChartType) {
    const chart = this.getChartDefinition(id);
    switch (chart.type) {
      case "line":
      case "bar":
      case "pie":
        if (["pie", "line", "bar"].includes(newType)) {
          this.history.update("chartFigures", id, "type", newType as BasicChartType);
        } else {
          if (newType === "scorecard") {
            const dataset = chart.dataSets[0];
            this.history.update("scorecardFigures", id, {
              ...getDefaultScorecardChartDefinition(chart.sheetId),
              keyValue: dataset ? this.getDatasetData(dataset) : undefined,
              title: chart.title,
            });
          }

          if (newType === "gauge") {
            const dataset = chart.dataSets[0];
            this.history.update("gaugeFigures", id, {
              ...getDefaultGaugeChartDefinition(chart.sheetId),
              dataRange: dataset ? this.getDatasetData(dataset) : undefined,
              title: chart.title,
            });
          }

          this.history.update("chartFigures", id, undefined);
        }
        break;
      case "scorecard":
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
        }

        if (newType === "gauge") {
          this.history.update("gaugeFigures", id, {
            ...getDefaultGaugeChartDefinition(chart.sheetId),
            dataRange: chart.keyValue,
            title: chart.title,
          });
        }

        this.history.update("scorecardFigures", id, undefined);
        break;
      case "gauge":
        if (["pie", "line", "bar"].includes(newType)) {
          this.history.update("chartFigures", id, {
            ...getDefaultBasicChartDefinition(chart.sheetId),
            type: newType as BasicChartType,
            dataSets: chart.dataRange
              ? this.createDataSets(
                  [this.getters.getRangeString(chart.dataRange, chart.sheetId)],
                  chart.sheetId,
                  false
                )
              : [],
            title: chart.title,
          });
        }

        if (newType === "scorecard") {
          this.history.update("scorecardFigures", id, {
            ...getDefaultScorecardChartDefinition(chart.sheetId),
            keyValue: chart.dataRange,
            title: chart.title,
          });
        }

        this.history.update("gaugeFigures", id, undefined);
        break;
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
    this.history.update(this.getFigureType(data), figure.id, data);
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

  // ---------------------------------------------------------------------------
  // BASIC CHART CHECK (LINE | BAR | PIE)
  // ---------------------------------------------------------------------------

  private checkEmptyDataset(
    definition: BasicChartUIDefinition | BasicChartUIDefinitionUpdate
  ): CommandResult {
    return "dataSets" in definition && definition.dataSets && definition.dataSets.length === 0
      ? CommandResult.EmptyDataSet
      : CommandResult.Success;
  }

  private checkDataset(
    definition: BasicChartUIDefinition | BasicChartUIDefinitionUpdate
  ): CommandResult {
    if ("dataSets" in definition && definition.dataSets) {
      const invalidRanges =
        definition.dataSets.find((range) => !rangeReference.test(range)) !== undefined;
      if (invalidRanges) {
        return CommandResult.InvalidDataSet;
      }
    }
    return CommandResult.Success;
  }

  private checkLabelRange(
    definition: BasicChartUIDefinition | BasicChartUIDefinitionUpdate
  ): CommandResult {
    if ("labelRange" in definition && definition.labelRange) {
      const invalidLabels = !rangeReference.test(definition.labelRange || "");
      if (invalidLabels) {
        return CommandResult.InvalidLabelRange;
      }
    }
    return CommandResult.Success;
  }

  // ---------------------------------------------------------------------------
  // Scorecard CHART CHECK
  // ---------------------------------------------------------------------------

  private checkEmptyKeyValue(
    definition: ScorecardChartUIDefinition | ScorecardChartUIDefinitionUpdate
  ): CommandResult {
    return "keyValue" in definition && !definition.keyValue
      ? CommandResult.EmptyScorecardKeyValue
      : CommandResult.Success;
  }

  private checkKeyValue(
    definition: ScorecardChartUIDefinition | ScorecardChartUIDefinitionUpdate
  ): CommandResult {
    return "keyValue" in definition &&
      definition.keyValue &&
      !rangeReference.test(definition.keyValue)
      ? CommandResult.InvalidScorecardKeyValue
      : CommandResult.Success;
  }

  private checkBaseline(
    definition: ScorecardChartUIDefinition | ScorecardChartUIDefinitionUpdate
  ): CommandResult {
    return "baseline" in definition &&
      definition.baseline &&
      !rangeReference.test(definition.baseline)
      ? CommandResult.InvalidScorecardBaseline
      : CommandResult.Success;
  }

  // ---------------------------------------------------------------------------
  // GAUGE CHART CHECK
  // ---------------------------------------------------------------------------

  private checkEmptyDataRange(
    definition: GaugeChartUIDefinition | GaugeChartUIDefinitionUpdate
  ): CommandResult {
    return "dataRange" in definition && !definition.dataRange
      ? CommandResult.EmptyGaugeDataRange
      : CommandResult.Success;
  }

  private checkDataRange(
    definition: GaugeChartUIDefinition | GaugeChartUIDefinitionUpdate
  ): CommandResult {
    return "dataRange" in definition &&
      definition.dataRange &&
      !rangeReference.test(definition.dataRange)
      ? CommandResult.InvalidGaugeDataRange
      : CommandResult.Success;
  }

  private checkRangeLimits(
    check: RangeLimitsValidation
  ): Validation<GaugeChartUIDefinition | GaugeChartUIDefinitionUpdate> {
    return this.batchValidations(
      (definition) => {
        if ("sectionRule" in definition && definition.sectionRule) {
          return check(definition.sectionRule.rangeMin, "rangeMin");
        }
        return CommandResult.Success;
      },
      (definition) => {
        if ("sectionRule" in definition && definition.sectionRule) {
          return check(definition.sectionRule.rangeMax, "rangeMax");
        }
        return CommandResult.Success;
      }
    );
  }

  private checkInflectionPointsValue(
    check: InflectionPointValueValidation
  ): Validation<GaugeChartUIDefinition | GaugeChartUIDefinitionUpdate> {
    return this.batchValidations(
      (definition) => {
        if ("sectionRule" in definition && definition.sectionRule) {
          return check(
            definition.sectionRule.lowerInflectionPoint.value,
            "lowerInflectionPointValue"
          );
        }
        return CommandResult.Success;
      },
      (definition) => {
        if ("sectionRule" in definition && definition.sectionRule) {
          return check(
            definition.sectionRule.upperInflectionPoint.value,
            "upperInflectionPointValue"
          );
        }
        return CommandResult.Success;
      }
    );
  }

  private checkRangeMinBiggerThanRangeMax(
    definition: GaugeChartUIDefinition | GaugeChartUIDefinitionUpdate
  ): CommandResult {
    if ("sectionRule" in definition && definition.sectionRule) {
      if (Number(definition.sectionRule.rangeMin) >= Number(definition.sectionRule.rangeMax)) {
        return CommandResult.GaugeRangeMinBiggerThanRangeMax;
      }
    }
    return CommandResult.Success;
  }

  private checkEmpty(value: string, valueName: string) {
    if (value === "") {
      switch (valueName) {
        case "rangeMin":
          return CommandResult.EmptyGaugeRangeMin;
        case "rangeMax":
          return CommandResult.EmptyGaugeRangeMax;
      }
    }
    return CommandResult.Success;
  }

  private checkNaN(value: string, valueName: string) {
    if (isNaN(value as any)) {
      switch (valueName) {
        case "rangeMin":
          return CommandResult.GaugeRangeMinNaN;
        case "rangeMax":
          return CommandResult.GaugeRangeMaxNaN;
        case "lowerInflectionPointValue":
          return CommandResult.GaugeLowerInflectionPointNaN;
        case "upperInflectionPointValue":
          return CommandResult.GaugeUpperInflectionPointNaN;
      }
    }
    return CommandResult.Success;
  }
}
