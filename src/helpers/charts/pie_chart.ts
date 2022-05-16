import {
  ChartConfiguration,
  ChartData,
  ChartDataSets,
  ChartLegendOptions,
  ChartTooltipItem,
} from "chart.js";
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
import {
  ChartCreationContext,
  DataSet,
  DatasetValues,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "../../types/chart/chart";
import { LegendPosition } from "../../types/chart/common_chart";
import { PieChartDefinition, PieChartRuntime } from "../../types/chart/pie_chart";
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
chartRegistry.add("pie", {
  match: (type) => type === "pie",
  createChart: (definition, sheetId, getters) =>
    new PieChart(definition as PieChartDefinition, sheetId, getters),
  getChartRuntime: createPieChartRuntime,
  validateChartDefinition: (validator, definition: PieChartDefinition) =>
    PieChart.validateChartDefinition(validator, definition),
  transformDefinition: (
    definition: PieChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ) => PieChart.transformDefinition(definition, executed),
  getChartDefinitionFromContextCreation: (context: ChartCreationContext) =>
    PieChart.getDefinitionFromContextCreation(context),
  name: "Pie",
});

export class PieChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background: string;
  readonly legendPosition: LegendPosition;
  readonly type = "pie";

  constructor(definition: PieChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
  }

  static transformDefinition(
    definition: PieChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): PieChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: PieChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): PieChartDefinition {
    return {
      background: context.background || BACKGROUND_CHART_COLOR,
      dataSets: context.range ? context.range : [],
      dataSetsHaveTitle: false,
      legendPosition: "top",
      title: context.title || "",
      type: "pie",
      labelRange: context.auxiliaryRange || undefined,
    };
  }

  getDefinition(): PieChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  getContextCreation(): ChartCreationContext {
    return {
      background: this.background,
      title: this.title,
      range: this.dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, this.sheetId)
      ),
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined
  ): PieChartDefinition {
    return {
      type: "pie",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, this.sheetId)
      ),
      legendPosition: this.legendPosition,
      labelRange: labelRange ? this.getters.getRangeString(labelRange, this.sheetId) : undefined,
      title: this.title,
    };
  }

  copyForSheetId(sheetId: string): PieChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange);
    return new PieChart(definition, sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition {
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== ""); // && range !== INCORRECT_RANGE_STRING ? show incorrect #ref ?
    return {
      ...this.getDefinition(),
      backgroundColor: toXlsxHexColor(this.background),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      verticalAxisPosition: "left", //TODO ExcelChartDefinition should be adapted, but can be done later
      dataSets,
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

  updateRanges(applyChange: ApplyRangeChange): PieChart {
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
    return new PieChart(definition, this.sheetId, this.getters);
  }
}

function getPieConfiguration(chart: PieChart, labels: string[]): ChartConfiguration {
  const fontColor = chartFontColor(chart.background);
  const config: ChartConfiguration = getDefaultChartJsRuntime(chart, labels, fontColor);
  const legend: ChartLegendOptions = {
    labels: { fontColor },
  };
  if ((!chart.labelRange && chart.dataSets.length === 1) || chart.legendPosition === "none") {
    legend.display = false;
  } else {
    legend.position = chart.legendPosition;
  }
  config.options!.legend = legend;
  config.options!.layout = {
    padding: { left: 20, right: 20, top: chart.title ? 10 : 25, bottom: 10 },
  };
  config.options!.tooltips = {
    callbacks: {
      title: function (tooltipItems: ChartTooltipItem[], data: ChartData) {
        return data.datasets![tooltipItems[0]!.datasetIndex!].label!;
      },
    },
  };
  return config;
}

function getPieColors(colors: ChartColors, dataSetsValues: DatasetValues[]): string[] {
  const pieColors: string[] = [];
  const maxLength = Math.max(...dataSetsValues.map((ds) => ds.data.length));
  for (let i = 0; i <= maxLength; i++) {
    pieColors.push(colors.next());
  }

  return pieColors;
}

function createPieChartRuntime(chart: PieChart, getters: Getters): PieChartRuntime {
  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  let labels = labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, chart.dataSets);

  ({ labels, dataSetsValues } = filterEmptyDataPoints(labels, dataSetsValues));
  const runtime = getPieConfiguration(chart, labels);
  const colors = new ChartColors();
  for (let { label, data } of dataSetsValues) {
    const backgroundColor = getPieColors(colors, dataSetsValues);
    const dataset: ChartDataSets = {
      label,
      data,
      borderColor: "#FFFFFF",
      backgroundColor,
    };
    runtime.data!.datasets!.push(dataset);
  }

  return runtime;
}
