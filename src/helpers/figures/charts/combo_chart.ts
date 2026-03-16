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
  CustomizedDataSet,
  LegendPosition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import {
  ComboChartDataSet,
  ComboChartDefinition,
  ComboChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/combo_chart";
import { toXlsxHexColor } from "@odoo/o-spreadsheet-engine/xlsx/helpers/colors";
import { ChartConfiguration } from "chart.js";
import {
  ChartCreationContext,
  Color,
  CommandResult,
  DataSet,
  ExcelChartDefinition,
  Getters,
  Range,
  RangeAdapter,
  UID,
} from "../../../types";
import {
  getBarChartData,
  getBarChartScales,
  getBarChartTooltip,
  getChartGroupedLabels,
  getChartShowValues,
  getChartTitle,
  getComboChartDatasets,
  getComboChartLegend,
} from "./runtime";
import { getChartLayout } from "./runtime/chartjs_layout";

export class ComboChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRanges: Range[];
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: ComboChartDataSet[];
  readonly axesDesign?: AxesDesign;
  readonly type = "combo";
  readonly showValues?: boolean;
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;

  constructor(definition: ComboChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRanges = (definition.labelRanges || [])
      .map((r) => createValidRange(getters, sheetId, r))
      .filter(isDefined);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
    this.axesDesign = definition.axesDesign;
    this.showValues = definition.showValues;
    this.hideDataMarkers = definition.hideDataMarkers;
    this.zoomable = definition.zoomable;
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: ComboChartDefinition,
    applyChange: RangeAdapter
  ): ComboChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
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
      auxiliaryRanges: this.labelRanges.length
        ? this.getters.getRangeString(this.labelRanges[0], this.sheetId)
          ? this.labelRanges.map((r) => this.getters.getRangeString(r, this.sheetId))
          : undefined
        : undefined,
    };
  }

  getDefinition(): ComboChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRanges);
  }

  getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRanges: Range[],
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
      labelRanges: labelRanges.length
        ? labelRanges.map((r) => this.getters.getRangeString(r, targetSheetId || this.sheetId))
        : undefined,
      title: this.title,
      aggregated: this.aggregated,
      axesDesign: this.axesDesign,
      showValues: this.showValues,
      hideDataMarkers: this.hideDataMarkers,
      zoomable: this.zoomable,
      humanize: this.humanize,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    const { dataSets, labelRange } = this.getCommonDataSetAttributesForExcel(
      this.labelRanges[0],
      this.dataSets,
      shouldRemoveFirstLabel(this.labelRanges[0], this.dataSets[0], this.dataSetsHaveTitle)
    );
    const { labelRanges: _, ...definition } = this.getDefinition();
    return {
      ...definition,
      backgroundColor: toXlsxHexColor(this.background || BACKGROUND_CHART_COLOR),
      fontColor: toXlsxHexColor(chartFontColor(this.background)),
      dataSets,
      labelRange,
      verticalAxis: getDefinedAxis(definition),
    };
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): ComboChart {
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
      labelRanges: context.auxiliaryRanges,
      type: "combo",
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      hideDataMarkers: context.hideDataMarkers,
      zoomable: context.zoomable,
      humanize: context.humanize,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): ComboChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRanges = this.labelRanges.map((r) =>
      duplicateRangeInDuplicatedSheet(this.sheetId, newSheetId, r)
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRanges, newSheetId);
    return new ComboChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ComboChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRanges,
      sheetId
    );
    return new ComboChart(definition, sheetId, this.getters);
  }
}

export function createComboChartRuntime(chart: ComboChart, getters: Getters): ComboChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getBarChartData(definition, chart.dataSets, chart.labelRanges, getters);

  const config: ChartConfiguration = {
    type: "bar",
    data: {
      labels: chartData.labels,
      datasets: getComboChartDatasets(definition, chartData),
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      layout: getChartLayout(definition, chartData),
      scales: getBarChartScales(definition, chartData),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: getComboChartLegend(definition, chartData),
        tooltip: getBarChartTooltip(definition, chartData),
        chartShowValuesPlugin: getChartShowValues(definition, chartData),
        background: { color: chart.background },
        chartGroupedLabelsPlugin: getChartGroupedLabels(chartData, chart.background),
      },
    },
  };

  return { chartJsConfig: config };
}
