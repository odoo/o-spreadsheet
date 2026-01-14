import {
  ChartCreationContext,
  ChartDefinition,
  ChartType,
  ChartWithDataSetDefinition,
  DataSet,
  ExcelChartDataset,
  ExcelChartDefinition,
  TitleDesign,
} from "../../../types/chart";
import { CommandResult } from "../../../types/commands";
import { CoreGetters } from "../../../types/core_getters";
import { CellErrorType } from "../../../types/errors";
import { RangeAdapter, RangeAdapterFunctions, UID } from "../../../types/misc";
import { Validator } from "../../../types/validator";
import { createValidRange } from "../../range";
import { getZoneArea } from "../../zones";
import {
  createDataSets,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
} from "./chart_common";

/**
 * AbstractChart is the class from which every Chart should inherit.
 * The role of this class is to maintain the state of each chart.
 */
export abstract class AbstractChart {
  readonly sheetId: UID;
  readonly title: TitleDesign;
  abstract readonly type: ChartType;
  protected readonly getters: CoreGetters;
  readonly humanize: boolean | undefined;

  static commonKeys: readonly (keyof ChartDefinition)[] = [
    "type",
    "title",
    "background",
    "humanize",
  ];
  static dataSetKeys: readonly (keyof ChartWithDataSetDefinition)[] = ["dataSetStyles"];

  constructor(definition: ChartDefinition, sheetId: UID, getters: CoreGetters) {
    this.title = definition.title;
    this.sheetId = sheetId;
    this.getters = getters;
    this.humanize = definition.humanize;
  }

  /**
   * Validate the chart definition given as arguments. This function will be
   * called from allowDispatch function
   */
  static validateChartDefinition(
    validator: Validator,
    definition: ChartDefinition
  ): CommandResult | CommandResult[] {
    throw new Error("This method should be implemented by sub class");
  }

  /**
   * Get a new chart definition transformed with the executed command. This
   * functions will be called during operational transform process
   */
  static transformDefinition(
    chartSheetId: UID,
    definition: ChartDefinition,
    applyChange: RangeAdapter
  ): ChartDefinition {
    throw new Error("This method should be implemented by sub class");
  }

  /**
   * Get an empty definition based on the given context
   */
  static getDefinitionFromContextCreation(context: ChartCreationContext): ChartDefinition {
    throw new Error("This method should be implemented by sub class");
  }

  /**
   * Get the definition of the chart
   */
  abstract getDefinition(): ChartDefinition;

  /**
   * Get the definition of the chart that will be used for excel export.
   * If the chart is not supported by Excel, this function returns undefined.
   */
  abstract getDefinitionForExcel(getters: CoreGetters): ExcelChartDefinition | undefined;

  /**
   * This function should be used to update all the ranges of the chart after
   * a grid change (add/remove col/row, rename sheet, ...)
   */
  updateRanges(rangeAdapters: RangeAdapterFunctions): AbstractChart {
    return this;
  }

  /**
   * Duplicate the chart when a sheet is duplicated.
   * The ranges that are in the same sheet as the chart are adapted to the new sheetId.
   */
  duplicateInDuplicatedSheet(newSheetId: UID): AbstractChart {
    return this;
  }

  /**
   * Get a copy a the chart in the given sheetId.
   * The ranges of the chart will stay the same as the copied chart.
   */
  copyInSheetId(sheetId: UID): AbstractChart {
    return this;
  }

  /**
   * Extract the ChartCreationContext of the chart
   */
  abstract getContextCreation(): ChartCreationContext;

  protected getCommonDataSetAttributesForExcel(definition: ChartWithDataSetDefinition) {
    const dataSets = createDataSets(this.getters, this.sheetId, definition.dataSource);
    const labelRange = createValidRange(
      this.getters,
      this.sheetId,
      definition.dataSource.labelRange
    );
    const excelDataSets: ExcelChartDataset[] = dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, definition, ds))
      .filter((ds) => ds.range !== "" && ds.range !== CellErrorType.InvalidReference);
    const datasetLength = dataSets[0] ? getZoneArea(dataSets[0].dataRange.zone) : undefined;
    const labelLength = labelRange ? getZoneArea(labelRange.zone) : 0;
    const _shouldRemoveFirstLabel = shouldRemoveFirstLabel(
      labelLength,
      datasetLength,
      "dataSource" in definition ? definition.dataSource.dataSetsHaveTitle : false
    );
    const excelLabelRange = toExcelLabelRange(this.getters, labelRange, _shouldRemoveFirstLabel);
    return {
      dataSets: excelDataSets,
      labelRange: excelLabelRange,
    };
  }
}
