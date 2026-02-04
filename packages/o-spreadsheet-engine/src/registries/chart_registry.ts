import {
  ChartCreationContext,
  ChartRuntime,
  ChartType,
  ChartTypeDefinition,
  ExcelChartDefinition,
} from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { Getters } from "../types/getters";
import { RangeAdapterFunctions, UID } from "../types/misc";
import { Range } from "../types/range";
import { Validator } from "../types/validator";
import { ChartDataSourceHandler } from "./chart_data_source_registry";
import { Registry } from "./registry";

/**
 * Instantiate a chart object based on a definition
 */
export interface ChartBuilder<T extends ChartType> {
  // ChartTypeHandler: {
  //   new (...args: any[]): AbstractChart;
  // };
  validateChartDefinition: (
    validator: Validator,
    definition: ChartTypeDefinition<NoInfer<T>, string>
  ) => CommandResult | CommandResult[];
  transformDefinition(
    chartSheetId: UID,
    definition: ChartTypeDefinition<T, string>,
    rangeAdapters: RangeAdapterFunctions
  ): ChartTypeDefinition<T, string>;
  updateRanges(
    definition: ChartTypeDefinition<T, Range>,
    rangeAdapters: RangeAdapterFunctions
  ): ChartTypeDefinition<T, Range>;
  duplicateInDuplicatedSheet(
    definition: ChartTypeDefinition<T, Range>,
    newSheetId: UID
  ): ChartTypeDefinition<T, Range>;
  copyInSheetId(
    definition: ChartTypeDefinition<T, Range>,
    sheetId: UID
  ): ChartTypeDefinition<T, Range>;
  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: ChartTypeDefinition<T, string>
  ): ChartCreationContext;
  getChartDefinitionFromContextCreation(
    context: ChartCreationContext
  ): ChartTypeDefinition<T, string>;
  getDefinitionForExcel(
    getters: CoreGetters,
    definition: ChartTypeDefinition<T, Range>,
    params: Pick<ExcelChartDefinition, "dataSets" | "labelRange">
  ): ExcelChartDefinition | undefined;
  postProcess(
    getters: CoreGetters,
    sheetId: UID,
    definition: ChartTypeDefinition<T, string>
  ): ChartTypeDefinition<T, string>;
  getRuntime(
    getters: Getters,
    definition: ChartTypeDefinition<T, Range>,
    dataSource: ChartDataSourceHandler
  ): ChartRuntime;
  allowedDefinitionKeys: readonly string[];
  sequence: number;
  dataSeriesLimit?: number;
}

interface ChartRegistry extends Registry<ChartBuilder<any>> {
  add<T extends ChartType>(type: T, builder: ChartBuilder<T>): this;
}

export const chartRegistry: ChartRegistry = new Registry();
