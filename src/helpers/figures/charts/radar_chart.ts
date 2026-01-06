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
} from "@odoo/o-spreadsheet-engine/types/chart";
import {
  RadarChartDefinition,
  RadarChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/radar_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import { CommandResult, Getters, Range, UID } from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getRadarChartData,
  getRadarChartDatasets,
  getRadarChartLegend,
  getRadarChartScales,
  getRadarChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class RadarChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly type = "radar";

  static allowedDefinitionKeys: readonly (keyof RadarChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "legendPosition",
    "dataSetStyles",
    "showValues",
    "aggregated",
    "stacked",
    "fillArea",
    "hideDataMarkers",
  ] as const;

  constructor(private definition: RadarChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition.dataSource);
    this.labelRange = createValidRange(getters, sheetId, definition.dataSource.labelRange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: RadarChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): RadarChartDefinition {
    return {
      background: context.background,
      dataSource: {
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
      type: "radar",
      fillArea: context.fillArea ?? false,
      showValues: context.showValues ?? false,
      hideDataMarkers: context.hideDataMarkers,
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

  duplicateInDuplicatedSheet(newSheetId: UID): RadarChart {
    const dataSource = duplicateDataSourceInDuplicatedSheet(
      this.getters,
      this.sheetId,
      newSheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new RadarChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): RadarChart {
    const dataSource = copyChartDataSourceInSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new RadarChart(definition, sheetId, this.getters);
  }

  getDefinition(): RadarChartDefinition {
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
  ): RadarChartDefinition {
    return {
      ...this.definition,
      dataSource,
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
    };
  }

  updateRanges(adapterFunctions: RangeAdapterFunctions): RadarChart {
    const { dataSource, isStale } = updateChartRangesWithDataSets(
      this.sheetId,
      adapterFunctions,
      this.definition.dataSource
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new RadarChart(definition, this.sheetId, this.getters);
  }
}

export function createRadarChartRuntime(
  getters: Getters,
  chart: RadarChart,
  data: ChartData
): RadarChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getRadarChartData(definition, data, getters);

  const config: ChartConfiguration = {
    type: "radar",
    data: {
      labels: chartData.labels,
      datasets: getRadarChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getRadarChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getRadarChartLegend(definition, chartData),
        tooltip: getRadarChartTooltip(definition, chartData),
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
