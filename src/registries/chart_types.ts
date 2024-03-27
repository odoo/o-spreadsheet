import { Component } from "@odoo/owl";
import { ChartJsComponent } from "../components/figures/chart/chartJs/chartjs";
import { GaugeChartComponent } from "../components/figures/chart/gauge/gauge_chart_component";
import { ScorecardChart as ScorecardChartComponent } from "../components/figures/chart/scorecard/chart_scorecard";
import { AbstractChart } from "../helpers/figures/charts/abstract_chart";
import { BarChart, createBarChartRuntime } from "../helpers/figures/charts/bar_chart";
import { ComboChart, createComboChartRuntime } from "../helpers/figures/charts/combo_chart";
import { GaugeChart, createGaugeChartRuntime } from "../helpers/figures/charts/gauge_chart";
import { LineChart, createLineChartRuntime } from "../helpers/figures/charts/line_chart";
import { PieChart, createPieChartRuntime } from "../helpers/figures/charts/pie_chart";
import { ScatterChart, createScatterChartRuntime } from "../helpers/figures/charts/scatter_chart";
import {
  ScorecardChart,
  createScorecardChartRuntime,
} from "../helpers/figures/charts/scorecard_chart";
import {
  WaterfallChart,
  createWaterfallChartRuntime,
} from "../helpers/figures/charts/waterfall_chart";
import { _t } from "../translation";
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
import { ComboChartDefinition } from "../types/chart/combo_chart";
import { ScatterChartDefinition } from "../types/chart/scatter_chart";
import { WaterfallChartDefinition } from "../types/chart/waterfall_chart";
import { Validator } from "../types/validator";
import { Registry } from "./registry";

//------------------------------------------------------------------------------
// Chart Registry
//------------------------------------------------------------------------------

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
    definition: ChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ChartDefinition;
  getChartDefinitionFromContextCreation(context: ChartCreationContext): ChartDefinition;
  name: string;
  sequence: number;
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
  validateChartDefinition: BarChart.validateChartDefinition,
  transformDefinition: BarChart.transformDefinition,
  getChartDefinitionFromContextCreation: BarChart.getDefinitionFromContextCreation,
  name: _t("Bar"),
  sequence: 10,
});
chartRegistry.add("combo", {
  match: (type) => type === "combo",
  createChart: (definition, sheetId, getters) =>
    new ComboChart(definition as ComboChartDefinition, sheetId, getters),
  getChartRuntime: createComboChartRuntime,
  validateChartDefinition: ComboChart.validateChartDefinition,
  transformDefinition: ComboChart.transformDefinition,
  getChartDefinitionFromContextCreation: ComboChart.getDefinitionFromContextCreation,
  name: _t("Combo"),
  sequence: 15,
});
chartRegistry.add("line", {
  match: (type) => type === "line",
  createChart: (definition, sheetId, getters) =>
    new LineChart(definition as LineChartDefinition, sheetId, getters),
  getChartRuntime: createLineChartRuntime,
  validateChartDefinition: LineChart.validateChartDefinition,
  transformDefinition: LineChart.transformDefinition,
  getChartDefinitionFromContextCreation: LineChart.getDefinitionFromContextCreation,
  name: _t("Line"),
  sequence: 20,
});
chartRegistry.add("pie", {
  match: (type) => type === "pie",
  createChart: (definition, sheetId, getters) =>
    new PieChart(definition as PieChartDefinition, sheetId, getters),
  getChartRuntime: createPieChartRuntime,
  validateChartDefinition: PieChart.validateChartDefinition,
  transformDefinition: PieChart.transformDefinition,
  getChartDefinitionFromContextCreation: PieChart.getDefinitionFromContextCreation,
  name: _t("Pie"),
  sequence: 30,
});
chartRegistry.add("scorecard", {
  match: (type) => type === "scorecard",
  createChart: (definition, sheetId, getters) =>
    new ScorecardChart(definition as ScorecardChartDefinition, sheetId, getters),
  getChartRuntime: createScorecardChartRuntime,
  validateChartDefinition: ScorecardChart.validateChartDefinition,
  transformDefinition: ScorecardChart.transformDefinition,
  getChartDefinitionFromContextCreation: ScorecardChart.getDefinitionFromContextCreation,
  name: _t("Scorecard"),
  sequence: 40,
});
chartRegistry.add("gauge", {
  match: (type) => type === "gauge",
  createChart: (definition, sheetId, getters) =>
    new GaugeChart(definition as GaugeChartDefinition, sheetId, getters),
  getChartRuntime: createGaugeChartRuntime,
  validateChartDefinition: GaugeChart.validateChartDefinition,
  transformDefinition: GaugeChart.transformDefinition,
  getChartDefinitionFromContextCreation: GaugeChart.getDefinitionFromContextCreation,
  name: _t("Gauge"),
  sequence: 50,
});
chartRegistry.add("scatter", {
  match: (type) => type === "scatter",
  createChart: (definition, sheetId, getters) =>
    new ScatterChart(definition as ScatterChartDefinition, sheetId, getters),
  getChartRuntime: createScatterChartRuntime,
  validateChartDefinition: ScatterChart.validateChartDefinition,
  transformDefinition: ScatterChart.transformDefinition,
  getChartDefinitionFromContextCreation: ScatterChart.getDefinitionFromContextCreation,
  name: _t("Scatter"),
  sequence: 60,
});
chartRegistry.add("waterfall", {
  match: (type) => type === "waterfall",
  createChart: (definition, sheetId, getters) =>
    new WaterfallChart(definition as WaterfallChartDefinition, sheetId, getters),
  getChartRuntime: createWaterfallChartRuntime,
  validateChartDefinition: WaterfallChart.validateChartDefinition,
  transformDefinition: WaterfallChart.transformDefinition,
  getChartDefinitionFromContextCreation: WaterfallChart.getDefinitionFromContextCreation,
  name: _t("Waterfall"),
  sequence: 70,
});

export const chartComponentRegistry = new Registry<new (...args: any) => Component>();
chartComponentRegistry.add("line", ChartJsComponent);
chartComponentRegistry.add("bar", ChartJsComponent);
chartComponentRegistry.add("combo", ChartJsComponent);
chartComponentRegistry.add("pie", ChartJsComponent);
chartComponentRegistry.add("gauge", GaugeChartComponent);
chartComponentRegistry.add("scatter", ChartJsComponent);
chartComponentRegistry.add("scorecard", ScorecardChartComponent);
chartComponentRegistry.add("waterfall", ChartJsComponent);
