import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  FunnelChartColors,
  FunnelChartDefinition,
  FunnelChartRuntime,
  LegendPosition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import {
  AxesDesign,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { ChartConfiguration } from "chart.js";
import { Color, CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
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
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly type = "funnel";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
  readonly horizontal = true;
  readonly showValues?: boolean;
  readonly funnelColors?: FunnelChartColors;
  readonly cumulative?: boolean;

  constructor(definition: FunnelChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.showValues = definition.showValues;
    this.horizontal = true;
    this.funnelColors = definition.funnelColors;
    this.cumulative = definition.cumulative;
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
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: "none",
      title: context.title || { text: "" },
      type: "funnel",
      labelRange: context.auxiliaryRange || undefined,
      showValues: context.showValues,
      axesDesign: context.axesDesign,
      funnelColors: context.funnelColors,
      horizontal: true,
      cumulative: context.cumulative,
      humanize: context.humanize,
    };
  }

  getContextCreation(): ChartCreationContext {
    const range: CustomizedDataSet[] = [];
    for (const [i, dataSet] of this.dataSets.entries()) {
      range.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, this.sheetId),
      });
    }
    return {
      ...this,
      range,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): FunnelChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, newSheetId);
    return new FunnelChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): FunnelChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new FunnelChart(definition, sheetId, this.getters);
  }

  getDefinition(): FunnelChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): FunnelChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "funnel",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      aggregated: this.aggregated,
      horizontal: this.horizontal,
      axesDesign: this.axesDesign,
      showValues: this.showValues,
      funnelColors: this.funnelColors,
      cumulative: this.cumulative,
      humanize: this.humanize,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): FunnelChart {
    const { dataSets, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange);
    return new FunnelChart(definition, this.sheetId, this.getters);
  }
}

export function createFunnelChartRuntime(chart: FunnelChart, getters: Getters): FunnelChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getFunnelChartData(definition, chart.dataSets, chart.labelRange, getters);

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
        background: { color: chart.background },
      },
    },
  };

  return { chartJsConfig: config };
}
