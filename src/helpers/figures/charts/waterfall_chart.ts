import type { ChartConfiguration, ChartDataset, LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import {
  BACKGROUND_CHART_COLOR,
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
} from "../../../constants";
import { _t } from "../../../translation";
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
import { ChartCreationContext, DataSet, ExcelChartDefinition } from "../../../types/chart/chart";
import { LegendPosition, VerticalAxisPosition } from "../../../types/chart/common_chart";
import {
  WaterfallChartDefinition,
  WaterfallChartRuntime,
} from "../../../types/chart/waterfall_chart";
import { Validator } from "../../../types/validator";
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
  truncateLabel,
} from "./chart_ui_common";

export class WaterfallChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly type = "waterfall";
  readonly dataSetsHaveTitle: boolean;
  readonly showSubTotals: boolean;
  readonly firstValueAsSubtotal?: boolean;
  readonly showConnectorLines: boolean;
  readonly positiveValuesColor?: Color;
  readonly negativeValuesColor?: Color;
  readonly subTotalValuesColor?: Color;

  constructor(definition: WaterfallChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.showSubTotals = definition.showSubTotals;
    this.showConnectorLines = definition.showConnectorLines;
    this.positiveValuesColor = definition.positiveValuesColor;
    this.negativeValuesColor = definition.negativeValuesColor;
    this.subTotalValuesColor = definition.subTotalValuesColor;
    this.firstValueAsSubtotal = definition.firstValueAsSubtotal;
  }

  static transformDefinition(
    definition: WaterfallChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): WaterfallChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: WaterfallChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): WaterfallChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ? context.range : [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "waterfall",
      verticalAxisPosition: context.verticalAxisPosition ?? "left",
      labelRange: context.auxiliaryRange || undefined,
      showSubTotals: context.showSubTotals ?? false,
      showConnectorLines: context.showConnectorLines ?? true,
      firstValueAsSubtotal: context.firstValueAsSubtotal ?? false,
    };
  }

  getContextCreation(): ChartCreationContext {
    return {
      ...this,
      range: this.dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, this.sheetId)
      ),
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  copyForSheetId(sheetId: UID): WaterfallChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new WaterfallChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): WaterfallChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new WaterfallChart(definition, sheetId, this.getters);
  }

  getDefinition(): WaterfallChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): WaterfallChartDefinition {
    return {
      type: "waterfall",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, targetSheetId || this.sheetId)
      ),
      legendPosition: this.legendPosition,
      verticalAxisPosition: this.verticalAxisPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      aggregated: this.aggregated,
      showSubTotals: this.showSubTotals,
      showConnectorLines: this.showConnectorLines,
      positiveValuesColor: this.positiveValuesColor,
      negativeValuesColor: this.negativeValuesColor,
      subTotalValuesColor: this.subTotalValuesColor,
      firstValueAsSubtotal: this.firstValueAsSubtotal,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // TODO: implement export excel
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): WaterfallChart {
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
    return new WaterfallChart(definition, this.sheetId, this.getters);
  }
}

