import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import {
  AxesDesign,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
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
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import { CHART_COMMON_OPTIONS, truncateLabel } from "./chart_ui_common";
import {
  getBarChartLayout,
  getChartTitle,
  getTreeMapChartData,
  getTreeMapChartDatasets,
  getTreeMapChartTooltip,
} from "./runtime";

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
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
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
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.showHeaders = definition.showHeaders;
    this.headerDesign = definition.headerDesign;
    this.showValues = definition.showValues;
    this.showLabels = definition.showLabels;
    this.valuesDesign = definition.valuesDesign;
    this.coloringOptions = definition.coloringOptions;
  }

  static transformDefinition(
    definition: TreeMapChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): TreeMapChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: TreeMapChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): TreeMapChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "treemap",
      labelRange: context.auxiliaryRange || undefined,
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      showHeaders: context.showHeaders,
      headerDesign: context.headerDesign,
      showLabels: context.showLabels,
      valuesDesign: context.valuesDesign,
      coloringOptions: context.coloringOptions,
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

  copyForSheetId(sheetId: UID): TreeMapChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new TreeMapChart(definition, sheetId, this.getters);
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
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
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
      axesDesign: this.axesDesign,
      showValues: this.showValues,
      showHeaders: this.showHeaders,
      headerDesign: this.headerDesign,
      showLabels: this.showLabels,
      valuesDesign: this.valuesDesign,
      coloringOptions: this.coloringOptions,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): TreeMapChart {
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
  const chartData = getTreeMapChartData(definition, chart.dataSets, chart.labelRange, getters);

  console.log("chartData", chartData);
  const config: any = {
    type: "treemap",
    data: {
      labels: chartData.labels.map(truncateLabel),
      datasets: getTreeMapChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getBarChartLayout(definition),
      plugins: {
        title: getChartTitle(definition),
        legend: { display: false },
        tooltip: getTreeMapChartTooltip(definition, chartData),
        // chartShowValuesPlugin: getChartShowValues(definition, chartData),
      },
    },
  };

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}

// declare module "chart.js" {
//   export interface ChartTypeRegistry {
//     treemap: {
//       chartOptions: any;
//       datasetOptions: any;
//       defaultDataPoint: any;
//       metaExtensions: any;
//       parsedDataType: unknown;
//       scales: never;
//     };
//   }

//   // interface TooltipOptions<TType extends ChartType> extends CoreInteractionOptions, TreemapInteractionOptions {
//   // }
// }
