import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
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
import { FunnelChartDefinition, FunnelChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import {
  ChartCreationContext,
  ChartData,
  ChartRangeDataSource,
  DataSet,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { ChartConfiguration } from "chart.js";
import { ApplyRangeChange, CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
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
    this.dataSets = createDataSets(getters, sheetId, definition);
    this.labelRange = createValidRange(getters, sheetId, definition.dataSource.labelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: FunnelChartDefinition,
    applyChange: RangeAdapter
  ): FunnelChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
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
      dataSource: context.dataSource ?? {
        dataSets: [],
        dataSetsHaveTitle: false,
        labelRange: context.auxiliaryRange,
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

  duplicateInDuplicatedSheet(newSheetId: UID): FunnelChart {
    const dataSource = duplicateDataSourceInDuplicatedSheet(
      this.getters,
      this.sheetId,
      newSheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new FunnelChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): FunnelChart {
    const dataSource = copyChartDataSourceInSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new FunnelChart(definition, sheetId, this.getters);
  }

  getDefinition(): FunnelChartDefinition {
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
  ): FunnelChartDefinition {
    return {
      ...this.definition,
      dataSource,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): FunnelChart {
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
    return new FunnelChart(definition, this.sheetId, this.getters);
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
