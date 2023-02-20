import { Component } from "@odoo/owl";
import { ChartJsComponent } from "../components/figures/chart/chartJs/chartjs";
import { ScorecardChart as ScorecardChartComponent } from "../components/figures/chart/scorecard/chart_scorecard";
import { AbstractChart } from "../helpers/figures/charts/abstract_chart";
import { BarChart, createBarChartRuntime } from "../helpers/figures/charts/bar_chart";
import { createGaugeChartRuntime, GaugeChart } from "../helpers/figures/charts/gauge_chart";
import { createLineChartRuntime, LineChart } from "../helpers/figures/charts/line_chart";
import { createPieChartRuntime, PieChart } from "../helpers/figures/charts/pie_chart";
import {
  createScorecardChartRuntime,
  ScorecardChart,
} from "../helpers/figures/charts/scorecard_chart";
import { _lt } from "../translation";
import {
  AddColumnsRowsCommand,
  CommandResult,
  CoreGetters,
  Getters,
  RemoveColumnsRowsCommand,
  UID,
} from "../types";
import {
  BarChartDefinition,
  GaugeChartDefinition,
  LineChartDefinition,
  PieChartDefinition,
  ScorecardChartDefinition,
} from "../types/chart";
import {
  ChartCreationContext,
  ChartDefinition,
  ChartRuntime,
  ChartType,
} from "../types/chart/chart";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

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
  createChart: (definition: ChartDefinition, sheetId: UID, getters: CoreGetters) => AbstractChart;
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
chartRegistry.add("bar", {
  match: (type) => type === "bar",
  createChart: (definition, sheetId, getters) =>
    new BarChart(definition as BarChartDefinition, sheetId, getters),
  getChartRuntime: createBarChartRuntime,
  validateChartDefinition: (validator, definition: BarChartDefinition) =>
    BarChart.validateChartDefinition(validator, definition),
  transformDefinition: (
    definition: BarChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ) => BarChart.transformDefinition(definition, executed),
  getChartDefinitionFromContextCreation: (context: ChartCreationContext) =>
    BarChart.getDefinitionFromContextCreation(context),
  name: _lt("Bar"),
});
chartRegistry.add("line", {
  match: (type) => type === "line",
  createChart: (definition, sheetId, getters) =>
    new LineChart(definition as LineChartDefinition, sheetId, getters),
  getChartRuntime: createLineChartRuntime,
  validateChartDefinition: (validator, definition) =>
    LineChart.validateChartDefinition(validator, definition as LineChartDefinition),
  transformDefinition: (
    definition: LineChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ) => LineChart.transformDefinition(definition, executed),
  getChartDefinitionFromContextCreation: (context: ChartCreationContext) =>
    LineChart.getDefinitionFromContextCreation(context),
  name: _lt("Line"),
});
chartRegistry.add("pie", {
  match: (type) => type === "pie",
  createChart: (definition, sheetId, getters) =>
    new PieChart(definition as PieChartDefinition, sheetId, getters),
  getChartRuntime: createPieChartRuntime,
  validateChartDefinition: (validator, definition: PieChartDefinition) =>
    PieChart.validateChartDefinition(validator, definition),
  transformDefinition: (
    definition: PieChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ) => PieChart.transformDefinition(definition, executed),
  getChartDefinitionFromContextCreation: (context: ChartCreationContext) =>
    PieChart.getDefinitionFromContextCreation(context),
  name: _lt("Pie"),
});
chartRegistry.add("scorecard", {
  match: (type) => type === "scorecard",
  createChart: (definition, sheetId, getters) =>
    new ScorecardChart(definition as ScorecardChartDefinition, sheetId, getters),
  getChartRuntime: createScorecardChartRuntime,
  validateChartDefinition: (validator, definition) =>
    ScorecardChart.validateChartDefinition(validator, definition as ScorecardChartDefinition),
  transformDefinition: (
    definition: ScorecardChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ) => ScorecardChart.transformDefinition(definition, executed),
  getChartDefinitionFromContextCreation: (context: ChartCreationContext) =>
    ScorecardChart.getDefinitionFromContextCreation(context),
  name: _lt("Scorecard"),
});
chartRegistry.add("gauge", {
  match: (type) => type === "gauge",
  createChart: (definition, sheetId, getters) =>
    new GaugeChart(definition as GaugeChartDefinition, sheetId, getters),
  getChartRuntime: createGaugeChartRuntime,
  validateChartDefinition: (validator, definition) =>
    GaugeChart.validateChartDefinition(validator, definition as GaugeChartDefinition),
  transformDefinition: (
    definition: GaugeChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ) => GaugeChart.transformDefinition(definition, executed),
  getChartDefinitionFromContextCreation: (context: ChartCreationContext) =>
    GaugeChart.getDefinitionFromContextCreation(context),
  name: _lt("Gauge"),
});

export const chartComponentRegistry = new Registry<new (...args: any) => Component>();
chartComponentRegistry.add("line", ChartJsComponent);
chartComponentRegistry.add("bar", ChartJsComponent);
chartComponentRegistry.add("pie", ChartJsComponent);
chartComponentRegistry.add("gauge", ChartJsComponent);
chartComponentRegistry.add("scorecard", ScorecardChartComponent);
