import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyChartDataSourceInSheetId,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
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
    "aggregated",
    "isDoughnut",
    "pieHolePercentage",
    "showValues",
  ] as const;

  constructor(private definition: PieChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition);
    this.labelRange = createValidRange(getters, sheetId, definition.dataSource.labelRange);
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
      dataSource: context.dataSource ?? {
        dataSets: [],
        dataSetsHaveTitle: false,
        labelRange: context.auxiliaryRange,
      },
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
    return this.getDefinitionWithSpecificDataSets({
      ...this.definition.dataSource,
      dataSets: this.dataSets.map(({ dataSetId, dataRange }) => ({
        dataSetId,
        dataRange: this.getters.getRangeString(dataRange, this.sheetId),
      })),
      labelRange: this.labelRange && this.getters.getRangeString(this.labelRange, this.sheetId),
    });
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      auxiliaryRange: definition.dataSource.labelRange,
    };
  }

  private getDefinitionWithSpecificDataSets(dataSource: ChartRangeDataSource): PieChartDefinition {
    return {
      ...this.definition,
      dataSource,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): PieChart {
    const dataSource = duplicateDataSourceInDuplicatedSheet(
      this.getters,
      this.sheetId,
      newSheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new PieChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): PieChart {
    const dataSource = copyChartDataSourceInSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
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
    const { dataSource, isStale } = updateChartRangesWithDataSets(
      this.getters,
      this.sheetId,
      applyChange,
      this.definition.dataSource
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
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
