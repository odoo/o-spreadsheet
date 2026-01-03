import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { isNumberCell } from "@odoo/o-spreadsheet-engine/helpers/cells/cell_evaluation";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyChartDataSourceInSheetId,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  getDefinedAxis,
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
  PyramidChartDefinition,
  PyramidChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/pyramid_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import { CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
import {
  getBarChartDatasets,
  getBarChartLegend,
  getChartData,
  getChartTitle,
  getPyramidChartData,
  getPyramidChartScales,
  getPyramidChartShowValues,
  getPyramidChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class PyramidChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly type = "pyramid";

  static allowedDefinitionKeys: readonly (keyof PyramidChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showValues",
    "aggregated",
    "axesDesign",
    "stacked",
    "horizontal",
  ] as const;

  constructor(private definition: PyramidChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition);
    this.labelRange = createValidRange(getters, sheetId, definition.dataSource.labelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: PyramidChartDefinition,
    applyChange: RangeAdapter
  ): PyramidChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: PyramidChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): PyramidChartDefinition {
    return {
      background: context.background,
      dataSource: {
        dataSets: [],
        dataSetsHaveTitle: false,
        labelRange: context.auxiliaryRange,
        ...context.dataSource,
      },
      dataSetStyles: context.dataSetStyles ?? {},
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "pyramid",
      axesDesign: context.axesDesign,
      horizontal: true,
      stacked: true,
      showValues: context.showValues,
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

  duplicateInDuplicatedSheet(newSheetId: UID): PyramidChart {
    const dataSource = duplicateDataSourceInDuplicatedSheet(
      this.getters,
      this.sheetId,
      newSheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new PyramidChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): PyramidChart {
    const dataSource = copyChartDataSourceInSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new PyramidChart(definition, sheetId, this.getters);
  }

  getDefinition(): PyramidChartDefinition {
    return this.getDefinitionWithSpecificDataSets({
      ...this.definition.dataSource,
      dataSets: this.dataSets.map(({ dataSetId, dataRange }) => ({
        dataSetId,
        dataRange: this.getters.getRangeString(dataRange, this.sheetId),
      })),
      labelRange: this.labelRange && this.getters.getRangeString(this.labelRange, this.sheetId),
    });
  }

  private getDefinitionWithSpecificDataSets(
    dataSource: ChartRangeDataSource
  ): PyramidChartDefinition {
    return {
      ...this.definition,
      dataSource,
      horizontal: true,
      stacked: true,
    };
  }

  getDefinitionForExcel(getters: Getters): ExcelChartDefinition | undefined {
    const definition = this.getDefinition();
    const { dataSets, labelRange } = this.getCommonDataSetAttributesForExcel(
      this.definition,
      this.labelRange,
      this.dataSets
    );
    const data = getChartData(getters, this.sheetId, definition);
    const chartData = getPyramidChartData(definition, data, getters);
    const { dataSetsValues } = chartData;
    const maxValue = Math.max(
      ...dataSetsValues.map((dataSet) =>
        Math.max(
          ...dataSet.data.map((cell) => (isNumberCell(cell) ? Math.abs(cell.value) : -Infinity))
        )
      )
    );
    return {
      ...definition,
      horizontal: true,
      backgroundColor: toXlsxHexColor(definition.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(definition.background)),
      dataSets,
      labelRange,
      verticalAxis: getDefinedAxis(definition),
      maxValue,
    };
  }

  updateRanges(adapterFunctions: RangeAdapterFunctions): PyramidChart {
    const { dataSource, isStale } = updateChartRangesWithDataSets(
      this.sheetId,
      adapterFunctions,
      this.definition.dataSource
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new PyramidChart(definition, this.sheetId, this.getters);
  }
}

export function createPyramidChartRuntime(
  getters: Getters,
  chart: PyramidChart,
  data: ChartData
): PyramidChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getPyramidChartData(definition, data, getters);

  const config: ChartConfiguration = {
    type: "bar",
    data: {
      labels: chartData.labels,
      datasets: getBarChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      indexAxis: "y",
      layout: getChartLayout(definition, chartData),
      scales: getPyramidChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getBarChartLegend(definition, chartData),
        tooltip: getPyramidChartTooltip(definition, chartData),
        chartShowValuesPlugin: getPyramidChartShowValues(definition, chartData),
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
