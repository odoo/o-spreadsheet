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
import { BarChartDefinition } from "../../../types/chart/bar_chart";
import {
  AbstractChartAxesDesign,
  AbstractChartTitle,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { LegendPosition } from "../../../types/chart/common_chart";
import { PyramidChartDefinition, PyramidChartRuntime } from "../../../types/chart/pyramid_chart";
import { Validator } from "../../../types/validator";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import { BarChart, createBarChartRuntime } from "./bar_chart";
import {
  checkAxesDesign,
  checkChartTitle,
  checkDataset,
  checkLabelRange,
  copyAxesDesignWithNewSheetId,
  copyChartTitleReferenceWithNewSheetId,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  getAxesDesignWithRangeString,
  getAxesDesignWithValidRanges,
  getChartTitleWithRangeString,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";

export class PyramidChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly type = "pyramid";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AbstractChartAxesDesign;
  readonly horizontal = true;
  readonly stacked = true;

  constructor(definition: PyramidChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    ).slice(0, 2);
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = getAxesDesignWithValidRanges(getters, sheetId, definition.axesDesign);
  }

  static transformDefinition(
    definition: PyramidChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): PyramidChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: PyramidChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(
      definition,
      checkDataset,
      checkLabelRange,
      checkChartTitle,
      checkAxesDesign
    );
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): PyramidChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { type: "string", text: "" },
      type: "pyramid",
      labelRange: context.auxiliaryRange || undefined,
      axesDesign: context.axesDesign,
      horizontal: true,
      stacked: true,
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
      title: getChartTitleWithRangeString(this.getters, this.sheetId, this.title),
      range,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
      axesDesign: getAxesDesignWithRangeString(this.getters, this.sheetId, this.axesDesign),
    };
  }

  copyForSheetId(sheetId: UID): PyramidChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const chartTitle = copyChartTitleReferenceWithNewSheetId(this.sheetId, sheetId, this.title);
    const axesDesign = copyAxesDesignWithNewSheetId(this.sheetId, sheetId, this.axesDesign);
    const definition = this.getDefinitionWithSpecificDataSets(
      dataSets,
      labelRange,
      chartTitle,
      axesDesign,
      sheetId
    );
    return new PyramidChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): PyramidChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      this.title,
      this.axesDesign,
      sheetId
    );
    return new PyramidChart(definition, sheetId, this.getters);
  }

  getDefinition(): PyramidChartDefinition {
    return this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      this.title,
      this.axesDesign
    );
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    title: AbstractChartTitle,
    axesDesign?: AbstractChartAxesDesign,
    targetSheetId?: UID
  ): PyramidChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "pyramid",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: getChartTitleWithRangeString(this.getters, targetSheetId || this.sheetId, title),
      aggregated: this.aggregated,
      axesDesign: getAxesDesignWithRangeString(
        this.getters,
        targetSheetId || this.sheetId,
        axesDesign
      ),
      horizontal: true,
      stacked: true,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): PyramidChart {
    const { dataSets, labelRange, title, axesDesign, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.title,
      this.axesDesign,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(
      dataSets,
      labelRange,
      title,
      axesDesign
    );
    return new PyramidChart(definition, this.sheetId, this.getters);
  }
}

export function createPyramidChartRuntime(
  chart: PyramidChart,
  getters: Getters
): PyramidChartRuntime {
  const barDef: BarChartDefinition = { ...chart.getDefinition(), type: "bar" };
  const barChart = new BarChart(barDef, chart.sheetId, getters);
  const barRuntime = createBarChartRuntime(barChart, getters);
  const config = barRuntime.chartJsConfig;
  let datasets = config.data?.datasets;
  if (datasets && datasets[0]) {
    datasets[0].data = datasets[0].data.map((value: number) => (value > 0 ? value : 0));
  }
  if (datasets && datasets[1]) {
    datasets[1].data = datasets[1].data.map((value: number) => (value > 0 ? -value : 0));
  }

  const scales = config.options!.scales;
  const scalesXCallback = scales!.x!.ticks!.callback as (value: number) => string;
  scales!.x!.ticks!.callback = (value: number) => scalesXCallback(Math.abs(value));

  const tooltipLabelCallback = config.options!.plugins!.tooltip!.callbacks!.label! as any;
  config.options!.plugins!.tooltip!.callbacks!.label = (item) => {
    const tooltipItem = { ...item, parsed: { y: item.parsed.y, x: Math.abs(item.parsed.x) } };
    return tooltipLabelCallback(tooltipItem);
  };

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
