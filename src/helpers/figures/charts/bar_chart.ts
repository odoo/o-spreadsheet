import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  createDataSets,
  getDefinedAxis,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  BarChartDefinition,
  BarChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/bar_chart";
import {
  ChartCreationContext,
  ChartData,
  ChartRangeDataSource,
  DataSet,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { CommandResult } from "@odoo/o-spreadsheet-engine/types/commands";
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
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
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

  constructor(private definition: BarChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition.dataSource);
    this.labelRange = createValidRange(getters, sheetId, definition.dataSource.labelRange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: BarChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): BarChartDefinition {
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

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      auxiliaryRange: definition.dataSource.labelRange,
    };
  }

  getDefinition(): BarChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.definition.dataSource);
  }

  private getDefinitionWithSpecificDataSets(dataSource: ChartRangeDataSource): BarChartDefinition {
    return {
      ...this.definition,
      dataSource,
      zoomable: this.definition.horizontal ? undefined : this.definition.zoomable,
    };
  }

  getDefinitionForExcel(getters: Getters): ExcelChartDefinition | undefined {
    const definition = this.getDefinition();
    const { dataSets, labelRange } = this.getCommonDataSetAttributesForExcel(
      this.definition,
      this.labelRange,
      this.dataSets
    );
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

export function createBarChartRuntime(
  getters: Getters,
  chart: BarChart,
  data: ChartData
): BarChartRuntime {
  const definition = chart.getDefinition();
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
