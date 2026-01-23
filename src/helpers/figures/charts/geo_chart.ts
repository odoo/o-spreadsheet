import { CoreGetters } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import { getDataSourceFromContextCreation } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartDataSourceHandler } from "@odoo/o-spreadsheet-engine/registries/chart_data_source_registry";
import {
  ChartCreationContext,
  ChartData,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import {
  GeoChartDefinition,
  GeoChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { ChartConfiguration } from "chart.js";
import { Getters, Range, UID } from "../../../types";
import {
  getChartTitle,
  getGeoChartData,
  getGeoChartDatasets,
  getGeoChartScales,
  getGeoChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class GeoChart extends AbstractChart {
  readonly type = "geo";

  static allowedDefinitionKeys: readonly (keyof GeoChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "colorScale",
    "missingValueColor",
    "region",
  ] as const;

  constructor(private definition: GeoChartDefinition<Range>, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): GeoChartDefinition<string> {
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "geo",
      humanize: context.humanize,
    };
  }

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: GeoChartDefinition<string>
  ): ChartCreationContext {
    return definition;
  }

  getRangeDefinition(): GeoChartDefinition {
    return this.definition;
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }
}

export function createGeoChartRuntime(
  getters: Getters,
  chart: GeoChart,
  data: ChartData
): GeoChartRuntime {
  const definition = chart.getRangeDefinition();
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
    },
  };

  return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
}
