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
  TreeMapChartDefinition,
  TreeMapChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/tree_map_chart";
import { ChartConfiguration } from "chart.js";
import { CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
import {
  getChartTitle,
  getHierarchalChartData,
  getTreeMapChartDatasets,
  getTreeMapChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class TreeMapChart extends AbstractChart {
  static defaults = {
    background: BACKGROUND_CHART_COLOR,
    legendPosition: "top",
    dataSetsHaveTitle: false,
    showHeaders: true,
    headersColor: "#000000",
  };
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly type = "treemap";

  static allowedDefinitionKeys: readonly (keyof TreeMapChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "legendPosition",
    "dataSets",
    "dataSetsHaveTitle",
    "labelRange",
    "showHeaders",
    "headerDesign",
    "showLabels",
    "valuesDesign",
    "coloringOptions",
    "showValues",
  ] as const;

  constructor(private definition: TreeMapChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    definition: TreeMapChartDefinition,
    applyChange: RangeAdapter
  ): TreeMapChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: TreeMapChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): TreeMapChartDefinition {
    const dataSets: CustomizedDataSet[] = [];
    if (context.hierarchicalRanges?.length) {
      dataSets.push(...context.hierarchicalRanges);
    } else if (context.auxiliaryRange) {
      dataSets.push({ ...context.range?.[0], dataRange: context.auxiliaryRange });
    }
    return {
      background: context.background,
      dataSets,
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "treemap",
      labelRange: context.range?.[0]?.dataRange,
      showValues: context.showValues,
      showHeaders: context.showHeaders,
      headerDesign: context.headerDesign,
      showLabels: context.showLabels,
      valuesDesign: context.valuesDesign,
      coloringOptions: context.treemapColoringOptions,
      humanize: context.humanize,
    };
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    const leafRange = definition.dataSets.at(-1)?.dataRange;
    return {
      ...definition,
      treemapColoringOptions: definition.coloringOptions,
      range: definition.labelRange ? [{ dataRange: definition.labelRange }] : [],
      auxiliaryRange: leafRange,
      hierarchicalRanges: definition.dataSets,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): TreeMapChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, newSheetId);
    return new TreeMapChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): TreeMapChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new TreeMapChart(definition, sheetId, this.getters);
  }
  getDefinition(): TreeMapChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): TreeMapChartDefinition {
    const ranges: CustomizedDataSet[] = dataSets.map((dataSet) => ({
      dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
    }));
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
    return undefined;
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): TreeMapChart {
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
    return new TreeMapChart(definition, this.sheetId, this.getters);
  }
}

export function createTreeMapChartRuntime(
  getters: Getters,
  chart: TreeMapChart,
  data: ChartData
): TreeMapChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getHierarchalChartData(definition, data, getters);

  const config: ChartConfiguration = {
    type: "treemap",
    data: {
      labels: chartData.labels,
      datasets: getTreeMapChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: { display: false },
        tooltip: getTreeMapChartTooltip(definition, chartData),
      },
    },
  };

  return {
    chartJsConfig: config,
    background: definition.background || BACKGROUND_CHART_COLOR,
  };
}
