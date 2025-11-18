import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  getDefinedAxis,
  shouldRemoveFirstLabel,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  BarChartDefinition,
  BarChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/bar_chart";
import {
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { CommandResult } from "@odoo/o-spreadsheet-engine/types/commands";
import { Getters } from "@odoo/o-spreadsheet-engine/types/getters";
import { ApplyRangeChange, RangeAdapter, UID } from "@odoo/o-spreadsheet-engine/types/misc";
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
    "legendPosition",
    "dataSets",
    "dataSetsHaveTitle",
    "labelRange",
    "horizontal",
    "axesDesign",
    "stacked",
    "aggregated",
    "showValues",
    "zoomable",
  ] as const;

  constructor(private definition: BarChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
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
      labelRange: context.auxiliaryRange || undefined,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      horizontal: context.horizontal,
      zoomable: context.zoomable,
      humanize: context.humanize,
    };
  }

  getContextCreation(): ChartCreationContext {
    const range: CustomizedDataSet[] = [];
    for (const [i, dataSet] of this.dataSets.entries()) {
      range.push({
        ...this.definition.dataSets?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, this.sheetId),
      });
    }
    return {
      ...this.getDefinition(),
      range,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): BarChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, newSheetId);
    return new BarChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): BarChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new BarChart(definition, sheetId, this.getters);
  }

  getDefinition(): BarChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): BarChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.definition.dataSets?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      ...this.definition,
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      dataSets: ranges,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      zoomable: this.definition.horizontal ? undefined : this.definition.zoomable,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    const definition = this.getDefinition();
    const { dataSets, labelRange } = this.getCommonDataSetAttributesForExcel(
      this.labelRange,
      this.dataSets,
      shouldRemoveFirstLabel(this.labelRange, this.dataSets[0], definition.dataSetsHaveTitle)
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

  updateRanges(applyChange: ApplyRangeChange): BarChart {
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
    return new BarChart(definition, this.sheetId, this.getters);
  }
}

export function createBarChartRuntime(chart: BarChart, getters: Getters): BarChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getBarChartData(definition, chart.dataSets, chart.labelRange, getters);

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

  return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
}