function getWaterfallConfiguration(
  chart: WaterfallChart,
  labels: string[],
  dataSeriesLabels: (string | undefined)[],
  localeFormat: LocaleFormat
): ChartConfiguration {
  const { locale, format } = localeFormat;

  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime(chart, labels, fontColor, localeFormat);
  const negativeColor = chart.negativeValuesColor || CHART_WATERFALL_NEGATIVE_COLOR;
  const positiveColor = chart.positiveValuesColor || CHART_WATERFALL_POSITIVE_COLOR;
  const subTotalColor = chart.subTotalValuesColor || CHART_WATERFALL_SUBTOTAL_COLOR;
  const legend: DeepPartial<LegendOptions<"bar">> = {
    labels: {
      generateLabels: () => {
        const legendValues = [
          { text: _t("Positive values"), fontColor, fillStyle: positiveColor },
          { text: _t("Negative values"), fontColor, fillStyle: negativeColor },
        ];
        if (chart.showSubTotals || chart.firstValueAsSubtotal) {
          legendValues.push({
            text: _t("Subtotals"),
            fontColor,
            fillStyle: subTotalColor,
          });
        }
        return legendValues;
      },
    },
  };

  if (chart.legendPosition === "none") {
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
      grid: {
        display: false,
      },
    },
    y: {
      position: chart.verticalAxisPosition,
      ticks: {
        color: fontColor,
        callback: (value) => {
          value = Number(value);
          if (isNaN(value)) return value;
          return formatValue(value, {
            locale,
            format: !format && Math.abs(value) > 1000 ? "#,##" : format,
          });
        },
      },
      grid: {
        lineWidth: (context) => {
          return context.tick.value === 0 ? 2 : 1;
        },
      },
    },
  };
  config.options.plugins!.tooltip = {
    callbacks: {
      label: function (tooltipItem) {
        const [lastValue, currentValue] = tooltipItem.raw as [number, number];
        const yLabel = currentValue - lastValue;
        const dataSeriesIndex = Math.floor(tooltipItem.dataIndex / labels.length);
        const dataSeriesLabel = dataSeriesLabels[dataSeriesIndex];
        const toolTipFormat = !format && Math.abs(yLabel) > 1000 ? "#,##" : format;
        const yLabelStr = formatValue(yLabel, { format: toolTipFormat, locale });
        return dataSeriesLabel ? `${dataSeriesLabel}: ${yLabelStr}` : yLabelStr;
      },
    },
  };
  config.options.plugins!.waterfallLinesPlugin = { showConnectorLines: chart.showConnectorLines };

  return config;
}

export function createWaterfallChartRuntime(
  chart: WaterfallChart,
  getters: Getters
): WaterfallChartRuntime {
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
  if (chart.showSubTotals) {
    labels.push(_t("Subtotal"));
  }

  const dataSetFormat = getChartDatasetFormat(getters, chart.dataSets);
  const locale = getters.getLocale();
  const dataSeriesLabels = dataSetsValues.map((dataSet) => dataSet.label);
  const config = getWaterfallConfiguration(chart, labels, dataSeriesLabels, {
    format: dataSetFormat,
    locale,
  });
  config.type = "bar";

  const negativeColor = chart.negativeValuesColor || CHART_WATERFALL_NEGATIVE_COLOR;
  const positiveColor = chart.positiveValuesColor || CHART_WATERFALL_POSITIVE_COLOR;
  const subTotalColor = chart.subTotalValuesColor || CHART_WATERFALL_SUBTOTAL_COLOR;

  const backgroundColor: Color[] = [];
  const datasetValues: Array<[number, number]> = [];
  const dataset: ChartDataset = {
    label: "",
    data: datasetValues,
    backgroundColor,
  };
  const labelsWithSubTotals: string[] = [];
  let lastValue = 0;
  for (const dataSetsValue of dataSetsValues) {
    for (let i = 0; i < dataSetsValue.data.length; i++) {
      const data = dataSetsValue.data[i];
      labelsWithSubTotals.push(labels[i]);
      if (isNaN(Number(data))) {
        datasetValues.push([lastValue, lastValue]);
        backgroundColor.push("");
        continue;
      }
      datasetValues.push([lastValue, data + lastValue]);
      let color = data >= 0 ? positiveColor : negativeColor;
      if (i === 0 && dataSetsValue === dataSetsValues[0] && chart.firstValueAsSubtotal) {
        color = subTotalColor;
      }
      backgroundColor.push(color);
      lastValue += data;
    }
    if (chart.showSubTotals) {
      labelsWithSubTotals.push(_t("Subtotal"));
      datasetValues.push([0, lastValue]);
      backgroundColor.push(subTotalColor);
    }
  }
  config.data.datasets.push(dataset);
  config.data.labels = labelsWithSubTotals.map(truncateLabel);

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
