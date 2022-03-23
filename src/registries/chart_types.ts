import { Component } from "@odoo/owl";
import { AbstractChart } from "../helpers/charts/abstract_chart";
import { Registry } from "../registry";
import {
  AddColumnsRowsCommand,
  CommandResult,
  CoreGetters,
  Getters,
  RemoveColumnsRowsCommand,
  UID,
} from "../types";
import {
  ChartCreationContext,
  ChartDefinition,
  ChartRuntime,
  ChartType,
} from "../types/chart/chart";
import { Validator } from "../types/validator";

//------------------------------------------------------------------------------
// Chart Registry
//------------------------------------------------------------------------------

/**
 * Instantiate a chart object based on a definition
 */
interface ChartBuilder {
  /**
   * Check if this factory should be used
   */
  match: (type: ChartType) => boolean;
  createChart: (
    id: UID,
    definition: ChartDefinition,
    sheetId: UID,
    getters: CoreGetters
  ) => AbstractChart;
  getChartRuntime: (chart: AbstractChart, getters: Getters) => ChartRuntime;
  validateChartDefinition(
    validator: Validator,
    definition: ChartDefinition
  ): CommandResult | CommandResult[];
  transformDefinition(
    definition: ChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ChartDefinition;
  getChartDefinitionFromContextCreation(context: ChartCreationContext): ChartDefinition;
  name: string;
}

/**
 * This registry is intended to map a cell content (raw string) to
 * an instance of a cell.
 */
export const chartRegistry = new Registry<ChartBuilder>();

export const chartComponentRegistry = new Registry<new (...args: any) => Component>();
