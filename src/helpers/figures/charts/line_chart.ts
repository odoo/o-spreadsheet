import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  chartFontColor,
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  getDefinedAxis,
  shouldRemoveFirstLabel,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { isDefined } from "@odoo/o-spreadsheet-engine/helpers/misc";
import {
  createValidRange,
  duplicateRangeInDuplicatedSheet,
} from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  AxesDesign,
  ChartCreationContext,
  ChartJSRuntime,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart/chart";
import { LegendPosition } from "@odoo/o-spreadsheet-engine/types/chart/common_chart";
import { LineChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/line_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import { Color, CommandResult, Getters, Range, RangeAdapter, UID } from "../../../types";
import {
  getChartGroupedLabels,
  getChartShowValues,
  getChartTitle,
  getLineChartData,
  getLineChartDatasets,
  getLineChartLegend,
  getLineChartScales,
  getLineChartTooltip,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class LineChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRanges: Range[];
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly type = "line";
  readonly dataSetsHaveTitle: boolean;
  readonly cumulative: boolean;
  readonly dataSetDesign?: DatasetDesign[];
  readonly axesDesign?: AxesDesign;
  readonly fillArea?: boolean;
  readonly showValues?: boolean;
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;
  readonly groupBySecondaryLabels?: boolean;

  constructor(definition: LineChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      this.getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRanges = (definition.labelRanges || [])
      .map((r) => createValidRange(this.getters, sheetId, r))
      .filter(isDefined);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.labelsAsText = definition.labelsAsText;
    this.stacked = definition.stacked;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.cumulative = definition.cumulative;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.fillArea = definition.fillArea;
    this.showValues = definition.showValues;
    this.hideDataMarkers = definition.hideDataMarkers;
    this.zoomable = definition.zoomable;
    this.groupBySecondaryLabels = definition.groupBySecondaryLabels;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: LineChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: LineChartDefinition,
    applyChange: RangeAdapter
  ): LineChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): LineChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      labelsAsText: context.labelsAsText ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "line",
      labelRanges: context.auxiliaryRanges,
      stacked: context.stacked ?? false,
      aggregated: context.aggregated ?? false,
      cumulative: context.cumulative ?? false,
      axesDesign: context.axesDesign,
      fillArea: context.fillArea,
      showValues: context.showValues,
      hideDataMarkers: context.hideDataMarkers,
      zoomable: context.zoomable,
      humanize: context.humanize,
      groupBySecondaryLabels: context.groupBySecondaryLabels,
    };
  }

  getDefinition(): LineChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRanges);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRanges: Range[],
    targetSheetId?: UID
  ): LineChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "line",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRanges: labelRanges.length
        ? labelRanges.map((r) => this.getters.getRangeString(r, targetSheetId || this.sheetId))
        : undefined,
      title: this.title,
      labelsAsText: this.labelsAsText,
      stacked: this.stacked,
      aggregated: this.aggregated,
      cumulative: this.cumulative,
      axesDesign: this.axesDesign,
      fillArea: this.fillArea,
      showValues: this.showValues,
      hideDataMarkers: this.hideDataMarkers,
      zoomable: this.zoomable,
      humanize: this.humanize,
      groupBySecondaryLabels: this.groupBySecondaryLabels,
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
      auxiliaryRanges: this.labelRanges.length
        ? this.labelRanges.map((r) => this.getters.getRangeString(r, this.sheetId))
        : undefined,
    };
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): LineChart {
    const { dataSets, labelRanges, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRanges
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRanges || []);
    return new LineChart(definition, this.sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    const { dataSets, labelRanges } = this.getCommonDataSetAttributesForExcel(
      this.labelRanges,
      this.dataSets,
      shouldRemoveFirstLabel(this.labelRanges[0], this.dataSets[0], this.dataSetsHaveTitle)
    );
    const { labelRanges: _, ...definition } = this.getDefinition();
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRanges,
      verticalAxis: getDefinedAxis(definition),
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): LineChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRanges = this.labelRanges.map((r) =>
      duplicateRangeInDuplicatedSheet(this.sheetId, newSheetId, r)
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRanges, newSheetId);
    return new LineChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): LineChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRanges,
      sheetId
    );
    return new LineChart(definition, sheetId, this.getters);
  }
}

export function createLineChartRuntime(chart: LineChart, getters: Getters): ChartJSRuntime {
  const definition = chart.getDefinition();
  const chartData = getLineChartData(definition, chart.dataSets, chart.labelRanges, getters);

  const config: ChartConfiguration = {
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: getLineChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getLineChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getLineChartLegend(definition, chartData),
        tooltip: getLineChartTooltip(definition, chartData),
        chartShowValuesPlugin: getChartShowValues(definition, chartData),
        background: { color: chart.background },
        chartGroupedLabelsPlugin: getChartGroupedLabels(chartData, chart.background),
      },
    },
  };

  return { chartJsConfig: config };
}
