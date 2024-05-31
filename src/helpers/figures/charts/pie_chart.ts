import type {
  ActiveElement,
  BubbleDataPoint,
  Chart,
  ChartConfiguration,
  ChartDataset,
  LegendElement,
  LegendItem,
  LegendOptions,
  Point,
} from "chart.js";
import { ChartEvent } from "chart.js/dist/core/core.plugins";
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
  ChartCreationContext,
  DataSet,
  DatasetValues,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { LegendPosition } from "../../../types/chart/common_chart";
import { PieChartDefinition, PieChartRuntime } from "../../../types/chart/pie_chart";
import { CellErrorType } from "../../../types/errors";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { ColorGenerator, setColorAlpha } from "../../color";
import { formatValue } from "../../format";
import { largeMax } from "../../misc";
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

export class PieChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly type = "pie";
  readonly aggregated?: boolean;
  readonly dataSetsHaveTitle: boolean;
  lastHoveredIndex: number | undefined = undefined;

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
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
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
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "pie",
      labelRange: context.auxiliaryRange || undefined,
      aggregated: context.aggregated ?? false,
    };
  }

  getDefinition(): PieChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  getContextCreation(): ChartCreationContext {
    return {
      ...this,
      range: this.dataSets.map((ds: DataSet) => ({
        dataRange: this.getters.getRangeString(ds.dataRange, this.sheetId),
      })),
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): PieChartDefinition {
    return {
      type: "pie",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: dataSets.map((ds: DataSet) => ({
        dataRange: this.getters.getRangeString(ds.dataRange, targetSheetId || this.sheetId),
      })),
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      aggregated: this.aggregated,
    };
  }

  copyForSheetId(sheetId: UID): PieChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new PieChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): PieChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new PieChart(definition, sheetId, this.getters);
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
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRange,
    };
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

  highlightItem(index: number, dataSets) {
    dataSets.forEach((dataset) => {
      const backgroundColors = dataset.backgroundColor;
      if (!backgroundColors) {
        return;
      }
      backgroundColors.forEach((color, i, colors) => {
        colors[i] = setColorAlpha(color, i === index ? 1 : 0.5);
      });
    });
  }

  unHighlightItems(dataSets) {
    dataSets.forEach((dataset) => {
      const backgroundColors = dataset.backgroundColor;
      backgroundColors.forEach((color, i, colors) => {
        colors[i] = setColorAlpha(color, 1);
      });
    });
  }

  onHoverLegend(evt: ChartEvent, item: LegendItem, legend: LegendElement<"pie">) {
    if (item.index === undefined) {
      return;
    }
    const datasets = legend.chart.data.datasets;
    this.highlightItem(item.index, datasets);
    legend.chart.update();
  }

  onLeaveLegend(evt: ChartEvent, item: LegendItem, legend: LegendElement<"pie">) {
    const datasets = legend.chart.data.datasets;
    this.unHighlightItems(datasets);
    legend.chart.update();
  }

  onHover(evt: ChartEvent, items: ActiveElement[], chart: Chart) {
    const datasets = chart.data.datasets;
    if (items[0]) {
      if (items[0].index !== this.lastHoveredIndex) {
        this.highlightItem(items[0].index, datasets);
        this.lastHoveredIndex = items[0].index;
      }
    } else if (this.lastHoveredIndex !== undefined) {
      this.unHighlightItems(datasets);
      this.lastHoveredIndex = undefined;
    }
    chart.update();
  }
}

