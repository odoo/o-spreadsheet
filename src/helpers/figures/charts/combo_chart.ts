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
  ComboChartDataSetStyle,
  ComboChartDefinition,
  ComboChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/combo_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import {
  ChartCreationContext,
  ChartData,
  ExcelChartDefinition,
  Getters,
  Range,
  UID,
} from "../../../types";
import {
  getBarChartData,
  getBarChartScales,
  getBarChartTooltip,
  getChartShowValues,
  getChartTitle,
  getComboChartDatasets,
  getComboChartLegend,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class ComboChart extends AbstractChart {
  readonly type = "combo";

  static allowedDefinitionKeys: readonly (keyof ComboChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "aggregated",
    "axesDesign",
    "showValues",
    "hideDataMarkers",
    "zoomable",
  ] as const;

  constructor(private definition: ComboChartDefinition<Range>, sheetId: UID, getters: CoreGetters) {
    super(sheetId, getters);
  }

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: ComboChartDefinition<string>
  ): ChartCreationContext {
    return definition;
  }

  getRangeDefinition(): ComboChartDefinition {
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
      verticalAxis: getDefinedAxis(definition),
    };
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): ComboChartDefinition<string> {
    const dataSetStyles: ComboChartDataSetStyle = {};
    const firstDataSetId = context.dataSource?.dataSets?.[0]?.dataSetId;
    for (const dataSet of context.dataSource?.dataSets || []) {
      dataSetStyles[dataSet.dataSetId] = {
        ...(context.dataSetStyles?.[dataSet.dataSetId] || {}),
        type: dataSet.dataSetId === firstDataSetId ? "bar" : "line",
      };
    }
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles,
      aggregated: context.aggregated,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "combo",
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      hideDataMarkers: context.hideDataMarkers,
      zoomable: context.zoomable,
      humanize: context.humanize,
    };
  }

  getRuntime(getters: Getters, data: ChartData): ComboChartRuntime {
    const definition = this.definition;
    const chartData = getBarChartData(definition, data, getters);

    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: getComboChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        layout: getChartLayout(definition, chartData),
        scales: getBarChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getComboChartLegend(definition, chartData),
          tooltip: getBarChartTooltip(definition, chartData),
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
