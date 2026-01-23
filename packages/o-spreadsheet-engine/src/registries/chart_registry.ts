import { MyChart } from "../helpers/figures/chart";
import { AbstractChart } from "../helpers/figures/charts/abstract_chart";
import { ChartCreationContext, ChartRuntime, ChartType, ChartTypeDefinition } from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { Getters } from "../types/getters";
import { RangeAdapterFunctions, UID } from "../types/misc";
import { Range } from "../types/range";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

/**
 * Instantiate a chart object based on a definition
 */
export interface ChartBuilder<T extends ChartType, D> {
  /**
   * Check if this factory should be used
   */
  match: (type: T) => boolean;
  ChartTypeHandler: {
    new (...args: any[]): AbstractChart;
    validateChartDefinition: (
      validator: Validator,
      definition: ChartTypeDefinition<NoInfer<T>, string>
    ) => CommandResult | CommandResult[];
  };
  extractData: (definition: ChartTypeDefinition<T, Range>, sheetId: UID, getters: Getters) => D;
  getChartRuntime: (
    getters: Getters,
    chart: MyChart["chartTypeHandler"],
    data: NoInfer<D>
  ) => ChartRuntime;
  transformDefinition(
    chartSheetId: UID,
    definition: ChartTypeDefinition<T, string>,
    rangeAdapters: RangeAdapterFunctions
  ): ChartTypeDefinition<T, string>;
  getChartDefinitionFromContextCreation(
    context: ChartCreationContext
  ): ChartTypeDefinition<T, string>;
  postProcess?(
    getters: CoreGetters,
    sheetId: UID,
    definition: ChartTypeDefinition<T, string>
  ): ChartTypeDefinition<T, string>;
  allowedDefinitionKeys: readonly string[];
  sequence: number;
  dataSeriesLimit?: number;
}

interface ChartRegistry extends Registry<ChartBuilder<any, unknown>> {
  add<T extends ChartType, D>(type: T, builder: ChartBuilder<T, D>): this;
}

export const chartRegistry: ChartRegistry = new Registry();
