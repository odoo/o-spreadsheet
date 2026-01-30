import { chartRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { chartSubtypeRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_subtype_registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import {
  BarChart,
  GaugeChart,
  LineChart,
  PieChart,
  ScorecardChart,
  transformChartDefinitionWithDataSource,
  WaterfallChart,
} from "../helpers/figures/charts";
import { CalendarChart } from "../helpers/figures/charts/calendar_chart";
import { ComboChart } from "../helpers/figures/charts/combo_chart";
import { FunnelChart } from "../helpers/figures/charts/funnel_chart";
import { GeoChart } from "../helpers/figures/charts/geo_chart";
import { PyramidChart } from "../helpers/figures/charts/pyramid_chart";
import { RadarChart } from "../helpers/figures/charts/radar_chart";
import { getChartData, getHierarchicalData } from "../helpers/figures/charts/runtime";
import { ScatterChart } from "../helpers/figures/charts/scatter_chart";
import { SunburstChart } from "../helpers/figures/charts/sunburst_chart";
import { TreeMapChart } from "../helpers/figures/charts/tree_map_chart";

//------------------------------------------------------------------------------
// Chart Registry
//------------------------------------------------------------------------------

chartRegistry.add("bar", {
  ChartTypeHandler: BarChart,
  match: (type) => type === "bar",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
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
  ChartTypeHandler: ComboChart,
  match: (type) => type === "combo",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: ComboChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: ComboChart.allowedDefinitionKeys,
  sequence: 15,
});
chartRegistry.add("line", {
  ChartTypeHandler: LineChart,
  match: (type) => type === "line",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: LineChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: LineChart.allowedDefinitionKeys,
  sequence: 20,
});
chartRegistry.add("pie", {
  ChartTypeHandler: PieChart,
  match: (type) => type === "pie",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: PieChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: PieChart.allowedDefinitionKeys,
  sequence: 30,
});
chartRegistry.add("scorecard", {
  ChartTypeHandler: ScorecardChart,
  match: (type) => type === "scorecard",
  extractData: (definition, sheetId, getters) => undefined, // totally custom. Handled in createScorecardChartRuntime
  transformDefinition: ScorecardChart.transformDefinition,
  getChartDefinitionFromContextCreation: ScorecardChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: ScorecardChart.allowedDefinitionKeys,
  sequence: 40,
});
chartRegistry.add("gauge", {
  ChartTypeHandler: GaugeChart,
  match: (type) => type === "gauge",
  extractData: (definition, sheetId, getters) => undefined, // totally custom. Handled in createScorecardChartRuntime
  transformDefinition: GaugeChart.transformDefinition,
  getChartDefinitionFromContextCreation: GaugeChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: GaugeChart.allowedDefinitionKeys,
  sequence: 50,
});
chartRegistry.add("scatter", {
  ChartTypeHandler: ScatterChart,
  match: (type) => type === "scatter",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: ScatterChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: ScatterChart.allowedDefinitionKeys,
  sequence: 60,
});
chartRegistry.add("waterfall", {
  ChartTypeHandler: WaterfallChart,
  match: (type) => type === "waterfall",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: WaterfallChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: WaterfallChart.allowedDefinitionKeys,
  sequence: 70,
});
chartRegistry.add("pyramid", {
  ChartTypeHandler: PyramidChart,
  match: (type) => type === "pyramid",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
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
  ChartTypeHandler: RadarChart,
  match: (type) => type === "radar",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: RadarChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: RadarChart.allowedDefinitionKeys,
  sequence: 80,
});
chartRegistry.add("geo", {
  ChartTypeHandler: GeoChart,
  match: (type) => type === "geo",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: GeoChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: GeoChart.allowedDefinitionKeys,
  sequence: 90,
  dataSeriesLimit: 1,
});
chartRegistry.add("funnel", {
  ChartTypeHandler: FunnelChart,
  match: (type) => type === "funnel",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: FunnelChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: FunnelChart.allowedDefinitionKeys,
  sequence: 100,
  dataSeriesLimit: 1,
});
chartRegistry.add("sunburst", {
  ChartTypeHandler: SunburstChart,
  match: (type) => type === "sunburst",
  extractData: (definition, sheetId, getters) => getHierarchicalData(getters, sheetId, definition),
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: SunburstChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: SunburstChart.allowedDefinitionKeys,
  sequence: 30,
});
chartRegistry.add("treemap", {
  ChartTypeHandler: TreeMapChart,
  match: (type) => type === "treemap",
  extractData: (definition, sheetId, getters) => getHierarchicalData(getters, sheetId, definition),
  transformDefinition: transformChartDefinitionWithDataSource,
  getChartDefinitionFromContextCreation: TreeMapChart.getDefinitionFromContextCreation,
  allowedDefinitionKeys: TreeMapChart.allowedDefinitionKeys,
  sequence: 100,
});
chartRegistry.add("calendar", {
  ChartTypeHandler: CalendarChart,
  match: (type) => type === "calendar",
  extractData: (definition, sheetId, getters) =>
    getChartData(getters, sheetId, definition.dataSource),
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
