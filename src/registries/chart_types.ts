import { chartRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { chartSubtypeRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_subtype_registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import {
  BarChartDefinition,
  FunnelChartDefinition,
  GaugeChartDefinition,
  LineChartDefinition,
  PieChartDefinition,
  PyramidChartDefinition,
  ScatterChartDefinition,
  ScorecardChartDefinition,
  SunburstChartDefinition,
  WaterfallChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import { CalendarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/calendar_chart";
import { ComboChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/combo_chart";
import { GeoChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { RadarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/radar_chart";
import { TreeMapChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/tree_map_chart";
import {
  BarChart,
  createBarChartRuntime,
  createGaugeChartRuntime,
  createLineChartRuntime,
  createPieChartRuntime,
  createScorecardChartRuntime,
  createWaterfallChartRuntime,
  GaugeChart,
  LineChart,
  PieChart,
  ScorecardChart,
  transformChartDefinitionWithDataSource,
  WaterfallChart,
} from "../helpers/figures/charts";
import {
  CalendarChart,
  createCalendarChartRuntime,
} from "../helpers/figures/charts/calendar_chart";
import { ComboChart, createComboChartRuntime } from "../helpers/figures/charts/combo_chart";
import { createFunnelChartRuntime, FunnelChart } from "../helpers/figures/charts/funnel_chart";
import { createGeoChartRuntime, GeoChart } from "../helpers/figures/charts/geo_chart";
import { createPyramidChartRuntime, PyramidChart } from "../helpers/figures/charts/pyramid_chart";
import { createRadarChartRuntime, RadarChart } from "../helpers/figures/charts/radar_chart";
import { getChartData, getHierarchicalData } from "../helpers/figures/charts/runtime";
import { createScatterChartRuntime, ScatterChart } from "../helpers/figures/charts/scatter_chart";
import {
  createSunburstChartRuntime,
  SunburstChart,
} from "../helpers/figures/charts/sunburst_chart";
import { createTreeMapChartRuntime, TreeMapChart } from "../helpers/figures/charts/tree_map_chart";
import { CommandResult } from "../types";

//------------------------------------------------------------------------------
// Chart Registry
//------------------------------------------------------------------------------

chartRegistry.add("bar", {
  match: (type) => type === "bar",
  createChart: (definition, sheetId, getters) =>
    new BarChart(definition as BarChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createBarChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: BarChart.getDefinitionFromContextCreation,
  postProcess: (getters, sheetId, definition) => ({
    ...definition,
    zoomable: definition.horizontal ? undefined : definition.zoomable,
  }),
  allowedDefinitionKeys: BarChart.allowedDefinitionKeys,
  sequence: 10,
});
chartRegistry.add("combo", {
  match: (type) => type === "combo",
  createChart: (definition, sheetId, getters) =>
    new ComboChart(definition as ComboChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createComboChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: ComboChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: ComboChart.allowedDefinitionKeys,
  sequence: 15,
});
chartRegistry.add("line", {
  match: (type) => type === "line",
  createChart: (definition, sheetId, getters) =>
    new LineChart(definition as LineChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createLineChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: LineChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: LineChart.allowedDefinitionKeys,
  sequence: 20,
});
chartRegistry.add("pie", {
  match: (type) => type === "pie",
  createChart: (definition, sheetId, getters) =>
    new PieChart(definition as PieChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createPieChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: PieChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: PieChart.allowedDefinitionKeys,
  sequence: 30,
});
chartRegistry.add("scorecard", {
  match: (type) => type === "scorecard",
  createChart: (definition, sheetId, getters) =>
    new ScorecardChart(definition as ScorecardChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) => undefined, // totally custom. Handled in createScorecardChartRuntime
  getChartRuntime: createScorecardChartRuntime,
  validateChartDefinition: ScorecardChart.validateChartDefinition,
  transformDefinition: ScorecardChart.transformDefinition,
  getChartDefinitionFromContextCreation: ScorecardChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: ScorecardChart.allowedDefinitionKeys,
  sequence: 40,
});
chartRegistry.add("gauge", {
  match: (type) => type === "gauge",
  createChart: (definition, sheetId, getters) =>
    new GaugeChart(definition as GaugeChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) => undefined, // totally custom. Handled in createScorecardChartRuntime
  getChartRuntime: createGaugeChartRuntime,
  validateChartDefinition: GaugeChart.validateChartDefinition,
  transformDefinition: GaugeChart.transformDefinition,
  getChartDefinitionFromContextCreation: GaugeChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: GaugeChart.allowedDefinitionKeys,
  sequence: 50,
});
chartRegistry.add("scatter", {
  match: (type) => type === "scatter",
  createChart: (definition, sheetId, getters) =>
    new ScatterChart(definition as ScatterChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createScatterChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: ScatterChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: ScatterChart.allowedDefinitionKeys,
  sequence: 60,
});
chartRegistry.add("waterfall", {
  match: (type) => type === "waterfall",
  createChart: (definition, sheetId, getters) =>
    new WaterfallChart(definition as WaterfallChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createWaterfallChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: WaterfallChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: WaterfallChart.allowedDefinitionKeys,
  sequence: 70,
});
chartRegistry.add("pyramid", {
  match: (type) => type === "pyramid",
  createChart: (definition, sheetId, getters) =>
    new PyramidChart(definition as PyramidChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createPyramidChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: PyramidChart.getDefinitionFromContextCreation,
  postProcess: (getters, sheetId, definition) => ({
    ...definition,
    horizontal: true,
    stacked: true,
  }),
  allowedDefinitionKeys: PyramidChart.allowedDefinitionKeys,
  sequence: 80,
  dataSeriesLimit: 2,
});
chartRegistry.add("radar", {
  match: (type) => type === "radar",
  createChart: (definition, sheetId, getters) =>
    new RadarChart(definition as RadarChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createRadarChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: RadarChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: RadarChart.allowedDefinitionKeys,
  sequence: 80,
});
chartRegistry.add("geo", {
  match: (type) => type === "geo",
  createChart: (definition, sheetId, getters) =>
    new GeoChart(definition as GeoChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createGeoChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: GeoChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: GeoChart.allowedDefinitionKeys,
  sequence: 90,
  dataSeriesLimit: 1,
});
chartRegistry.add("funnel", {
  match: (type) => type === "funnel",
  createChart: (definition, sheetId, getters) =>
    new FunnelChart(definition as FunnelChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createFunnelChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: FunnelChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: FunnelChart.allowedDefinitionKeys,
  sequence: 100,
  dataSeriesLimit: 1,
});
chartRegistry.add("sunburst", {
  match: (type) => type === "sunburst",
  createChart: (definition, sheetId, getters) =>
    new SunburstChart(definition as SunburstChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) => getHierarchicalData(getters, sheetId, definition),
  getChartRuntime: createSunburstChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: SunburstChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: SunburstChart.allowedDefinitionKeys,
  sequence: 30,
});
chartRegistry.add("treemap", {
  match: (type) => type === "treemap",
  createChart: (definition, sheetId, getters) =>
    new TreeMapChart(definition as TreeMapChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) => getHierarchicalData(getters, sheetId, definition),
  getChartRuntime: createTreeMapChartRuntime,
  validateChartDefinition: () => CommandResult.Success,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: TreeMapChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: TreeMapChart.allowedDefinitionKeys,
  sequence: 100,
});
chartRegistry.add("calendar", {
  match: (type) => type === "calendar",
  createChart: (definition, sheetId, getters) =>
    new CalendarChart(definition as CalendarChartDefinition, sheetId, getters),
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  getChartRuntime: createCalendarChartRuntime,
  validateChartDefinition: CalendarChart.validateChartDefinition,
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: CalendarChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: CalendarChart.allowedDefinitionKeys,
  sequence: 110,
  dataSeriesLimit: 1,
});

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
  })
  .add("radar", {
    matcher: (definition) => definition.type === "radar" && !definition.fillArea,
    displayName: _t("Radar"),
    chartSubtype: "radar",
    chartType: "radar",
    subtypeDefinition: { fillArea: false },
    category: "misc",
    preview: "o-spreadsheet-ChartPreview.RADAR_CHART",
  })
  .add("filled_radar", {
    matcher: (definition) => definition.type === "radar" && !!definition.fillArea,
    displayName: _t("Filled Radar"),
    chartType: "radar",
    chartSubtype: "filled_radar",
    subtypeDefinition: { fillArea: true },
    category: "misc",
    preview: "o-spreadsheet-ChartPreview.FILLED_RADAR_CHART",
  })
  .add("geo", {
    displayName: _t("Geo Chart"),
    chartSubtype: "geo",
    chartType: "geo",
    category: "misc",
    preview: "o-spreadsheet-ChartPreview.GEO_CHART",
  })
  .add("funnel", {
    displayName: _t("Funnel"),
    chartSubtype: "funnel",
    chartType: "funnel",
    category: "misc",
    preview: "o-spreadsheet-ChartPreview.FUNNEL_CHART",
  })
  .add("sunburst", {
    matcher: (definition) => definition.type === "sunburst",
    displayName: _t("Sunburst"),
    chartSubtype: "sunburst",
    chartType: "sunburst",
    category: "hierarchical",
    preview: "o-spreadsheet-ChartPreview.SUNBURST_CHART",
  })
  .add("treemap", {
    matcher: (definition) => definition.type === "treemap",
    displayName: _t("Tree Map"),
    chartType: "treemap",
    chartSubtype: "treemap",
    category: "hierarchical",
    preview: "o-spreadsheet-ChartPreview.TREE_MAP_CHART",
  })
  .add("calendar", {
    displayName: _t("Calendar"),
    chartSubtype: "calendar",
    chartType: "calendar",
    category: "misc",
    preview: "o-spreadsheet-ChartPreview.CALENDAR_CHART",
  });
