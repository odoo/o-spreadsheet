import type { ChartConfiguration, ChartDataset, LegendOptions } from "chart.js";
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
import { BarChartDefinition, BarChartRuntime } from "../../../types/chart/bar_chart";
import {
  AxesDesign,
  ChartCreationContext,
  DataSet,
  DatasetDesign,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { LegendPosition, VerticalAxisPosition } from "../../../types/chart/common_chart";
import { CellErrorType } from "../../../types/errors";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { ColorGenerator } from "../../color";
import { formatValue } from "../../format";
import { createRange } from "../../range";
import { AbstractChart, getChartTitle } from "./abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
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

export class BarChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly type = "bar";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;

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
    this.legendPosition = definition.legendPosition;
    this.stacked = definition.stacked;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSetDesign;
    this.axesDesign = definition.axesDesign;
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
      background: context.background,
      dataSets: context.range ? context.range : [],
      dataSetsHaveTitle: false,
      stacked: false,
      aggregated: context.aggregated ?? false,
      legendPosition: "top",
      title: context.title || "",
      type: "bar",
      labelRange: context.auxiliaryRange || undefined,
      dataSetDesign: context.dataSetDesign,
      axesDesign: context.axesDesign,
    };
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
      aggregated: this.aggregated,
      dataSetDesign: this.dataSetDesign,
      axesDesign: this.axesDesign,
    };
  }

  copyForSheetId(sheetId: UID): BarChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new BarChart(definition, sheetId, this.getters);
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
    return {
      type: "bar",
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
      axesDesign: this.axesDesign,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // Excel does not support aggregating labels
    if (this.aggregated) return undefined;
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== "" && ds.range !== CellErrorType.InvalidReference);
    const labelRange = toExcelLabelRange(
      this.getters,
      this.labelRange,
      shouldRemoveFirstLabel(this.labelRange, this.dataSets[0], this.dataSetsHaveTitle)
    );
    return {
      ...this.getDefinition(),
      title: getChartTitle(this.title),
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRange,
      verticalAxisPosition: this.verticalAxisPosition,
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

function getBarConfiguration(
  chart: BarChart,
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
  if (chart.axesDesign?.x?.title?.title) {
    config.options.scales.x!["title"] = {
      display: true,
      text: chart.axesDesign.x.title.title,
      color: chart.axesDesign.x.title.color,
      font: {
        style: chart.axesDesign.x.title.italic ? "italic" : "normal",
        weight: chart.axesDesign.x.title.bold ? "bold" : "normal",
      },
      align:
        chart.axesDesign.x.title.align === "left"
          ? "start"
          : chart.axesDesign.x.title.align === "right"
          ? "end"
          : "center",
    };
  }
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
  useLeftAxis ||= !useRightAxis;
  if (useLeftAxis) {
    config.options.scales.y = {
      ...yAxis,
      position: "left",
    };
    if (chart.axesDesign?.y?.title?.title) {
      config.options.scales.y!["title"] = {
        display: true,
        text: chart.axesDesign.y.title.title,
        color: chart.axesDesign.y.title.color,
        font: {
          style: chart.axesDesign.y.title.italic ? "italic" : "normal",
          weight: chart.axesDesign.y.title.bold ? "bold" : "normal",
        },
        align:
          chart.axesDesign.y.title.align === "left"
            ? "start"
            : chart.axesDesign.y.title.align === "right"
            ? "end"
            : "center",
      };
    }
  }
  if (useRightAxis) {
    config.options.scales.y1 = {
      ...yAxis,
      position: "right",
    };
    if (chart.axesDesign?.y1?.title?.title) {
      config.options.scales.y1!["title"] = {
        display: true,
        text: chart.axesDesign.y1.title.title,
        color: chart.axesDesign.y1.title.color,
        font: {
          style: chart.axesDesign.y1.title.italic ? "italic" : "normal",
          weight: chart.axesDesign.y1.title.bold ? "bold" : "normal",
        },
        align:
          chart.axesDesign.y1.title.align === "left"
            ? "start"
            : chart.axesDesign.y1.title.align === "right"
            ? "end"
            : "center",
      };
    }
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

export function createBarChartRuntime(chart: BarChart, getters: Getters): BarChartRuntime {
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
  const config = getBarConfiguration(chart, labels, { format: dataSetFormat, locale });
  const colors = new ColorGenerator();

  for (const { label, data } of dataSetsValues) {
    const color = colors.next();
    const dataset: ChartDataset = {
      label,
      data,
      borderColor: color,
      backgroundColor: color,
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
