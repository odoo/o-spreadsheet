import { CoreGetters } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  getDataSourceFromContextCreation,
  getDefinedAxis,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartDataSourceHandler } from "@odoo/o-spreadsheet-engine/registries/chart_data_source_registry";
import {
  ChartCreationContext,
  ChartData,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import {
  ScatterChartDefinition,
  ScatterChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/scatter_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import { Getters, Range, UID } from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getLineChartData,
  getLineChartTooltip,
  getScatterChartDatasets,
  getScatterChartLegend,
  getScatterChartScales,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class ScatterChart extends AbstractChart {
  readonly type = "scatter";

  static allowedDefinitionKeys: readonly (keyof ScatterChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showValues",
    "labelsAsText",
    "aggregated",
    "axesDesign",
    "zoomable",
  ] as const;

  constructor(
    private definition: ScatterChartDefinition<Range>,
    sheetId: UID,
    getters: CoreGetters
  ) {
    super(definition, sheetId, getters);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): ScatterChartDefinition<string> {
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      labelsAsText: context.labelsAsText ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "scatter",
      aggregated: context.aggregated ?? false,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      zoomable: context.zoomable,
      humanize: context.humanize,
    };
  }

  getRangeDefinition(): ScatterChartDefinition {
    return this.definition;
  }

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: ScatterChartDefinition<string>
  ): ChartCreationContext {
    return definition;
  }

  getDefinitionForExcel(
    getters: CoreGetters,
    { dataSets, labelRange }: Pick<ExcelChartDefinition, "dataSets" | "labelRange">
  ): ExcelChartDefinition | undefined {
    const definition = this.getRangeDefinition();
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(definition.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRange,
      verticalAxis: getDefinedAxis(definition),
    };
  }
}

export function createScatterChartRuntime(
  getters: Getters,
  chart: ScatterChart,
  data: ChartData
): ScatterChartRuntime {
  const definition = chart.getRangeDefinition();
  const chartData = getLineChartData(definition, data, getters);

  const config: ChartConfiguration<"line"> = {
    // use chartJS line chart and disable the lines instead of chartJS scatter chart. This is because the scatter chart
    // have less options than the line chart (it only works with linear labels)
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: getScatterChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getScatterChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getScatterChartLegend(definition, chartData),
        tooltip: getLineChartTooltip(definition, chartData),
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
