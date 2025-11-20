import { AbstractChart } from "../helpers/figures/charts/abstract_chart";
import {
  ChartCreationContext,
  ChartData,
  ChartDefinition,
  ChartRuntime,
  ChartType,
} from "../types/chart";
import { CommandResult } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { Getters } from "../types/getters";
import { RangeAdapter, UID } from "../types/misc";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

/**
 * Instantiate a chart object based on a definition
 */
export interface ChartBuilder<T extends ChartDefinition> {
  /**
   * Check if this factory should be used
   */
  match: (type: T["type"]) => boolean;
  extractData: (definition: T, sheetId: UID, getters: CoreGetters) => ChartData;
  createChart: (definition: T, sheetId: UID, getters: CoreGetters) => AbstractChart;
  getChartRuntime: (chart: AbstractChart, getters: Getters) => ChartRuntime;
  validateChartDefinition(validator: Validator, definition: T): CommandResult | CommandResult[];
  transformDefinition(chartSheetId: UID, definition: T, applyRange: RangeAdapter): T;
  getChartDefinitionFromContextCreation(context: ChartCreationContext): T;
  allowedDefinitionKeys: readonly string[];
  sequence: number;
  dataSeriesLimit?: number;
}

interface ChartRegistry extends Registry<ChartBuilder<ChartDefinition>> {
  add<T extends ChartType>(
    type: T,
    builder: NoInfer<ChartBuilder<Extract<ChartDefinition, { type: T }>>>
  ): this;
}

/**
 * This registry is intended to map a cell content (raw string) to
 * an instance of a cell.
 */
export const chartRegistry: ChartRegistry = new Registry();
