import { ChartDataset, LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  ChartCreationContext,
  Color,
  CommandResult,
  CoreGetters,
  DataSet,
  ExcelChartDefinition,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import {
  AxesDesign,
  CustomizedDataSet,
  ExcelChartDataset,
  LegendPosition,
} from "../../../types/chart";
import {
  ComboChartDataSet,
  ComboChartDefinition,
  ComboChartRuntime,
} from "../../../types/chart/combo_chart";
import { CellErrorType } from "../../../types/errors";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { removeFalsyAttributes } from "../../misc";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  TREND_LINE_XAXIS_ID,
  chartFontColor,
  checkDataset,
  checkLabelRange,
  computeChartPadding,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  formatTickValue,
  getChartAxis,
  getChartColorsGenerator,
  getDefinedAxis,
  getTrendDatasetForBarChart,
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

export class ComboChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: ComboChartDataSet[];
  readonly axesDesign?: AxesDesign;
  readonly type = "combo";
  readonly showValues?: boolean;

  constructor(definition: ComboChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.showValues = definition.showValues;
  }

  static transformDefinition(
    definition: ComboChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ComboChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ComboChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
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

  getDefinition(): ComboChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): ComboChartDefinition {
    const ranges: ComboChartDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
        type: this.dataSetDesign?.[i]?.type ?? (i ? "line" : "bar"),
      });
    }
    return {
      type: "combo",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      aggregated: this.aggregated,
      axesDesign: this.axesDesign,
      showValues: this.showValues,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // Excel does not support aggregating labels
    if (this.aggregated) {
      return undefined;
    }
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== "" && ds.range !== CellErrorType.InvalidReference);
    const labelRange = toExcelLabelRange(
      this.getters,
      this.labelRange,
      shouldRemoveFirstLabel(this.labelRange, this.dataSets[0], this.dataSetsHaveTitle)
    );
    const definition = this.getDefinition();
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRange,
      verticalAxis: getDefinedAxis(definition),
    };
  }

  updateRanges(applyChange: ApplyRangeChange): ComboChart {
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
    return new ComboChart(definition, this.sheetId, this.getters);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ComboChartDefinition {
    const dataSets: ComboChartDataSet[] = (context.range ?? []).map((ds, index) => ({
      ...ds,
      type: index ? "line" : "bar",
    }));
    return {
      background: context.background,
      dataSets,
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      aggregated: context.aggregated,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      labelRange: context.auxiliaryRange || undefined,
      type: "combo",
      axesDesign: context.axesDesign,
      showValues: context.showValues,
    };
  }

  copyForSheetId(sheetId: UID): ComboChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new ComboChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ComboChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new ComboChart(definition, sheetId, this.getters);
  }
}

export function createComboChartRuntime(chart: ComboChart, getters: Getters): ComboChartRuntime {
  const mainDataSetFormat = chart.dataSets.length
    ? getChartDatasetFormat(getters, [chart.dataSets[0]])
    : undefined;
  const lineDataSetsFormat = getChartDatasetFormat(getters, chart.dataSets.slice(1));
  const locale = getters.getLocale();

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

  const localeFormat = { format: mainDataSetFormat, locale };

  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime(chart, labels, fontColor, localeFormat);
  const legend: DeepPartial<LegendOptions<"bar">> = {
    labels: { color: fontColor },
  };
  if (chart.legendPosition === "none") {
    legend.display = false;
  } else {
    legend.position = chart.legendPosition;
  }
  config.options.plugins!.legend = { ...config.options.plugins?.legend, ...legend };
  config.options.layout = {
    padding: computeChartPadding({
      displayTitle: !!chart.title.text,
      displayLegend: chart.legendPosition === "top",
    }),
  };

  const definition = chart.getDefinition();
  config.options.scales = {
    x: getChartAxis(definition, "bottom", "labels", { locale }),
    y: getChartAxis(definition, "left", "values", { locale, format: mainDataSetFormat }),
    y1: getChartAxis(definition, "right", "values", { locale, format: lineDataSetsFormat }),
  };
  config.options.scales = removeFalsyAttributes(config.options.scales);

  config.options.plugins!.chartShowValuesPlugin = {
    showValues: chart.showValues,
    background: chart.background,
    callback: formatTickValue({ format: mainDataSetFormat, locale }),
  };

  const colors = getChartColorsGenerator(definition, dataSetsValues.length);
  let maxLength = 0;
  const trendDatasets: any[] = [];

  for (let [index, { label, data }] of dataSetsValues.entries()) {
    const design = definition.dataSets[index];
    const color = colors.next();
    const type = design?.type ?? "line";
    const dataset: ChartDataset<"bar" | "line", number[]> = {
      label: design?.label ?? label,
      data,
      borderColor: color,
      backgroundColor: color,
      yAxisID: design?.yAxisId ?? "y",
      type,
      order: type === "bar" ? dataSetsValues.length + index : index,
    };
    config.data.datasets.push(dataset);

    const trend = definition.dataSets?.[index].trend;
    if (!trend?.display) {
      continue;
    }

    maxLength = Math.max(maxLength, data.length);
    const trendDataset = getTrendDatasetForBarChart(trend, dataset);
    if (trendDataset) {
      trendDatasets.push(trendDataset);
    }
  }
  if (trendDatasets.length) {
    /* We add a second x axis here to draw the trend lines, with the labels length being
     * set so that the second axis points match the classical x axis
     */
    const trendLinesMaxLength = Math.max(...trendDatasets.map((trend) => trend.data.length));
    config.options.scales[TREND_LINE_XAXIS_ID] = {
      labels: Array(Math.round(trendLinesMaxLength)).fill(""),
      offset: false,
      display: false,
    };
    /* These datasets must be inserted after the original datasets to ensure the way we
     * distinguish the originals and trendLine datasets after
     */
    trendDatasets.forEach((x) => config.data.datasets!.push(x));

    const originalTooltipTitle = config.options.plugins!.tooltip!.callbacks!.title;
    config.options.plugins!.tooltip!.callbacks!.title = function (tooltipItems) {
      if (tooltipItems.some((item) => item.dataset.xAxisID !== TREND_LINE_XAXIS_ID)) {
        // @ts-expect-error
        return originalTooltipTitle?.(tooltipItems);
      }
      return "";
    };
  }

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
