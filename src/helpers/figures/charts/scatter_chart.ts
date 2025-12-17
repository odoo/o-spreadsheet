import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyChartDataSourceInSheetId,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  getDefinedAxis,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import { getZoneArea } from "@odoo/o-spreadsheet-engine/helpers/zones";
import {
  ChartCreationContext,
  ChartData,
  ChartRangeDataSource,
  DataSet,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import {
  ScatterChartDefinition,
  ScatterChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/scatter_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import { CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getLineChartData,
  getLineChartTooltip,
  getScatterChartDatasets,
  getScatterChartLegend,
  getScatterChartScales,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class ScatterChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly type = "scatter";

  static allowedDefinitionKeys: readonly (keyof ScatterChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "dataSetsHaveTitle",
    "labelRange",
    "showValues",
    "labelsAsText",
    "aggregated",
    "axesDesign",
    "zoomable",
  ] as const;

  constructor(private definition: ScatterChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition);
    this.labelRange = createValidRange(this.getters, sheetId, definition.labelRange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ScatterChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: ScatterChartDefinition,
    applyChange: RangeAdapter
  ): ScatterChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ScatterChartDefinition {
    return {
      background: context.background,
      dataSource: context.dataSource ?? { dataSets: [] },
      dataSetStyles: context.dataSetStyles ?? {},
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      labelsAsText: context.labelsAsText ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "scatter",
      labelRange: context.auxiliaryRange || undefined,
      aggregated: context.aggregated ?? false,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      zoomable: context.zoomable,
      humanize: context.humanize,
    };
  }

  getDefinition(): ScatterChartDefinition {
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

  private getDefinitionWithSpecificDataSets(
    dataSource: ChartRangeDataSource,
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): ScatterChartDefinition {
    return {
      ...this.definition,
      dataSource,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
    };
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      auxiliaryRange: definition.labelRange,
    };
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): ScatterChart {
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
    return new ScatterChart(definition, this.sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    const definition = this.getDefinition();
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== "");

    const datasetLength = this.dataSets[0]
      ? getZoneArea(this.dataSets[0].dataRange.zone)
      : undefined;
    const labelLength = this.labelRange ? getZoneArea(this.labelRange.zone) : 0;
    const labelRange = toExcelLabelRange(
      this.getters,
      this.labelRange,
      shouldRemoveFirstLabel(labelLength, datasetLength, definition.dataSetsHaveTitle)
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

  duplicateInDuplicatedSheet(newSheetId: UID): ScatterChart {
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
    return new ScatterChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ScatterChart {
    const dataSource = copyChartDataSourceInSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, this.labelRange, sheetId);
    return new ScatterChart(definition, sheetId, this.getters);
  }
}

export function createScatterChartRuntime(
  getters: Getters,
  chart: ScatterChart,
  data: ChartData
): ScatterChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getLineChartData(definition, data, getters);

  const config: ChartConfiguration<"line"> = {
    // use chartJS line chart and disable the lines instead of chartJS scatter chart. This is because the scatter chart
    // have less options than the line chart (it only works with linear labels)
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: getScatterChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getScatterChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getScatterChartLegend(definition, chartData),
        tooltip: getLineChartTooltip(definition, chartData),
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
