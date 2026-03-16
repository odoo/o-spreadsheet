import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  getDefinedAxis,
  shouldRemoveFirstLabel,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { isDefined } from "@odoo/o-spreadsheet-engine/helpers/misc";
import {
  createValidRange,
  duplicateRangeInDuplicatedSheet,
} from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  BarChartDefinition,
  BarChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/bar_chart";
import {
  AxesDesign,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { LegendPosition } from "@odoo/o-spreadsheet-engine/types/chart/common_chart";
import { CommandResult } from "@odoo/o-spreadsheet-engine/types/commands";
import { Getters } from "@odoo/o-spreadsheet-engine/types/getters";
import { Color, RangeAdapter, UID } from "@odoo/o-spreadsheet-engine/types/misc";
import { Range } from "@odoo/o-spreadsheet-engine/types/range";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import type { ChartConfiguration } from "chart.js";
import {
  getBarChartData,
  getBarChartDatasets,
  getBarChartLegend,
  getBarChartScales,
  getBarChartTooltip,
  getChartGroupedLabels,
  getChartShowValues,
  getChartTitle,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class BarChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRanges: Range[];
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly type = "bar";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
  readonly horizontal?: boolean;
  readonly showValues?: boolean;
  readonly zoomable?: boolean;
  readonly groupBySecondaryLabels?: boolean;

  constructor(definition: BarChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRanges = (definition.labelRanges || [])
      .map((r) => createValidRange(getters, sheetId, r))
      .filter(isDefined);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.stacked = definition.stacked;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.horizontal = definition.horizontal;
    this.showValues = definition.showValues;
    this.zoomable = definition.zoomable;
    this.groupBySecondaryLabels = definition.groupBySecondaryLabels;
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: BarChartDefinition,
    applyChange: RangeAdapter
  ): BarChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
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
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "bar",
      labelRanges: context.auxiliaryRanges,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      horizontal: context.horizontal,
      zoomable: context.zoomable,
      humanize: context.humanize,
      groupBySecondaryLabels: context.groupBySecondaryLabels,
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
      auxiliaryRanges: this.labelRanges.length
        ? this.labelRanges.map((r) => this.getters.getRangeString(r, this.sheetId))
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): BarChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRanges = this.labelRanges.map((r) =>
      duplicateRangeInDuplicatedSheet(this.sheetId, newSheetId, r)
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRanges, newSheetId);
    return new BarChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): BarChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRanges,
      sheetId
    );
    return new BarChart(definition, sheetId, this.getters);
  }

  getDefinition(): BarChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRanges);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRanges: Range[],
    targetSheetId?: UID
  ): BarChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "bar",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRanges: labelRanges.length
        ? labelRanges.map((r) => this.getters.getRangeString(r, targetSheetId || this.sheetId))
        : undefined,
      title: this.title,
      stacked: this.stacked,
      aggregated: this.aggregated,
      axesDesign: this.axesDesign,
      horizontal: this.horizontal,
      showValues: this.showValues,
      zoomable: this.horizontal ? undefined : this.zoomable,
      humanize: this.humanize,
      groupBySecondaryLabels: this.groupBySecondaryLabels,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    const { dataSets, labelRanges } = this.getCommonDataSetAttributesForExcel(
      this.labelRanges,
      this.dataSets,
      shouldRemoveFirstLabel(this.labelRanges[0], this.dataSets[0], this.dataSetsHaveTitle)
    );
    const { labelRanges: _, ...definition } = this.getDefinition();
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRanges,
      verticalAxis: getDefinedAxis(definition),
    };
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): BarChart {
    const { dataSets, labelRanges, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRanges
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRanges || []);
    return new BarChart(definition, this.sheetId, this.getters);
  }
}

export function createBarChartRuntime(chart: BarChart, getters: Getters): BarChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getBarChartData(definition, chart.dataSets, chart.labelRanges, getters);

  const config: ChartConfiguration<"bar" | "line"> = {
    type: "bar",
    data: {
      labels: chartData.labels,
      datasets: getBarChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      indexAxis: chart.horizontal ? "y" : "x",
      layout: getChartLayout(definition, chartData),
      scales: getBarChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getBarChartLegend(definition, chartData),
        tooltip: getBarChartTooltip(definition, chartData),
        chartShowValuesPlugin: getChartShowValues(definition, chartData),
        background: { color: chart.background },
        chartGroupedLabelsPlugin: getChartGroupedLabels(chartData, chart.background),
      },
    },
  };

  return { chartJsConfig: config };
}
