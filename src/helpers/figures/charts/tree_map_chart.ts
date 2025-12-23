import { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RangeAdapter,
  RangeAdapterFunctions,
  UID,
} from "../../../types";
import {
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  ExcelChartDefinition,
  TitleDesign,
} from "../../../types/chart/chart";
import { LegendPosition } from "../../../types/chart/common_chart";
import {
  TreeMapChartDefinition,
  TreeMapChartRuntime,
  TreeMapColoringOptions,
} from "../../../types/chart/tree_map_chart";
import { Validator } from "../../../types/validator";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
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
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly type = "treemap";
  readonly dataSetsHaveTitle: boolean;
  readonly showHeaders?: boolean;
  readonly headerDesign?: TitleDesign;
  readonly showValues?: boolean;
  readonly showLabels?: boolean;
  readonly valuesDesign?: TitleDesign;
  readonly coloringOptions?: TreeMapColoringOptions;

  constructor(definition: TreeMapChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.showHeaders = definition.showHeaders;
    this.headerDesign = definition.headerDesign;
    this.showValues = definition.showValues;
    this.showLabels = definition.showLabels;
    this.valuesDesign = definition.valuesDesign;
    this.coloringOptions = definition.coloringOptions;
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
    const leafRange = this.dataSets.at(-1)?.dataRange;
    return {
      ...this,
      range: this.labelRange
        ? [{ dataRange: this.getters.getRangeString(this.labelRange, this.sheetId) }]
        : [],
      auxiliaryRange: leafRange ? this.getters.getRangeString(leafRange, this.sheetId) : undefined,
      hierarchicalRanges: this.dataSets.map((ds: DataSet) => ({
        dataRange: this.getters.getRangeString(ds.dataRange, this.sheetId),
      })),
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
      type: "treemap",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      showValues: this.showValues,
      showHeaders: this.showHeaders,
      headerDesign: this.headerDesign,
      showLabels: this.showLabels,
      valuesDesign: this.valuesDesign,
      coloringOptions: this.coloringOptions,
      humanize: this.humanize,
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
  chart: TreeMapChart,
  getters: Getters
): TreeMapChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getHierarchalChartData(definition, chart.dataSets, chart.labelRange, getters);

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

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
