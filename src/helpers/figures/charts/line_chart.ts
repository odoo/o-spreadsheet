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
  LineChartDefinition,
  LineChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/line_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import { Getters, Range, UID } from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getLineChartData,
  getLineChartDatasets,
  getLineChartLegend,
  getLineChartScales,
  getLineChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class LineChart extends AbstractChart {
  readonly type = "line";

  static allowedDefinitionKeys: readonly (keyof LineChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "labelsAsText",
    "stacked",
    "aggregated",
    "cumulative",
    "axesDesign",
    "fillArea",
    "showValues",
    "hideDataMarkers",
    "zoomable",
  ] as const;

  constructor(private definition: LineChartDefinition<Range>, sheetId: UID, getters: CoreGetters) {
    super(sheetId, getters);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): LineChartDefinition<string> {
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      labelsAsText: context.labelsAsText ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "line",
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      cumulative: context.cumulative ?? false,
      axesDesign: context.axesDesign,
      fillArea: context.fillArea,
      showValues: context.showValues,
      hideDataMarkers: context.hideDataMarkers,
      zoomable: context.zoomable,
      humanize: context.humanize,
    };
  }

  getRangeDefinition(): LineChartDefinition {
    return this.definition;
  }

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: LineChartDefinition<string>
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

  getRuntime(getters: Getters, data: ChartData): LineChartRuntime {
    const definition = this.definition;
    const chartData = getLineChartData(definition, data, getters);

    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: getLineChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getLineChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getLineChartLegend(definition, chartData),
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
}
