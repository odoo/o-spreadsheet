import { ChartConfiguration, ChartDataSets, ChartLegendOptions } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../constants";
import { chartRegistry } from "../../registries/chart_types";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../types";
import { BarChartDefinition, BarChartRuntime } from "../../types/chart/bar_chart";
import {
  ChartCreationContext,
  DataSet,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "../../types/chart/chart";
import { LegendPosition, VerticalAxisPosition } from "../../types/chart/common_chart";
import { Validator } from "../../types/validator";
import { toXlsxHexColor } from "../../xlsx/helpers/colors";
import { isDefined } from "../misc";
import { createRange } from "../range";
import { AbstractChart } from "./abstract_chart";
import {
  ChartColors,
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  toExcelDataset,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import {
  filterEmptyDataPoints,
  getChartDatasetValues,
  getChartLabelValues,
  getDefaultChartJsRuntime,
} from "./chart_ui_common";

chartRegistry.add("bar", {
  match: (type) => type === "bar",
  createChart: (definition, sheetId, getters) =>
    new BarChart(definition as BarChartDefinition, sheetId, getters),
  getChartRuntime: createBarChartRuntime,
  validateChartDefinition: (validator, definition: BarChartDefinition) =>
    BarChart.validateChartDefinition(validator, definition),
  transformDefinition: (
    definition: BarChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ) => BarChart.transformDefinition(definition, executed),
  getChartDefinitionFromContextCreation: (context: ChartCreationContext) =>
    BarChart.getDefinitionFromContextCreation(context),
  name: "Bar",
});

export class BarChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background: string;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly stackedBar: boolean;
  readonly type = "bar";

  constructor(definition: BarChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.verticalAxisPosition = definition.verticalAxisPosition;
    this.legendPosition = definition.legendPosition;
    this.stackedBar = definition.stackedBar;
  }

  static transformDefinition(
    definition: BarChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): BarChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: BarChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): BarChartDefinition {
    return {
      background: context.background || BACKGROUND_CHART_COLOR,
      dataSets: context.range ? [context.range] : [],
      dataSetsHaveTitle: false,
      stackedBar: false,
      legendPosition: "top",
      title: context.title || "",
      type: "bar",
      verticalAxisPosition: "left",
      labelRange: context.auxiliaryRange || undefined,
    };
  }

  getContextCreation(): ChartCreationContext {
    return {
      background: this.background,
      title: this.title,
      range:
        this.dataSets.length > 0
          ? this.getters.getRangeString(this.dataSets[0].dataRange, this.sheetId)
          : undefined,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  copyForSheetId(sheetId: string): BarChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange);
    return new BarChart(definition, sheetId, this.getters);
  }

  getDefinition(): BarChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined
  ): BarChartDefinition {
    return {
      type: "bar",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, this.sheetId)
      ),
      legendPosition: this.legendPosition,
      verticalAxisPosition: this.verticalAxisPosition,
      labelRange: labelRange ? this.getters.getRangeString(labelRange, this.sheetId) : undefined,
      title: this.title,
      stackedBar: this.stackedBar,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition {
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== ""); // && range !== INCORRECT_RANGE_STRING ? show incorrect #ref ?
    return {
      ...this.getDefinition(),
      backgroundColor: toXlsxHexColor(this.background),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      stackedBar: this.stackedBar,
    };
  }

  getSheetIdsUsedInChartRanges(): UID[] {
    const sheetIds = new Set<UID>();
    const ranges: Range[] = [];
    this.dataSets.map((ds) => ds.dataRange).map((range) => ranges.push(range));
    this.dataSets
      .map((ds) => ds.labelCell)
      .filter(isDefined)
      .map((range) => ranges.push(range));
    if (this.labelRange) {
      ranges.push(this.labelRange);
    }
    for (const range of ranges) {
      sheetIds.add(range.sheetId);
    }
    return Array.from(sheetIds);
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

function getBarConfiguration(chart: BarChart, labels: string[]): BarChartRuntime {
  const fontColor = chartFontColor(chart.background);
  const config: ChartConfiguration = getDefaultChartJsRuntime(chart, labels, fontColor);
  const legend: ChartLegendOptions = {
    labels: { fontColor },
  };
  if (!chart.labelRange && chart.dataSets.length === 1) {
    legend.display = false;
  } else {
    legend.position = chart.legendPosition;
  }
  config.options!.legend = legend;
  config.options!.layout = {
    padding: { left: 20, right: 20, top: chart.title ? 10 : 25, bottom: 10 },
  };

  config.options!.scales = {
    xAxes: [
      {
        ticks: {
          // x axis configuration
          maxRotation: 60,
          minRotation: 15,
          padding: 5,
          labelOffset: 2,
          fontColor,
        },
      },
    ],
    yAxes: [
      {
        position: chart.verticalAxisPosition,
        ticks: {
          fontColor,
          // y axis configuration
          beginAtZero: true, // the origin of the y axis is always zero
        },
      },
    ],
  };
  if (chart.stackedBar) {
    config.options!.scales.xAxes![0].stacked = true;
    config.options!.scales.yAxes![0].stacked = true;
  }
  return config;
}

function createBarChartRuntime(chart: BarChart, getters: Getters): BarChartRuntime {
  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  let labels = labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, chart.dataSets);

  ({ labels, dataSetsValues } = filterEmptyDataPoints(labels, dataSetsValues));
  const runtime = getBarConfiguration(chart, labels);
  const colors = new ChartColors();

  for (let { label, data } of dataSetsValues) {
    const color = colors.next();
    const dataset: ChartDataSets = {
      label,
      data,
      borderColor: color,
      backgroundColor: color,
    };
    runtime.data!.datasets!.push(dataset);
  }

  return runtime;
}
