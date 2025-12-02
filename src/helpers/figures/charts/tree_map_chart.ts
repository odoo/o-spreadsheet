import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
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
  TreeMapChartDefinition,
  TreeMapChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/tree_map_chart";
import { ChartConfiguration } from "chart.js";
import { ApplyRangeChange, CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
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
    "dataSource",
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
    this.dataSets = createDataSets(getters, sheetId, definition);
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
    let dataSource: ChartRangeDataSource = { dataSets: [] };
    if (context.hierarchicalDataSource) {
      dataSource = context.hierarchicalDataSource;
    } else if (context.auxiliaryRange) {
      dataSource = { dataSets: [{ dataRange: context.auxiliaryRange, id: "0" }] };
    }
    return {
      background: context.background,
      dataSets: context.dataSets ?? {},
      dataSource,
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "treemap",
      labelRange: dataSource.dataSets?.[0]?.dataRange,
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
    const leafRange = definition.dataSource.dataSets.at(-1)?.dataRange;
    return {
      ...definition,
      treemapColoringOptions: definition.coloringOptions,
      dataSource: definition.labelRange
        ? { dataSets: [{ dataRange: definition.labelRange, id: "0" }] }
        : { dataSets: [] },
      auxiliaryRange: leafRange,
      hierarchicalDataSource: definition.dataSource,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): TreeMapChart {
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
    return new TreeMapChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): TreeMapChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.definition.dataSource,
      this.labelRange,
      sheetId
    );
    return new TreeMapChart(definition, sheetId, this.getters);
  }
  getDefinition(): TreeMapChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.definition.dataSource, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSource: ChartRangeDataSource,
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): TreeMapChartDefinition {
    return {
      ...this.definition,
      dataSource,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): TreeMapChart {
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
