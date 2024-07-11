import { Component } from "@odoo/owl";
import { ChartJsComponent } from "../components/figures/chart/chartJs/chartjs";
import { GaugeChartComponent } from "../components/figures/chart/gauge/gauge_chart_component";
import { ScorecardChart as ScorecardChartComponent } from "../components/figures/chart/scorecard/chart_scorecard";
import { AbstractChart } from "../helpers/figures/charts/abstract_chart";
import { BarChart, createBarChartRuntime } from "../helpers/figures/charts/bar_chart";
import { createLineOrScatterChartRuntime } from "../helpers/figures/charts/chart_common_line_scatter";
import { ComboChart, createComboChartRuntime } from "../helpers/figures/charts/combo_chart";
import { GaugeChart, createGaugeChartRuntime } from "../helpers/figures/charts/gauge_chart";
import { LineChart } from "../helpers/figures/charts/line_chart";
import { PieChart, createPieChartRuntime } from "../helpers/figures/charts/pie_chart";
import { PyramidChart, createPyramidChartRuntime } from "../helpers/figures/charts/pyramid_chart";
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
import { PyramidChartDefinition } from "../types/chart/pyramid_chart";
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
  sequence: 15,
});
chartRegistry.add("line", {
  match: (type) => type === "line",
  createChart: (definition, sheetId, getters) =>
    new LineChart(definition as LineChartDefinition, sheetId, getters),
  getChartRuntime: createLineOrScatterChartRuntime,
  validateChartDefinition: LineChart.validateChartDefinition,
  transformDefinition: LineChart.transformDefinition,
  getChartDefinitionFromContextCreation: LineChart.getDefinitionFromContextCreation,
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
  sequence: 70,
});
chartRegistry.add("pyramid", {
  match: (type) => type === "pyramid",
  createChart: (definition, sheetId, getters) =>
    new PyramidChart(definition as PyramidChartDefinition, sheetId, getters),
  getChartRuntime: createPyramidChartRuntime,
  validateChartDefinition: PyramidChart.validateChartDefinition,
  transformDefinition: PyramidChart.transformDefinition,
  getChartDefinitionFromContextCreation: PyramidChart.getDefinitionFromContextCreation,
  sequence: 80,
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
chartComponentRegistry.add("pyramid", ChartJsComponent);

type ChartUICategory = keyof typeof chartCategories;

export const chartCategories = {
  line: _t("Line"),
  column: _t("Column"),
  bar: _t("Bar"),
  area: _t("Area"),
  pie: _t("Pie"),
  misc: _t("Miscellaneous"),
};

export interface ChartSubtypeProperties {
  /** Type shown in the chart side panel */
  chartSubtype: string;
  /** Translated name of the displayType */
  displayName: string;
  /** Type of the chart in the model */
  chartType: ChartType;
  /** Match the chart type with a chart display type. Optional if chartType === displayType  */
  matcher?: (definition: ChartDefinition) => boolean;
  /** Additional definition options to create a chart of type displayType */
  subtypeDefinition?: Partial<ChartDefinition>;
  category: ChartUICategory;
  preview: string;
}

export const chartSubtypeRegistry = new Registry<ChartSubtypeProperties>();
chartSubtypeRegistry
  .add("line", {
    matcher: (definition) =>
      definition.type === "line" && !definition.stacked && !definition.fillArea,
    displayName: _t("Line"),
    chartType: "line",
    chartSubtype: "line",
    subtypeDefinition: { stacked: false, fillArea: false },
    category: "line",
    preview: "o-spreadsheet-ChartPreview.LINE_CHART",
  })
  .add("stacked_line", {
    matcher: (definition) =>
      definition.type === "line" && !definition.fillArea && !!definition.stacked,
    displayName: _t("Stacked Line"),
    chartType: "line",
    chartSubtype: "stacked_line",
    subtypeDefinition: { stacked: true, fillArea: false },
    category: "line",
    preview: "o-spreadsheet-ChartPreview.STACKED_LINE_CHART",
  })
  .add("area", {
    matcher: (definition) =>
      definition.type === "line" && !definition.stacked && !!definition.fillArea,
    displayName: _t("Area"),
    chartType: "line",
    chartSubtype: "area",
    subtypeDefinition: { stacked: false, fillArea: true },
    category: "area",
    preview: "o-spreadsheet-ChartPreview.AREA_CHART",
  })
  .add("stacked_area", {
    matcher: (definition) =>
      definition.type === "line" && definition.stacked && !!definition.fillArea,
    displayName: _t("Stacked Area"),
    chartType: "line",
    chartSubtype: "stacked_area",
    subtypeDefinition: { stacked: true, fillArea: true },
    category: "area",
    preview: "o-spreadsheet-ChartPreview.STACKED_AREA_CHART",
  })
  .add("scatter", {
    displayName: _t("Scatter"),
    chartType: "scatter",
    chartSubtype: "scatter",
    category: "misc",
    preview: "o-spreadsheet-ChartPreview.SCATTER_CHART",
  })
  .add("column", {
    matcher: (definition) =>
      definition.type === "bar" && !definition.stacked && !definition.horizontal,
    displayName: _t("Column"),
    chartType: "bar",
    chartSubtype: "column",
    subtypeDefinition: { stacked: false, horizontal: false },
    category: "column",
    preview: "o-spreadsheet-ChartPreview.COLUMN_CHART",
  })
  .add("stacked_column", {
    matcher: (definition) =>
      definition.type === "bar" && definition.stacked && !definition.horizontal,
    displayName: _t("Stacked Column"),
    chartType: "bar",
    chartSubtype: "stacked_column",
    subtypeDefinition: { stacked: true, horizontal: false },
    category: "column",
    preview: "o-spreadsheet-ChartPreview.STACKED_COLUMN_CHART",
  })
  .add("bar", {
    matcher: (definition) =>
      definition.type === "bar" && !definition.stacked && !!definition.horizontal,
    displayName: _t("Bar"),
    chartType: "bar",
    chartSubtype: "bar",
    subtypeDefinition: { horizontal: true, stacked: false },
    category: "bar",
    preview: "o-spreadsheet-ChartPreview.BAR_CHART",
  })
  .add("stacked_bar", {
    matcher: (definition) =>
      definition.type === "bar" && definition.stacked && !!definition.horizontal,
    displayName: _t("Stacked Bar"),
    chartType: "bar",
    chartSubtype: "stacked_bar",
    subtypeDefinition: { horizontal: true, stacked: true },
    category: "bar",
    preview: "o-spreadsheet-ChartPreview.STACKED_BAR_CHART",
  })
  .add("combo", {
    displayName: _t("Combo"),
    chartSubtype: "combo",
    chartType: "combo",
    category: "line",
    preview: "o-spreadsheet-ChartPreview.COMBO_CHART",
  })
  .add("pie", {
    matcher: (definition) => definition.type === "pie" && !definition.isDoughnut,
    displayName: _t("Pie"),
    chartSubtype: "pie",
    chartType: "pie",
    subtypeDefinition: { isDoughnut: false },
    category: "pie",
    preview: "o-spreadsheet-ChartPreview.PIE_CHART",
  })
  .add("doughnut", {
    matcher: (definition) => definition.type === "pie" && !!definition.isDoughnut,
    displayName: _t("Doughnut"),
    chartSubtype: "doughnut",
    chartType: "pie",
    subtypeDefinition: { isDoughnut: true },
    category: "pie",
    preview: "o-spreadsheet-ChartPreview.DOUGHNUT_CHART",
  })
  .add("gauge", {
    displayName: _t("Gauge"),
    chartSubtype: "gauge",
    chartType: "gauge",
    category: "misc",
    preview: "o-spreadsheet-ChartPreview.GAUGE_CHART",
  })
  .add("scorecard", {
    displayName: _t("Scorecard"),
    chartSubtype: "scorecard",
    chartType: "scorecard",
    category: "misc",
    preview: "o-spreadsheet-ChartPreview.SCORECARD_CHART",
  })
  .add("waterfall", {
    displayName: _t("Waterfall"),
    chartSubtype: "waterfall",
    chartType: "waterfall",
    category: "misc",
    preview: "o-spreadsheet-ChartPreview.WATERFALL_CHART",
  })
  .add("pyramid", {
    displayName: _t("Population Pyramid"),
    chartSubtype: "pyramid",
    chartType: "pyramid",
    category: "misc",
    preview: "o-spreadsheet-ChartPreview.POPULATION_PYRAMID_CHART",
  });
