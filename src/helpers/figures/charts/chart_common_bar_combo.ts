import { ChartConfiguration, ChartDataset, LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  LocaleFormat,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import {
  BarChartDefinition,
  ChartCreationContext,
  DataSet,
  DatasetDesign,
  ExcelChartDefinition,
  LegendPosition,
  VerticalAxisPosition,
} from "../../../types/chart";
import { ComboChartDefinition } from "../../../types/chart/combo_chart";
import { ComboBarChartRuntime } from "../../../types/chart/common_bar_combo";
import { Validator } from "../../../types/validator";
import { ColorGenerator } from "../../color";
import { formatValue } from "../../format";
import { createRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import {
  aggregateDataForLabels,
  filterEmptyDataPoints,
  getChartDatasetFormat,
  getChartDatasetValues,
  getChartLabelValues,
  getDefaultChartJsRuntime,
} from "./chart_ui_common";

type ComboBarChartDefinition = BarChartDefinition | ComboChartDefinition;

export class ComboBarChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];

  constructor(
    readonly type: "bar" | "combo",
    definition: ComboBarChartDefinition,
    sheetId: UID,
    getters: CoreGetters
  ) {
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
    this.stacked = definition.stacked;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSetDesign;
  }

  static transformDefinition(
    definition: ComboBarChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ComboBarChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ComboBarChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
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
      dataSetDesign: this.dataSetDesign,
    };
  }

  copyForSheetId(sheetId: UID): ComboBarChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new ComboBarChart(this.type, definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ComboBarChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new ComboBarChart(this.type, definition, sheetId, this.getters);
  }

  getDefinition(): ComboBarChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): ComboBarChartDefinition {
    return {
      type: this.type,
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, targetSheetId || this.sheetId)
      ),
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      stacked: this.stacked,
      aggregated: this.aggregated,
      dataSetDesign: this.dataSetDesign,
    };
  }

  get verticalAxisPosition(): VerticalAxisPosition {
    let useRightAxis = false,
      useLeftAxis = false;
    for (const design of this.dataSetDesign || []) {
      if (design.yAxisID === "y") {
        useLeftAxis = true;
        break;
      } else if (design.yAxisID === "y1") {
        useRightAxis = true;
        break;
      }
    }
    return useLeftAxis || !useRightAxis ? "left" : "right";
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): ComboBarChart {
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
    return new ComboBarChart(this.type, definition, this.sheetId, this.getters);
  }
}

function getComboBarConfiguration(
  chart: ComboBarChart,
  labels: string[],
  localeFormat: LocaleFormat
): ChartConfiguration {
  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime(chart, labels, fontColor, localeFormat);
  const legend: DeepPartial<LegendOptions<"bar">> = {
    labels: { color: fontColor },
  };
  if ((!chart.labelRange && chart.dataSets.length === 1) || chart.legendPosition === "none") {
    legend.display = false;
  } else {
    legend.position = chart.legendPosition;
  }
  config.options.plugins!.legend = { ...config.options.plugins?.legend, ...legend };
  config.options.layout = {
    padding: { left: 20, right: 20, top: chart.title ? 10 : 25, bottom: 10 },
  };

  config.options.scales = {
    x: {
      ticks: {
        padding: 5,
        color: fontColor,
      },
    },
  };
  const yAxis = {
    beginAtZero: true, // the origin of the y axis is always zero
    ticks: {
      color: fontColor,
      callback: (value) => {
        value = Number(value);
        if (isNaN(value)) return value;
        const { locale, format } = localeFormat;
        return formatValue(value, { locale, format: !format && value > 1000 ? "#,##" : format });
      },
    },
  };
  const definition = chart.getDefinition();
  let useLeftAxis = false,
    useRightAxis = false;
  for (const design of definition.dataSetDesign || []) {
    if (design.yAxisID === "y") {
      useLeftAxis = true;
    } else if (design.yAxisID === "y1") {
      useRightAxis = true;
    }
  }
  if (useLeftAxis) {
    config.options.scales.y = {
      ...yAxis,
      position: "left",
    };
  }
  if (useRightAxis) {
    config.options.scales.y1 = {
      ...yAxis,
      position: "right",
    };
  }
  if (chart.stacked) {
    // @ts-ignore chart.js type is broken
    config.options.scales!.x!.stacked = true;
    if (useLeftAxis) {
      // @ts-ignore chart.js type is broken
      config.options.scales!.y!.stacked = true;
    }
    if (useRightAxis) {
      // @ts-ignore chart.js type is broken
      config.options.scales!.y1!.stacked = true;
    }
  }
  return config;
}

export function createComboBarChartRuntime(
  chart: ComboBarChart,
  getters: Getters
): ComboBarChartRuntime {
  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  let labels = labelValues.formattedValues;
  let dataSetsValues = getChartDatasetValues(getters, chart.dataSets);
  if (
    chart.dataSetsHaveTitle &&
    dataSetsValues[0] &&
    labels.length > dataSetsValues[0].data.length
  ) {
    labels.shift();
  }

  ({ labels, dataSetsValues } = filterEmptyDataPoints(labels, dataSetsValues));
  if (chart.aggregated) {
    ({ labels, dataSetsValues } = aggregateDataForLabels(labels, dataSetsValues));
  }

  const dataSetFormat = getChartDatasetFormat(getters, chart.dataSets);
  const locale = getters.getLocale();
  const config = getComboBarConfiguration(chart, labels, { format: dataSetFormat, locale });
  const colors = new ColorGenerator();

  for (let [index, { label, data }] of dataSetsValues.entries()) {
    const color = colors.next();
    const dataset: ChartDataset = {
      label,
      data,
      borderColor: color,
      backgroundColor: color,
      yAxisID: chart.dataSets[index].rightYAxis ? "y1" : "y",
    };
    config.data.datasets.push(dataset);
  }

  const definition = chart.getDefinition();
  for (const [index, dataset] of config.data.datasets.entries()) {
    if (definition.dataSetDesign?.[index]?.backgroundColor) {
      const color = definition.dataSetDesign[index].backgroundColor;
      dataset.backgroundColor = color;
      dataset.borderColor = color;
    }
    if (definition.dataSetDesign?.[index]?.label) {
      const label = definition.dataSetDesign[index].label;
      dataset.label = label;
    }
    if (definition.dataSetDesign?.[index]?.yAxisID) {
      const yAxisID = definition.dataSetDesign[index].yAxisID;
      dataset["yAxisID"] = yAxisID;
    }
  }

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
