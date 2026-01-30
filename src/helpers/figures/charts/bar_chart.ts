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
  BarChartDefinition,
  BarChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/bar_chart";
import {
  ChartCreationContext,
  ChartData,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { Getters } from "@odoo/o-spreadsheet-engine/types/getters";
import { UID } from "@odoo/o-spreadsheet-engine/types/misc";
import { Range } from "@odoo/o-spreadsheet-engine/types/range";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import type { ChartConfiguration } from "chart.js";
import {
  getBarChartData,
  getBarChartDatasets,
  getBarChartLegend,
  getBarChartScales,
  getBarChartTooltip,
  getChartShowValues,
  getChartTitle,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class BarChart extends AbstractChart {
  readonly type = "bar";

  static allowedDefinitionKeys: readonly (keyof BarChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "horizontal",
    "axesDesign",
    "stacked",
    "aggregated",
    "showValues",
    "zoomable",
  ] as const;

  constructor(private definition: BarChartDefinition<Range>, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): BarChartDefinition<string> {
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "bar",
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      horizontal: context.horizontal,
      zoomable: context.zoomable,
      humanize: context.humanize,
    };
  }

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: BarChartDefinition<string>
  ): ChartCreationContext {
    return definition;
  }

  getRangeDefinition(): BarChartDefinition {
    return this.definition;
  }

  getDefinition() {
    return this.definition;
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

  getRuntime(getters: Getters, data: ChartData): BarChartRuntime {
    const definition = this.definition;
    const chartData = getBarChartData(definition, data, getters);

    const config: ChartConfiguration<"bar" | "line"> = {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: getBarChartDatasets(definition, chartData),
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        indexAxis: definition.horizontal ? "y" : "x",
        layout: getChartLayout(definition, chartData),
        scales: getBarChartScales(definition, chartData),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: getBarChartLegend(definition, chartData),
          tooltip: getBarChartTooltip(definition, chartData),
          chartShowValuesPlugin: getChartShowValues(definition, chartData),
        },
      },
    };

    return {
      chartJsConfig: config,
      background: definition.background || BACKGROUND_CHART_COLOR,
      customisableSeries: chartData.dataSetsValues.map(({ label, dataSetId }) => ({
        dataSetId,
        label,
      })),
    };
  }
}
