import { CoreGetters } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  getCreationContextFromDataSource,
  getDataSourceFromContextCreation,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
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
import { Getters, UID } from "../../../types";
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

  constructor(private definition: GeoChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): GeoChartDefinition {
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

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      ...getCreationContextFromDataSource(definition.dataSource),
    };
  }

  getDefinition(): GeoChartDefinition {
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
  const definition = chart.getDefinition();
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