function getPieConfiguration(
  chart: PieChart,
  labels: string[],
  localeFormat: LocaleFormat
): ChartConfiguration {
  const fontColor = chartFontColor(chart.background);
  const config = getDefaultChartJsRuntime(chart, labels, fontColor, localeFormat);
  const legend: DeepPartial<LegendOptions<"pie">> = {
    onHover: chart.onHoverLegend.bind(chart),
    onLeave: chart.onLeaveLegend.bind(chart),
    labels: { color: fontColor },
  };
  if ((!chart.labelRange && chart.dataSets.length === 1) || chart.legendPosition === "none") {
    legend.display = false;
  } else {
    legend.position = chart.legendPosition;
  }
  Object.assign(config.options.plugins!.legend || {}, legend);
  config.options.layout = {
    padding: { left: 20, right: 20, top: chart.title ? 10 : 25, bottom: 10 },
  };
  config.options.plugins!.tooltip!.callbacks!.label = function (tooltipItem) {
    const { format, locale } = localeFormat;
    const data = tooltipItem.dataset.data;
    const dataIndex = tooltipItem.dataIndex;
    const percentage = calculatePercentage(data, dataIndex);

    const yLabel = tooltipItem.parsed.y ?? tooltipItem.parsed;
    const toolTipFormat = !format && yLabel >= 1000 ? "#,##" : format;
    const yLabelStr = formatValue(yLabel, { format: toolTipFormat, locale });

    return `${yLabelStr} (${percentage}%)`;
  };
  config.options.onHover = chart.onHover.bind(chart);
  config.options.plugins!["eventPlugin"] = {
    events: ["mouseout"],
  };
  config.plugins = [
    ...config.plugins,
    {
      id: "eventPlugin",
      afterEvent(c, args, _) {
        if (args.event.type === "mouseout") {
          chart.unHighlightItems(c.data.datasets);
          c.update();
          chart.lastHoveredIndex = undefined;
        }
      },
    },
  ];
  return config;
}

function getPieColors(colors: ColorGenerator, dataSetsValues: DatasetValues[]): Color[] {
  const pieColors: Color[] = [];
  const maxLength = largeMax(dataSetsValues.map((ds) => ds.data.length));
  for (let i = 0; i <= maxLength; i++) {
    pieColors.push(colors.next());
  }

  return pieColors;
}

function calculatePercentage(
  dataset: (number | [number, number] | Point | BubbleDataPoint | null)[],
  dataIndex: number
): string {
  const numericData: number[] = dataset.filter((value) => typeof value === "number") as number[];
  const total = numericData.reduce((sum, value) => sum + value, 0);

  if (!total) {
    return "";
  }
  const percentage = ((dataset[dataIndex] as number) / total) * 100;

  return percentage.toFixed(2);
}

function filterNegativeValues(
  labels: readonly string[],
  datasets: readonly DatasetValues[]
): { labels: string[]; dataSetsValues: DatasetValues[] } {
  const dataPointsIndexes = labels.reduce<number[]>((indexes, label, i) => {
    const shouldKeep = datasets.some((dataset) => {
      const dataPoint = dataset.data[i];
      return typeof dataPoint !== "number" || dataPoint >= 0;
    });

    if (shouldKeep) {
      indexes.push(i);
    }

    return indexes;
  }, []);

  const filteredLabels = dataPointsIndexes.map((i) => labels[i] || "");
  const filteredDatasets = datasets.map((dataset) => ({
    ...dataset,
    data: dataPointsIndexes.map((i) => {
      const dataPoint = dataset.data[i];
      return typeof dataPoint !== "number" || dataPoint >= 0 ? dataPoint : 0;
    }),
  }));

  return { labels: filteredLabels, dataSetsValues: filteredDatasets };
}

export function createPieChartRuntime(chart: PieChart, getters: Getters): PieChartRuntime {
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

  ({ dataSetsValues, labels } = filterNegativeValues(labels, dataSetsValues));

  const dataSetFormat = getChartDatasetFormat(getters, chart.dataSets);
  const locale = getters.getLocale();
  const config = getPieConfiguration(chart, labels, { format: dataSetFormat, locale });
  const backgroundColor = getPieColors(new ColorGenerator(), dataSetsValues);
  for (const { label, data } of dataSetsValues) {
    const dataset: ChartDataset = {
      label,
      data,
      borderColor: "#FFFFFF",
      backgroundColor,
      hoverBackgroundColor: backgroundColor,
    };
    config.data!.datasets!.push(dataset);
  }

  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
