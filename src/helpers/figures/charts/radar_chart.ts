import { CoreGetters } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  getDataSourceFromContextCreation,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartDataSourceHandler } from "@odoo/o-spreadsheet-engine/registries/chart_data_source_registry";
import { ChartCreationContext, ExcelChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import {
  RadarChartDefinition,
  RadarChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/radar_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import { Getters, Range, UID } from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getRadarChartData,
  getRadarChartDatasets,
  getRadarChartLegend,
  getRadarChartScales,
  getRadarChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class RadarChart extends AbstractChart {
  readonly type = "radar";

  static allowedDefinitionKeys: readonly (keyof RadarChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showValues",
    "aggregated",
    "stacked",
    "fillArea",
    "hideDataMarkers",
  ] as const;

  constructor(private definition: RadarChartDefinition<Range>, sheetId: UID, getters: CoreGetters) {
    super(sheetId, getters);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): RadarChartDefinition<string> {
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "radar",
      fillArea: context.fillArea ?? false,
      showValues: context.showValues ?? false,
      hideDataMarkers: context.hideDataMarkers,
      humanize: context.humanize,
    };
  }

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: RadarChartDefinition<string>
  ): ChartCreationContext {
    return definition;
  }

  getRangeDefinition(): RadarChartDefinition {
    return this.definition;
  }

  getDefinitionForExcel(
    getters: Getters,
    { dataSets, labelRange }: Pick<ExcelChartDefinition, "dataSets" | "labelRange">
  ): ExcelChartDefinition | undefined {
    const definition = this.getRangeDefinition();
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(definition.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRange,
    };
  }

  getRuntime(getters: Getters, dataSource: ChartDataSourceHandler): RadarChartRuntime {
    const definition = this.getRangeDefinition();
    const data = dataSource.extractData(getters);
    const chartData = getRadarChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "radar",
      data: {
        labels: chartData.labels,
        datasets: getRadarChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getRadarChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getRadarChartLegend(definition, chartData),
          tooltip: getRadarChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
        },
      },
    };

    return {
      chartJsConfig: config,
      background: definition.background || BACKGROUND_CHART_COLOR,
      customisableSeries: chartData.dataSetsValues.map(({ dataSetId, label }) => ({
        dataSetId,
        label,
      })),
    };
  }
}
