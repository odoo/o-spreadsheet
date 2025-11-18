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
export interface ChartBuilder {
  /**
   * Check if this factory should be used
   */
  match: (type: ChartType) => boolean;
  createChart: (definition: ChartDefinition, sheetId: UID, getters: CoreGetters) => AbstractChart;
  getChartRuntime: (chart: AbstractChart, getters: Getters) => ChartRuntime;
  validateChartDefinition(
    validator: Validator,
    definition: ChartDefinition
  ): CommandResult | CommandResult[];
  transformDefinition(
    chartSheetId: UID,
    definition: ChartDefinition,
    applyRange: RangeAdapter
  ): ChartDefinition;
  getChartDefinitionFromContextCreation(context: ChartCreationContext): ChartDefinition;
  allowedDefinitionKeys: readonly string[];
  sequence: number;
  dataSeriesLimit?: number;
}

/**
 * This registry is intended to map a cell content (raw string) to
 * an instance of a cell.
 */
export const chartRegistry = new Registry<ChartBuilder>();
