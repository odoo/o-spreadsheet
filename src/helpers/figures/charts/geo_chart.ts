import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { GeoChartRuntime } from "../../../types/chart/geo_chart";
import { CommandResult } from "../../../types/commands";
import { ColorThemeName } from "../../../types/rendering";
import { AbstractChart } from "./abstract_chart";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getGeoChartData } from "./runtime/chart_data_extractor";
import { getGeoChartDatasets } from "./runtime/chartjs_dataset";
import { getChartLayout } from "./runtime/chartjs_layout";
import { getGeoChartScales } from "./runtime/chartjs_scales";
import { getChartTitle } from "./runtime/chartjs_title";
import { getGeoChartTooltip } from "./runtime/chartjs_tooltip";

/**
 * The keys under which a geo chart runtime holds its GeoJSON geometry: the
 * `outline` array of features on the dataset, and the `feature` of each data
 * point. Everything else in the runtime (labels, values, options) is light.
 *
 * That geometry is large, immutable, and cached by the geo loader. Chart.js
 * never mutates it, and chartjs-chart-geo caches each feature's projected path
 * keyed on the feature's object identity. So when the runtime is copied before
 * being handed to Chart.js, these keys must be shared by reference rather than
 * cloned: copying them is both expensive (the whole world map, on every update)
 * and defeats that cache.
 */
export const GEO_GEOMETRY_KEYS: ReadonlySet<string> = new Set(["feature", "outline"]);

export const GeoChart: ChartTypeBuilder<"geo"> = {
  sequence: 90,
  dataSeriesLimit: 1,

  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "colorScale",
    "missingValueColor",
    "region",
  ],

  fromStrDefinition: (definition) => definition,

  toStrDefinition: (definition) => definition,

  copyInSheetId: (definition) => definition,

  duplicateInDuplicatedSheet: (definition) => definition,

  transformDefinition: (definition) => definition,

  validateDefinition: () => CommandResult.Success,

  updateRanges: (definition) => definition,

  getContextCreation: (definition) => definition,

  getFormulas: () => [],

  getDefinitionFromContextCreation(context, dataSourceBuilder) {
    return {
      background: context.background,
      dataSource: dataSourceBuilder.fromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "geo",
      humanize: context.humanize,
      annotationLink: context.annotationLink,
      annotationText: context.annotationText,
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(
    getters,
    definition,
    { extractData },
    sheetId,
    eventHandlers,
    colorThemeName: ColorThemeName
  ): GeoChartRuntime {
    const data = extractData();
    const chartData = getGeoChartData(definition, data, getters, colorThemeName);

    const config: ChartConfiguration = {
      type: "choropleth",
      data: {
        datasets: getGeoChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getGeoChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          tooltip: getGeoChartTooltip(definition, chartData),
          legend: { display: false },
          background: { color: chartData.background },
        },
        ...eventHandlers,
      },
    };

    return { chartJsConfig: config };
  },

  loadDataForExport: async (getters) => {
    return getters.loadUsedGeoJsonFeatures();
  },
};
