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
  Format,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import { ExcelChartDataset, LegendPosition, VerticalAxisPosition } from "../../../types/chart";
import { ComboChartDefinition, ComboChartRuntime } from "../../../types/chart/combo_chart";
import { CellErrorType } from "../../../types/errors";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
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
  readonly useBothYAxis?: boolean;
  readonly dataSets: DataSet[];
  readonly labelRange?: Range;
  readonly background?: Color;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly dataSetsHaveTitle: boolean;
  readonly type = "combo";

  constructor(definition: ComboChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    this.useBothYAxis = definition.useBothYAxis;
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

  getDefinition(): ComboChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): ComboChartDefinition {
    return {
      type: "combo",
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
      useBothYAxis: this.useBothYAxis,
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
    return {
      ...this.getDefinition(),
      title: this.title.text ?? "",
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRange,
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
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      aggregated: context.aggregated,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      verticalAxisPosition: context.verticalAxisPosition ?? "left",
      labelRange: context.auxiliaryRange || undefined,
      type: "combo",
      useBothYAxis: false,
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
  const formatCallback = (format: Format | undefined) => {
    return (value) => {
      value = Number(value);
      if (isNaN(value)) return value;
      const { locale } = localeFormat;
      return formatValue(value, {
        locale,
        format: !format && Math.abs(value) >= 1000 ? "#,##" : format,
      });
    };
  };
  const leftVerticalAxis = {
    beginAtZero: true, // the origin of the y axis is always zero
    ticks: {
      color: fontColor,
      callback: formatCallback(mainDataSetFormat),
    },
  };
  const rightVerticalAxis = {
    beginAtZero: true, // the origin of the y axis is always zero
    ticks: {
      color: fontColor,
      callback: formatCallback(lineDataSetsFormat),
    },
  };
  if (chart.useBothYAxis) {
    config.options.scales.y = {
      ...leftVerticalAxis,
      position: "left",
    };
    config.options.scales.y1 = {
      ...rightVerticalAxis,
      position: "right",
      grid: {
        display: false,
      },
    };
  } else {
    config.options.scales.y = {
      ...leftVerticalAxis,
      position: chart.verticalAxisPosition,
    };
  }

  const colors = new ColorGenerator();

  for (let [index, { label, data }] of dataSetsValues.entries()) {
    const color = colors.next();
    const dataset: ChartDataset = {
      label,
      data,
      borderColor: color,
      backgroundColor: color,
      yAxisID: index > 0 && chart.useBothYAxis ? "y1" : "y",
      type: index === 0 ? "bar" : "line",
      order: -index,
    };
    config.data.datasets.push(dataset);
  }

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
