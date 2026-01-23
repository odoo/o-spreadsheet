import { CoreGetters } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  getDataSourceFromContextCreation,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
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
    super(definition, sheetId, getters);
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

  getDefinition(): PieChartDefinition {
    return this.definition;
  }

  getContextCreation(definition: PieChartDefinition<string>): ChartCreationContext {
    return definition;
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    const definition = this.getDefinition();
    const { dataSets, labelRange } = this.getCommonDataSetAttributesForExcel(this.definition);
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(definition.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRange,
    };
  }
}

export function createPieChartRuntime(
  getters: Getters,
  chart: PieChart,
  data: ChartData
): PieChartRuntime {
  const definition = chart.getDefinition();
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
