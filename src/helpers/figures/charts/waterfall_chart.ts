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
  WaterfallChartDefinition,
  WaterfallChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/waterfall_chart";
import type { ChartConfiguration } from "chart.js";
import { Getters, Range, UID } from "../../../types";
import {
  getBarChartData,
  getChartTitle,
  getWaterfallChartLegend,
  getWaterfallChartScales,
  getWaterfallChartShowValues,
  getWaterfallChartTooltip,
  getWaterfallDatasetAndLabels,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class WaterfallChart extends AbstractChart {
  readonly type = "waterfall";

  static allowedDefinitionKeys: readonly (keyof WaterfallChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "verticalAxisPosition",
    "aggregated",
    "showSubTotals",
    "showConnectorLines",
    "firstValueAsSubtotal",
    "positiveValuesColor",
    "negativeValuesColor",
    "subTotalValuesColor",
    "zoomable",
    "axesDesign",
    "showValues",
  ] as const;

  constructor(
    private definition: WaterfallChartDefinition<Range>,
    sheetId: UID,
    getters: CoreGetters
  ) {
    super(definition, sheetId, getters);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): WaterfallChartDefinition<string> {
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
      dataSetStyles: context.dataSetStyles ? context.dataSetStyles : {},
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "waterfall",
      verticalAxisPosition: "left",
      showSubTotals: context.showSubTotals ?? false,
      showConnectorLines: context.showConnectorLines ?? true,
      firstValueAsSubtotal: context.firstValueAsSubtotal ?? false,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      zoomable: context.zoomable ?? false,
      humanize: context.humanize,
    };
  }

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: WaterfallChartDefinition<string>
  ): ChartCreationContext {
    return definition;
  }

  getRangeDefinition(): WaterfallChartDefinition {
    return this.definition;
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // TODO: implement export excel
    return undefined;
  }
}

export function createWaterfallChartRuntime(
  getters: Getters,
  chart: WaterfallChart,
  data: ChartData
): WaterfallChartRuntime {
  const definition = chart.getRangeDefinition();
  const chartData = getBarChartData(definition, data, getters);

  const { labels, datasets } = getWaterfallDatasetAndLabels(definition, chartData);
  const config: ChartConfiguration = {
    type: "bar",
    data: {
      labels,
      datasets,
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getWaterfallChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getWaterfallChartLegend(definition, chartData),
        tooltip: getWaterfallChartTooltip(definition, chartData),
        chartShowValuesPlugin: getWaterfallChartShowValues(definition, chartData),
        waterfallLinesPlugin: { showConnectorLines: definition.showConnectorLines },
      },
    },
  };

  return {
    chartJsConfig: config,
    background: definition.background || BACKGROUND_CHART_COLOR,
  };
}
