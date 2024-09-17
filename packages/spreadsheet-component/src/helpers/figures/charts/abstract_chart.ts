import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  CommandResult,
  CoreGetters,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import {
  ChartCreationContext,
  ChartDefinition,
  ChartType,
  ExcelChartDefinition,
  TitleDesign,
} from "../../../types/chart/chart";
import { Validator } from "../../../types/validator";

/**
 * AbstractChart is the class from which every Chart should inherit.
 * The role of this class is to maintain the state of each chart.
 */
export abstract class AbstractChart {
  readonly sheetId: UID;
  readonly title: TitleDesign;
  abstract readonly type: ChartType;
  protected readonly getters: CoreGetters;

  constructor(definition: ChartDefinition, sheetId: UID, getters: CoreGetters) {
    this.title = definition.title;
    this.sheetId = sheetId;
    this.getters = getters;
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
    definition: ChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
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
  abstract getDefinitionForExcel(): ExcelChartDefinition | undefined;

  /**
   * This function should be used to update all the ranges of the chart after
   * a grid change (add/remove col/row, rename sheet, ...)
   */
  abstract updateRanges(applyChange: ApplyRangeChange): AbstractChart;

  /**
   * Get a copy a the chart adapted to the given sheetId.
   * The ranges that are in the same sheet as the chart will be adapted to the given sheetId.
   */
  abstract copyForSheetId(sheetId: UID): AbstractChart;

  /**
   * Get a copy a the chart in the given sheetId.
   * The ranges of the chart will stay the same as the copied chart.
   */
  abstract copyInSheetId(sheetId: UID): AbstractChart;

  /**
   * Extract the ChartCreationContext of the chart
   */
  abstract getContextCreation(): ChartCreationContext;
}
