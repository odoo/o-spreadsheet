import {
  ChartCreationContext,
  ChartDefinition,
  ChartType,
  DataSet,
  ExcelChartDataset,
  ExcelChartDefinition,
  TitleDesign,
} from "../../../types/chart";
import { CommandResult } from "../../../types/commands";
import { CoreGetters } from "../../../types/core_getters";
import { CellErrorType } from "../../../types/errors";
import { RangeAdapter, RangeAdapterFunctions, UID } from "../../../types/misc";
import { Range } from "../../../types/range";
import { Validator } from "../../../types/validator";
import { toExcelDataset, toExcelLabelRange } from "./chart_common";

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
  abstract updateRanges(rangeAdapters: RangeAdapterFunctions): AbstractChart;

  /**
   * Duplicate the chart when a sheet is duplicated.
   * The ranges that are in the same sheet as the chart are adapted to the new sheetId.
   */
  abstract duplicateInDuplicatedSheet(newSheetId: UID): AbstractChart;

  /**
   * Get a copy a the chart in the given sheetId.
   * The ranges of the chart will stay the same as the copied chart.
   */
  abstract copyInSheetId(sheetId: UID): AbstractChart;

  /**
   * Extract the ChartCreationContext of the chart
   */
  abstract getContextCreation(): ChartCreationContext;

  protected getCommonDataSetAttributesForExcel(
    labelRange: Range | undefined,
    dataSets: DataSet[],
    shouldRemoveFirstLabel: boolean
  ) {
    const excelDataSets: ExcelChartDataset[] = dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== "" && ds.range !== CellErrorType.InvalidReference);
    const excelLabelRange = toExcelLabelRange(this.getters, labelRange, shouldRemoveFirstLabel);
    return {
      dataSets: excelDataSets,
      labelRange: excelLabelRange,
    };
  }
}
