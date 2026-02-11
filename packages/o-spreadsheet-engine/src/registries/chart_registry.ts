import {
  ChartCreationContext,
  ChartData,
  ChartRuntime,
  ChartType,
  ChartTypeDefinition,
  DatasetValues,
  ExcelChartDefinition,
} from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { Getters } from "../types/getters";
import { RangeAdapterFunctions, UID } from "../types/misc";
import { Range } from "../types/range";
import { Validator } from "../types/validator";
import { ChartDataSourceBuilder } from "./chart_data_source_registry";
import { Registry } from "./registry";

/**
 * Instantiate a chart object based on a definition
 */
export interface ChartTypeBuilder<T extends ChartType> {
  fromStrDefinition(
    definition: ChartTypeDefinition<T, string>,
    sheetId: UID,
    getters: CoreGetters
  ): Omit<ChartTypeDefinition<T, Range>, "dataSource">;
  toStrDefinition(
    definition: ChartTypeDefinition<T, Range>,
    sheetId: UID,
    getters: CoreGetters
  ): Omit<ChartTypeDefinition<T, string>, "dataSource">;
  validateDefinition: (
    validator: Validator,
    definition: ChartTypeDefinition<NoInfer<T>, string>
  ) => CommandResult | CommandResult[];
  transformDefinition(
    definition: ChartTypeDefinition<T, string>,
    sheetId: UID,
    rangeAdapters: RangeAdapterFunctions
  ): ChartTypeDefinition<T, string>;
  /**
   * Update all ranges of the chart after
   * a grid change (add/remove col/row, rename sheet, ...)
   */
  updateRanges(
    definition: ChartTypeDefinition<T, Range>,
    rangeAdapters: RangeAdapterFunctions,
    sheetId: UID
  ): ChartTypeDefinition<T, Range>;
  /**
   * Duplicate the chart when a sheet is duplicated.
   * The ranges that are in the same sheet as the chart are adapted to the new sheetId.
   */
  duplicateInDuplicatedSheet(
    definition: ChartTypeDefinition<T, Range>,
    sheetIdFrom: UID,
    sheetIdTo: UID,
    getters: CoreGetters
  ): ChartTypeDefinition<T, Range>;
  /**
   * Get a copy a the chart in the given sheetId.
   * The ranges of the chart will stay the same as the copied chart.
   */
  copyInSheetId(
    definition: ChartTypeDefinition<T, Range>,
    sheetIdFrom: UID,
    sheetIdTo: UID,
    getters: CoreGetters
  ): ChartTypeDefinition<T, Range>;
  getContextCreation(
    definition: ChartTypeDefinition<T, string>,
    dataSourceBuilder: ChartDataSourceBuilder<any>,
    dataSource: ChartTypeDefinition<T, string>["dataSource"]
  ): ChartCreationContext;
  getDefinitionFromContextCreation(context: ChartCreationContext): ChartTypeDefinition<T, string>;
  /**
   * Get the definition of the chart used for excel export.
   * If the chart is not supported by Excel, this function returns undefined.
   */
  getDefinitionForExcel(
    getters: Getters,
    definition: ChartTypeDefinition<T, Range>,
    params: Pick<ExcelChartDefinition, "dataSets" | "labelRange">
  ): ExcelChartDefinition | undefined;
  getRuntime(
    getters: Getters,
    definition: ChartTypeDefinition<T, Range>,
    chartDataExtractors: ChartDataExtractors,
    sheetId: UID,
    goToDataSet?: (name: string, dataSet: DatasetValues) => void
  ): ChartRuntime;
  allowedDefinitionKeys: readonly string[];
  sequence: number;
  dataSeriesLimit?: number;
}

interface ChartDataExtractors {
  extractData(): ChartData;
  extractHierarchicalData(): ChartData;
}

interface ChartTypeRegistry extends Registry<ChartTypeBuilder<any>> {
  add<T extends ChartType>(type: T, builder: ChartTypeBuilder<T>): this;
}

export const chartTypeRegistry: ChartTypeRegistry = new Registry();
