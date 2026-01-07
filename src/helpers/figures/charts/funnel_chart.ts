import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import { FunnelChartDefinition, FunnelChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import {
  ChartCreationContext,
  ChartData,
  ChartRangeDataSource,
  DataSet,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { ChartConfiguration } from "chart.js";
import { CommandResult, Getters, Range, UID } from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getFunnelChartData,
  getFunnelChartDatasets,
  getFunnelChartScales,
  getFunnelChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class FunnelChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly type = "funnel";

  static allowedDefinitionKeys: readonly (keyof FunnelChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "dataSetStyles",
    "axesDesign",
    "legendPosition",
    "horizontal",
    "aggregated",
    "showValues",
    "funnelColors",
    "cumulative",
  ] as const;

  constructor(private definition: FunnelChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition.dataSource);
    this.labelRange = createValidRange(getters, sheetId, definition.dataSource.labelRange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: FunnelChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): FunnelChartDefinition {
    return {
      background: context.background,
      dataSource: {
        type: "range",
        dataSets: [],
        dataSetsHaveTitle: false,
        labelRange: context.auxiliaryRange,
        ...context.dataSource,
      },
      dataSetStyles: context.dataSetStyles ?? {},
      aggregated: context.aggregated ?? false,
      legendPosition: "none",
      title: context.title || { text: "" },
      type: "funnel",
      showValues: context.showValues,
      axesDesign: context.axesDesign,
      funnelColors: context.funnelColors,
      horizontal: true,
      cumulative: context.cumulative,
      humanize: context.humanize,
    };
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      auxiliaryRange: definition.dataSource.labelRange,
    };
  }

  getDefinition(): FunnelChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.definition.dataSource);
  }

  private getDefinitionWithSpecificDataSets(
    dataSource: ChartRangeDataSource
  ): FunnelChartDefinition {
    return {
      ...this.definition,
      dataSource,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }
}

export function createFunnelChartRuntime(
  getters: Getters,
  chart: FunnelChart,
  data: ChartData
): FunnelChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getFunnelChartData(definition, data, getters);

  const config: ChartConfiguration = {
    type: "funnel",
    data: {
      labels: chartData.labels,
      datasets: getFunnelChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      indexAxis: "y",
      layout: getChartLayout(definition, chartData),
      scales: getFunnelChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: { display: false },
        tooltip: getFunnelChartTooltip(definition, chartData),
        chartShowValuesPlugin: getChartShowValues(definition, chartData),
      },
    },
  };

  return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
}
