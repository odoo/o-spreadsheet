import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { setColorAlpha } from "@odoo/o-spreadsheet-engine/helpers/color";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  getDefinedAxis,
  shouldRemoveFirstLabel,
  toExcelDataset,
  toExcelLabelRange,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  AxesDesign,
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDataset,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { LegendPosition } from "@odoo/o-spreadsheet-engine/types/chart/common_chart";
import {
  ScatterChartDefinition,
  ScatterChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/scatter_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import {
  ActiveElement,
  Chart,
  ChartConfiguration,
  ChartDataset,
  ChartEvent,
  LegendElement,
  LegendItem,
} from "chart.js";
import {
  ApplyRangeChange,
  Color,
  CommandResult,
  Getters,
  Range,
  RangeAdapter,
  UID,
} from "../../../types";
import {
  getChartShowValues,
  getChartTitle,
  getLineChartData,
  getLineChartTooltip,
  getScatterChartDatasets,
  getScatterChartLegend,
  getScatterChartScales,
  INTERACTIVE_LEGEND_CONFIG,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

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
  readonly showValues?: boolean;
  readonly zoomable?: boolean;
  lastHoveredIndex: number | undefined = undefined;

  constructor(definition: ScatterChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      this.getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(this.getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.labelsAsText = definition.labelsAsText;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.showValues = definition.showValues;
    this.zoomable = definition.zoomable;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ScatterChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: ScatterChartDefinition,
    applyChange: RangeAdapter
  ): ScatterChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
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
      showValues: context.showValues,
      zoomable: context.zoomable,
      humanize: context.humanize,
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
      showValues: this.showValues,
      zoomable: this.zoomable,
      humanize: this.humanize,
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

  duplicateInDuplicatedSheet(newSheetId: UID): ScatterChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, newSheetId);
    return new ScatterChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ScatterChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new ScatterChart(definition, sheetId, this.getters);
  }

  highlightItem(index: number, dataSets: ChartDataset<"line">[]) {
    dataSets.forEach((dataset, i) => {
      const color = setColorAlpha(dataset.pointBackgroundColor as string, i === index ? 1 : 0.4);
      dataset.borderColor = color;
      dataset.pointBackgroundColor = color;
    });
  }

  unHighlightItems(dataSets: ChartDataset<"line">[]) {
    dataSets.forEach((dataset) => {
      const color = setColorAlpha(dataset.pointBackgroundColor as string, 1);
      dataset.borderColor = color;
      dataset.pointBackgroundColor = setColorAlpha(color, 1);
    });
  }

  onHoverLegend(evt: ChartEvent, item: LegendItem, legend: LegendElement<"line">) {
    const index = item.datasetIndex;
    if (index === undefined) {
      return;
    }
    const datasets = legend.chart.data.datasets;
    this.highlightItem(index, datasets);
    INTERACTIVE_LEGEND_CONFIG.onHover?.(evt);
    legend.chart.update();
  }

  onLeaveLegend(evt: ChartEvent, item: LegendItem, legend: LegendElement<"line">) {
    const datasets = legend.chart.data.datasets;
    this.unHighlightItems(datasets);
    INTERACTIVE_LEGEND_CONFIG.onLeave?.(evt);
    legend.chart.update();
  }

  onHover(evt: ChartEvent, items: ActiveElement[], chart: Chart<"line">) {
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
  const definition = chart.getDefinition();
  const chartData = getLineChartData(definition, chart.dataSets, chart.labelRange, getters);

  const config: ChartConfiguration<"line"> = {
    // use chartJS line chart and disable the lines instead of chartJS scatter chart. This is because the scatter chart
    // have less options than the line chart (it only works with linear labels)
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: getScatterChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getScatterChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: {
          ...getScatterChartLegend(definition, chartData),
          onHover: chart.onHoverLegend.bind(chart),
          onLeave: chart.onLeaveLegend.bind(chart),
        },
        tooltip: getLineChartTooltip(definition, chartData),
        chartShowValuesPlugin: getChartShowValues(definition, chartData),
      },
    },
  };

  return {
    chartJsConfig: config,
    background: chart.background || BACKGROUND_CHART_COLOR,
  };
}
