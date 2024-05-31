import {
  ActiveElement,
  Chart,
  ChartDataset,
  ChartEvent,
  LegendElement,
  LegendItem,
} from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import { toNumber } from "../../../functions/helpers";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import {
  AxesDesign,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { LegendPosition } from "../../../types/chart/common_chart";
import { ScatterChartDefinition, ScatterChartRuntime } from "../../../types/chart/scatter_chart";
import { Validator } from "../../../types/validator";
import { toXlsxHexColor } from "../../../xlsx/helpers/colors";
import { setColorAlpha } from "../../color";
import { formatValue } from "../../format";
import { isNumber } from "../../numbers";
import { createRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  getDefinedAxis,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import { createLineOrScatterChartRuntime } from "./chart_common_line_scatter";

export class ScatterChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly aggregated?: boolean;
  readonly type = "scatter";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
  lastHoveredIndex: number | undefined = undefined;

  constructor(definition: ScatterChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      this.getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createRange(this.getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.labelsAsText = definition.labelsAsText;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ScatterChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static transformDefinition(
    definition: ScatterChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ScatterChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ScatterChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      labelsAsText: context.labelsAsText ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "scatter",
      labelRange: context.auxiliaryRange || undefined,
      aggregated: context.aggregated ?? false,
      axesDesign: context.axesDesign,
    };
  }

  getDefinition(): ScatterChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): ScatterChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "scatter",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      labelsAsText: this.labelsAsText,
      aggregated: this.aggregated,
      axesDesign: this.axesDesign,
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

  updateRanges(applyChange: ApplyRangeChange): ScatterChart {
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
    return new ScatterChart(definition, this.sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    // Excel does not support aggregating labels
    if (this.aggregated) {
      return undefined;
    }
    const dataSets: ExcelChartDataset[] = this.dataSets
      .map((ds: DataSet) => toExcelDataset(this.getters, ds))
      .filter((ds) => ds.range !== "");
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

  copyForSheetId(sheetId: UID): ScatterChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new ScatterChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ScatterChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new ScatterChart(definition, sheetId, this.getters);
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

export function createScatterChartRuntime(
  chart: ScatterChart,
  getters: Getters
): ScatterChartRuntime {
  const { chartJsConfig, background, dataSetsValues, dataSetFormat, labelValues, labelFormat } =
    createLineOrScatterChartRuntime(chart, getters);
  // use chartJS line chart and disable the lines instead of chartJS scatter chart. This is because the scatter chart
  // have less options than the line chart (it only works with linear labels)
  chartJsConfig.type = "line";

  const configOptions = chartJsConfig.options!;
  const locale = getters.getLocale();

  configOptions.plugins!.tooltip!.callbacks!.title = () => "";
  configOptions.plugins!.tooltip!.callbacks!.label = (tooltipItem) => {
    const dataSetPoint = dataSetsValues[tooltipItem.datasetIndex!].data![tooltipItem.dataIndex!];
    let label: string | number = tooltipItem.label || labelValues.values[tooltipItem.dataIndex!];
    if (isNumber(label, locale)) {
      label = toNumber(label, locale);
    }
    const formattedX = formatValue(label, { locale, format: labelFormat });
    const formattedY = formatValue(dataSetPoint, { locale, format: dataSetFormat });
    const dataSetTitle = tooltipItem.dataset.label;
    return formattedX
      ? `${dataSetTitle}: (${formattedX}, ${formattedY})`
      : `${dataSetTitle}: ${formattedY}`;
  };

  for (const dataSet of chartJsConfig.data!.datasets!) {
    (dataSet as ChartDataset<"line">).showLine = false;
  }

  return { chartJsConfig, background };
}
