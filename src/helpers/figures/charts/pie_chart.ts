import { CoreGetters } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  getDataSourceFromContextCreation,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartDataSourceHandler } from "@odoo/o-spreadsheet-engine/registries/chart_data_source_registry";
import {
  ChartCreationContext,
  ChartData,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import {
  PieChartDefinition,
  PieChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/pie_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import type { ChartConfiguration } from "chart.js";
import { Getters, Range, UID } from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getPieChartData,
  getPieChartDatasets,
  getPieChartLegend,
  getPieChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class PieChart extends AbstractChart {
  readonly type = "pie";

  static allowedDefinitionKeys: readonly (keyof PieChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "aggregated",
    "isDoughnut",
    "pieHolePercentage",
    "showValues",
  ] as const;

  constructor(private definition: PieChartDefinition<Range>, sheetId: UID, getters: CoreGetters) {
    super(sheetId, getters);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): PieChartDefinition<string> {
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "pie",
      aggregated: context.aggregated ?? false,
      isDoughnut: context.isDoughnut,
      pieHolePercentage: context.pieHolePercentage,
      showValues: context.showValues,
      humanize: context.humanize,
    };
  }

  getRangeDefinition(): PieChartDefinition {
    return this.definition;
  }

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: PieChartDefinition<string>
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
    };
  }

  getRuntime(getters: Getters, data: ChartData): PieChartRuntime {
    const definition = this.definition;
    const chartData = getPieChartData(definition, data, getters);

    const config: ChartConfiguration<"doughnut" | "pie"> = {
      type: definition.isDoughnut ? "doughnut" : "pie",
      data: {
        labels: chartData.labels,
        datasets: getPieChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        cutout:
          definition.isDoughnut && definition.pieHolePercentage !== undefined
            ? definition.pieHolePercentage + "%"
            : undefined,
        layout: getChartLayout(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getPieChartLegend(definition, chartData),
          tooltip: getPieChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
        },
      },
    };

    return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
  }
}
