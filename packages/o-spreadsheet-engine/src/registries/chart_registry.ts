import { AbstractChart } from "../helpers/figures/charts/abstract_chart";
import { ChartCreationContext, ChartType, ChartTypeDefinition } from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { RangeAdapterFunctions, UID } from "../types/misc";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

/**
 * Instantiate a chart object based on a definition
 */
export interface ChartBuilder<T extends ChartType, D> {
  ChartTypeHandler: {
    new (...args: any[]): AbstractChart;
    fromStrDefinition?(
      getters: CoreGetters,
      sheetId: UID,
      definition: ChartTypeDefinition<T, string>
    ): AbstractChart;
    validateChartDefinition: (
      validator: Validator,
      definition: ChartTypeDefinition<NoInfer<T>, string>
    ) => CommandResult | CommandResult[];
  };
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
