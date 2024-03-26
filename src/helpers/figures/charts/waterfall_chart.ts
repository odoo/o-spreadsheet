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
  ChartColors,
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
      dataSetsHaveTitle: false,
      aggregated: context.aggregated ?? false,
      legendPosition: "top",
      title: context.title || "",
      type: "waterfall",
      verticalAxisPosition: "left",
      labelRange: context.auxiliaryRange || undefined,
      showSubTotals: false,
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
    y: {
      position: chart.verticalAxisPosition,
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
    },
  };
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

  const dataSetFormat = getChartDatasetFormat(getters, chart.dataSets);
  const locale = getters.getLocale();
  const config = getWaterfallConfiguration(chart, labels, { format: dataSetFormat, locale });
  const colors = new ChartColors();

  for (let { label, data } of dataSetsValues) {
    const color = colors.next();
    const dataset: ChartDataset = {
      label,
      data,
      borderColor: color,
      backgroundColor: color,
    };
    config.data.datasets.push(dataset);
  }

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
