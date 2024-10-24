import { ChartDataset, LegendOptions } from "chart.js";
import { DeepPartial } from "chart.js/dist/types/utils";
import { BACKGROUND_CHART_COLOR, LINE_FILL_TRANSPARENCY } from "../../../constants";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  DatasetDesign,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import {
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  ExcelChartDataset,
  ExcelChartDefinition,
  LegendPosition,
} from "../../../types/chart";
import { RadarChartDefinition, RadarChartRuntime } from "../../../types/chart/radar_chart";
import { CellErrorType } from "../../../types/errors";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { setColorAlpha } from "../../color";
import { formatValue } from "../../format/format";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  INTERACTIVE_LEGEND_CONFIG,
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  formatTickValue,
  getChartColorsGenerator,
  getCustomLegendLabels,
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

export class RadarChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly type = "radar";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly fillArea?: boolean;

  constructor(definition: RadarChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    this.stacked = definition.stacked;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.fillArea = definition.fillArea;
  }

  static transformDefinition(
    definition: RadarChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): RadarChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: RadarChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): RadarChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "radar",
      labelRange: context.auxiliaryRange || undefined,
      fillArea: context.fillArea ?? false,
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

  copyForSheetId(sheetId: UID): RadarChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new RadarChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): RadarChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new RadarChart(definition, sheetId, this.getters);
  }

  getDefinition(): RadarChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): RadarChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "radar",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      stacked: this.stacked,
      aggregated: this.aggregated,
      fillArea: this.fillArea,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
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
    };
  }

  updateRanges(applyChange: ApplyRangeChange): RadarChart {
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
    return new RadarChart(definition, this.sheetId, this.getters);
  }
}

export function createRadarChartRuntime(chart: RadarChart, getters: Getters): RadarChartRuntime {
  const definition = chart.getDefinition();
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

  const dataSetFormat =
    getChartDatasetFormat(getters, chart.dataSets, "left") ||
    getChartDatasetFormat(getters, chart.dataSets, "right");
  const axisFormats = { r: dataSetFormat };
  const locale = getters.getLocale();
  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime(chart, labels, fontColor, {
    axisFormats,
    locale,
  });
  const fill = definition.fillArea ?? false;
  const pointStyle = fill ? "rect" : "line";
  const lineWidth = fill ? 2 : 3;
  const legend: DeepPartial<LegendOptions<"radar">> = {
    ...INTERACTIVE_LEGEND_CONFIG,
    ...getCustomLegendLabels(fontColor, {
      pointStyle,
      lineWidth,
    }),
  };
  if ((!chart.labelRange && chart.dataSets.length === 1) || chart.legendPosition === "none") {
    legend.display = false;
  } else {
    legend.position = chart.legendPosition;
  }
  config.options.plugins!.legend = { ...config.options.plugins?.legend, ...legend };
  config.options.plugins!.tooltip = {
    ...config.options.plugins?.tooltip,
    callbacks: {
      label: function (tooltipItem) {
        const xLabel = tooltipItem.dataset?.label || tooltipItem.label;
        const yLabel = tooltipItem.parsed.r;
        const formattedY = formatValue(yLabel, { format: dataSetFormat, locale });
        return xLabel ? `${xLabel}: ${formattedY}` : formattedY;
      },
    },
  };
  config.options.scales = {
    r: {
      ticks: {
        callback: formatTickValue({ format: dataSetFormat, locale }),
        backdropColor: chart.background || "#FFFFFF",
      },
      pointLabels: { color: fontColor },
    },
  };
  config.options.layout = {
    padding: { left: 20, right: 20, top: chart.title ? 10 : 25, bottom: 10 },
  };

  const colorGenerator = getChartColorsGenerator(definition, dataSetsValues.length);
  for (let i = 0; i < dataSetsValues.length; i++) {
    let { label, data } = dataSetsValues[i];
    if (definition.dataSets?.[i]?.label) {
      label = definition.dataSets[i].label;
    }
    const borderColor = colorGenerator.next();
    const dataset: ChartDataset = {
      label,
      data,
      borderColor,
      backgroundColor: borderColor,
    };
    if (fill) {
      dataset.backgroundColor = setColorAlpha(borderColor, LINE_FILL_TRANSPARENCY);
      dataset["fill"] = "start";
    }
    config.data.datasets.push(dataset);
  }

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
