import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  CommandResult,
  CoreGetters,
  RemoveColumnsRowsCommand,
  UID,
} from "../../types";
import {
  ChartCreationContext,
  ChartDefinition,
  ChartType,
  ExcelChartDefinition,
} from "../../types/chart/chart";
import { Validator } from "../../types/validator";

/**
 * AbstractChart is the class from which every Chart should inherit.
 * The role of this class is to maintain the state of each chart.
 */
export abstract class AbstractChart {
  readonly id: UID;
  readonly sheetId: UID;
  readonly title: string;
  abstract readonly type: ChartType;
  protected readonly getters: CoreGetters;

  constructor(id: UID, definition: ChartDefinition, sheetId: UID, getters: CoreGetters) {
    this.id = id;
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
   */
  abstract copyForSheetId(sheetId: UID): AbstractChart;

  /**
   * Extract the ChartCreationContext of the chart
   */
  abstract getContextCreation(): ChartCreationContext;

  /**
   * Get the sheet ids that are used in the ranges of the chart.
   */
  abstract getSheetIdsUsedInChartRanges(): UID[];
}
