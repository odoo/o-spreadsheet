import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import { getDataSourceFromContextCreation } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartTypeBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { GeoChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { ChartConfiguration } from "chart.js";
import { CommandResult } from "../../../types";
import {
  getChartTitle,
  getGeoChartData,
  getGeoChartDatasets,
  getGeoChartScales,
  getGeoChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";
import { isChartJSMiddleClick } from "./runtime/chartjs_misc";

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

  getDefinitionFromContextCreation(context) {
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "geo",
      humanize: context.humanize,
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(getters, definition, { extractData }, sheetId, goToDataSet): GeoChartRuntime {
    const data = extractData();
    const chartData = getGeoChartData(definition, data, getters);

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
        },
        onHover: (event, items, chart) => {
          if (!event.native) {
            return;
          }
          if (!items.length) {
            (event.native.target as HTMLElement).style.cursor = "";
            return;
          }

          const item = items[0];
          const data = chart.data.datasets?.[item.datasetIndex]?.data?.[item.index];
          if (typeof data === "object" && data && "value" in data && data.value !== undefined) {
            (event.native.target as HTMLElement).style.cursor = "pointer";
          } else {
            (event.native.target as HTMLElement).style.cursor = "";
          }
        },
        onClick: (event, items, chart) => {
          if (!items.length || !data.dataSetsValues[items[0].datasetIndex]) {
            return;
          }
          if (event.type === "click" || (isChartJSMiddleClick(event) && event.native)) {
            (event.native as MouseEvent).preventDefault(); // Prevent other click actions
          } else {
            return;
          }
          // @ts-ignore
          const label = items[0].element.feature.properties.name;
          const { dataSetsValues, labelValues } = data;
          const index = labelValues.indexOf(label);
          if (index === -1) {
            return {};
          }
          const dataset = dataSetsValues[0];
          let name = labelValues[index].value;
          if (dataset.label) {
            name += ` / ${dataset.label}`;
          }
          return goToDataSet?.(name?.toString() ?? "", dataset);
          // return { name, domain: dataset.domains[index] };
        },
      },
    };

    return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
  },
};
