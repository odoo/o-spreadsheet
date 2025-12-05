import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  ChartCreationContext,
  ChartData,
  ChartRangeDataSource,
  DataSet,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import {
  PieChartDefinition,
  PieChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/pie_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import type { ChartConfiguration } from "chart.js";
import { ApplyRangeChange, CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
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
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly type = "pie";

  static allowedDefinitionKeys: readonly (keyof PieChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "dataSetsHaveTitle",
    "labelRange",
    "aggregated",
    "isDoughnut",
    "pieHolePercentage",
    "showValues",
  ] as const;

  constructor(private definition: PieChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition);
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: PieChartDefinition,
    applyChange: RangeAdapter
  ): PieChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: PieChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): PieChartDefinition {
    return {
      background: context.background,
      dataSource: context.dataSource ?? { dataSets: [] },
      dataSetStyles: context.dataSetStyles ?? {},
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "pie",
      labelRange: context.auxiliaryRange || undefined,
      aggregated: context.aggregated ?? false,
      isDoughnut: context.isDoughnut,
      pieHolePercentage: context.pieHolePercentage,
      showValues: context.showValues,
      humanize: context.humanize,
    };
  }

  getDefinition(): PieChartDefinition {
    return this.getDefinitionWithSpecificDataSets(
      {
        dataSets: this.dataSets.map(({ dataSetId, dataRange }) => ({
          dataSetId,
          dataRange: this.getters.getRangeString(dataRange, this.sheetId),
        })),
      },
      this.labelRange
    );
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      auxiliaryRange: definition.labelRange,
    };
  }

  private getDefinitionWithSpecificDataSets(
    dataSource: ChartRangeDataSource,
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): PieChartDefinition {
    return {
      ...this.definition,
      dataSource,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): PieChart {
    const dataSource = duplicateDataSourceInDuplicatedSheet(
      this.getters,
      this.sheetId,
      newSheetId,
      this.definition.dataSource
    );
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, labelRange, newSheetId);
    return new PieChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): PieChart {
    const dataSource = {
      dataSets: this.definition.dataSource.dataSets.map((dataSet) => {
        const range = this.getters.getRangeFromSheetXC(this.sheetId, dataSet.dataRange);
        return {
          ...dataSet,
          dataRange: this.getters.getRangeString(range, sheetId),
        };
      }),
    };
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, this.labelRange, sheetId);
    return new PieChart(definition, sheetId, this.getters);
  }

  getDefinitionForExcel(getters: Getters): ExcelChartDefinition | undefined {
    const definition = this.getDefinition();
    const { dataSets, labelRange } = this.getCommonDataSetAttributesForExcel(
      this.labelRange,
      this.dataSets
    );
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(definition.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRange,
    };
  }

  updateRanges(applyChange: ApplyRangeChange): PieChart {
    const { dataSource, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      this.sheetId,
      applyChange,
      this.definition.dataSource,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, labelRange);
    return new PieChart(definition, this.sheetId, this.getters);
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
