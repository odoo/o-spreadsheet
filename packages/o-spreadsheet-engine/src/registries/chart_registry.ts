import { AbstractChart } from "../helpers/figures/charts/abstract_chart";
import { ChartCreationContext, ChartDefinition, ChartRuntime, ChartType } from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { Getters } from "../types/getters";
import { RangeAdapter, UID } from "../types/misc";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

/**
 * Instantiate a chart object based on a definition
 */
export interface ChartBuilder<T extends ChartDefinition, D> {
  /**
   * Check if this factory should be used
   */
  match: (type: T["type"]) => boolean;
  createChart: (definition: T, sheetId: UID, getters: CoreGetters) => AbstractChart;
  extractData: (definition: T, sheetId: UID, getters: Getters) => D;
  getChartRuntime: (getters: Getters, chart: AbstractChart, data: NoInfer<D>) => ChartRuntime;
  validateChartDefinition(validator: Validator, definition: T): CommandResult | CommandResult[];
  transformDefinition(chartSheetId: UID, definition: T, applyRange: RangeAdapter): T;
  getChartDefinitionFromContextCreation(context: ChartCreationContext): T;
  postProcess?<T2 extends T>(getters: CoreGetters, sheetId: UID, definition: T2): T2;
  allowedDefinitionKeys: readonly string[];
  sequence: number;
  dataSeriesLimit?: number;
}

interface ChartRegistry extends Registry<ChartBuilder<ChartDefinition, unknown>> {
  add<T extends ChartType, D>(
    type: T,
    builder: ChartBuilder<Extract<ChartDefinition, { type: NoInfer<T> }>, D>
  ): this;
}

export const chartRegistry: ChartRegistry = new Registry();
