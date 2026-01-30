import { ChartDataSourceHandler } from "../../../registries/chart_data_source_registry";
import {
  ChartCreationContext,
  ChartData,
  ChartDefinition,
  ChartDefinitionWithDataSource,
  ChartRuntime,
  ChartType,
  ExcelChartDefinition,
  TitleDesign,
} from "../../../types/chart";
import { CommandResult } from "../../../types/commands";
import { CoreGetters } from "../../../types/core_getters";
import { Getters } from "../../../types/getters";
import { RangeAdapterFunctions, UID } from "../../../types/misc";
import { Range } from "../../../types/range";
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
  readonly humanize: boolean | undefined;

  static commonKeys: readonly (keyof ChartDefinition)[] = [
    "type",
    "title",
    "background",
    "humanize",
  ];
  static dataSetKeys: readonly (keyof ChartDefinitionWithDataSource)[] = ["dataSetStyles"];

  constructor(
    definition: Pick<ChartDefinition, "title" | "humanize">,
    sheetId: UID,
    getters: CoreGetters
  ) {
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
    definition: ChartDefinition<string>
  ): CommandResult | CommandResult[] {
    return CommandResult.Success;
  }

  /**
   * Get a new chart definition transformed with the executed command. This
   * functions will be called during operational transform process
   */
  static transformDefinition(
    chartSheetId: UID,
    definition: ChartDefinition,
    rangeAdapters: RangeAdapterFunctions
  ): ChartDefinition {
    throw new Error("This method should be implemented by sub class");
  }

  /**
   * Get an empty definition based on the given context
   */
  static getDefinitionFromContextCreation(context: ChartCreationContext): ChartDefinition<string> {
    throw new Error("This method should be implemented by sub class");
  }

  /**
   * Get the definition of the chart
   */
  abstract getRangeDefinition(): ChartDefinition<Range>;

  abstract getRuntime(getters: Getters, data: ChartData): ChartRuntime;

  getDefinition(): Omit<ChartDefinition<string>, "dataSource"> {
    return this.getRangeDefinition();
  }

  /**
   * Get the definition of the chart that will be used for excel export.
   * If the chart is not supported by Excel, this function returns undefined.
   */
  abstract getDefinitionForExcel(
    getters: CoreGetters,
    { dataSets, labelRange }: Pick<ExcelChartDefinition, "dataSets" | "labelRange">
  ): ExcelChartDefinition | undefined;

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
  duplicateInDuplicatedSheet(newSheetId: UID): ChartDefinition<Range> {
    return this.getRangeDefinition();
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
  abstract getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: ChartDefinition<string>
  ): ChartCreationContext;
}
