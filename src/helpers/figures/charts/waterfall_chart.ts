import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
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
  ChartCreationContext,
  ChartData,
  CustomizedDataSet,
  DataSet,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import {
  WaterfallChartDefinition,
  WaterfallChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/waterfall_chart";
import type { ChartConfiguration } from "chart.js";
import { CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
import {
  getBarChartData,
  getChartTitle,
  getWaterfallChartLegend,
  getWaterfallChartScales,
  getWaterfallChartShowValues,
  getWaterfallChartTooltip,
  getWaterfallDatasetAndLabels,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class WaterfallChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly type = "waterfall";

  static allowedDefinitionKeys: readonly (keyof WaterfallChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "legendPosition",
    "dataSets",
    "dataSetsHaveTitle",
    "labelRange",
    "verticalAxisPosition",
    "aggregated",
    "showSubTotals",
    "showConnectorLines",
    "firstValueAsSubtotal",
    "positiveValuesColor",
    "negativeValuesColor",
    "subTotalValuesColor",
    "zoomable",
    "axesDesign",
    "showValues",
  ] as const;

  constructor(private definition: WaterfallChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    definition: WaterfallChartDefinition,
    applyChange: RangeAdapter
  ): WaterfallChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: WaterfallChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): WaterfallChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ? context.range : [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "waterfall",
      verticalAxisPosition: "left",
      labelRange: context.auxiliaryRange || undefined,
      showSubTotals: context.showSubTotals ?? false,
      showConnectorLines: context.showConnectorLines ?? true,
      firstValueAsSubtotal: context.firstValueAsSubtotal ?? false,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      zoomable: context.zoomable ?? false,
      humanize: context.humanize,
    };
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      range: definition.dataSets,
      auxiliaryRange: definition.labelRange,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): WaterfallChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, newSheetId);
    return new WaterfallChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): WaterfallChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new WaterfallChart(definition, sheetId, this.getters);
  }

  getDefinition(): WaterfallChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): WaterfallChartDefinition {
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
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // TODO: implement export excel
    return undefined;
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): WaterfallChart {
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
    return new WaterfallChart(definition, this.sheetId, this.getters);
  }
}

export function createWaterfallChartRuntime(
  getters: Getters,
  chart: WaterfallChart,
  data: ChartData
): WaterfallChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getBarChartData(definition, data, getters);

  const { labels, datasets } = getWaterfallDatasetAndLabels(definition, chartData);
  const config: ChartConfiguration = {
    type: "bar",
    data: {
      labels,
      datasets,
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getWaterfallChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getWaterfallChartLegend(definition, chartData),
        tooltip: getWaterfallChartTooltip(definition, chartData),
        chartShowValuesPlugin: getWaterfallChartShowValues(definition, chartData),
        waterfallLinesPlugin: { showConnectorLines: definition.showConnectorLines },
      },
    },
  };

  return {
    chartJsConfig: config,
    background: definition.background || BACKGROUND_CHART_COLOR,
  };
}
