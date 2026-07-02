import { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { ChartCreationContext } from "../../../types/chart/chart";
import { HeatmapChartDefinition, HeatmapChartRuntime } from "../../../types/chart/heatmap_chart";
import { CommandResult } from "../../../types/commands";
import { Range } from "../../../types/range";
import { Validator } from "../../../types/validator";
import { createValidRange } from "../../range";
import { rangeReference } from "../../references";
import { AbstractChart } from "./abstract_chart";
import { adaptChartRange, duplicateLabelRangeInDuplicatedSheet } from "./chart_common";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
import { getHeatmapChartData } from "./runtime/chart_data_extractor";
import { getColorScaleGridDatasetAndLabels } from "./runtime/chartjs_dataset";
import { getColorScaleGridLayout } from "./runtime/chartjs_layout";
import { getColorScaleGridScales, getColorScaleLegend } from "./runtime/chartjs_scales";
import { getColorScaleGridShowValues } from "./runtime/chartjs_show_values";
import { getChartTitle } from "./runtime/chartjs_title";
import { getColorScaleGridTooltip } from "./runtime/chartjs_tooltip";

function checkRanges(definition: HeatmapChartDefinition<string>): CommandResult {
  if (definition.rowRange && !rangeReference.test(definition.rowRange)) {
    return CommandResult.InvalidHeatmapRowRange;
  }
  if (definition.columnRange && !rangeReference.test(definition.columnRange)) {
    return CommandResult.InvalidHeatmapColumnRange;
  }
  if (definition.dataRange && !rangeReference.test(definition.dataRange)) {
    return CommandResult.InvalidHeatmapDataRange;
  }
  return CommandResult.Success;
}

export const HeatmapChart: ChartTypeBuilder<"heatmap"> = {
  sequence: 120,
  allowedDefinitionKeys: [
    ...AbstractChart.commonKeys,
    "rowRange",
    "columnRange",
    "dataRange",
    "dataSetsHaveTitle",
    "legendPosition",
    "colorScale",
    "missingValueColor",
    "axesDesign",
    "showValues",
  ],

  fromStrDefinition(definition, sheetId, getters): HeatmapChartDefinition<Range> {
    return {
      ...definition,
      rowRange: createValidRange(getters, sheetId, definition.rowRange),
      columnRange: createValidRange(getters, sheetId, definition.columnRange),
      dataRange: createValidRange(getters, sheetId, definition.dataRange),
    };
  },

  toStrDefinition(definition, sheetId, getters): HeatmapChartDefinition<string> {
    return {
      ...definition,
      rowRange: definition.rowRange
        ? getters.getRangeString(definition.rowRange, sheetId)
        : undefined,
      columnRange: definition.columnRange
        ? getters.getRangeString(definition.columnRange, sheetId)
        : undefined,
      dataRange: definition.dataRange
        ? getters.getRangeString(definition.dataRange, sheetId)
        : undefined,
    };
  },

  validateDefinition(validator: Validator, definition: HeatmapChartDefinition<string>) {
    return validator.checkValidations(definition, checkRanges);
  },

  transformDefinition(
    definition,
    chartSheetId,
    { adaptRangeString }
  ): HeatmapChartDefinition<string> {
    const adaptRange = (range: string | undefined): string | undefined => {
      if (!range) {
        return undefined;
      }
      const { changeType, range: adaptedRange } = adaptRangeString(chartSheetId, range);
      return changeType !== "REMOVE" ? adaptedRange : undefined;
    };
    return {
      ...definition,
      rowRange: adaptRange(definition.rowRange),
      columnRange: adaptRange(definition.columnRange),
      dataRange: adaptRange(definition.dataRange),
    };
  },

  updateRanges(definition, adapterFunctions): HeatmapChartDefinition<Range> {
    return {
      ...definition,
      rowRange: adaptChartRange(definition.rowRange, adapterFunctions),
      columnRange: adaptChartRange(definition.columnRange, adapterFunctions),
      dataRange: adaptChartRange(definition.dataRange, adapterFunctions),
    };
  },

  duplicateInDuplicatedSheet(definition, sheetIdFrom, sheetIdTo): HeatmapChartDefinition<Range> {
    const adaptRange = (range: Range | undefined) =>
      duplicateLabelRangeInDuplicatedSheet(sheetIdFrom, sheetIdTo, range);
    return {
      ...definition,
      rowRange: adaptRange(definition.rowRange),
      columnRange: adaptRange(definition.columnRange),
      dataRange: adaptRange(definition.dataRange),
    };
  },

  copyInSheetId: (definition) => definition,

  getContextCreation(definition): ChartCreationContext {
    return {
      ...definition,
      dataSource: {
        type: "range",
        dataSets: definition.dataRange ? [{ dataRange: definition.dataRange, dataSetId: "0" }] : [],
        labelRange: definition.columnRange,
        dataSetsHaveTitle: definition.dataSetsHaveTitle,
      },
    };
  },

  getDefinitionFromContextCreation(context): HeatmapChartDefinition<string> {
    const isDataSourceRange = context.dataSource?.type === "range";
    return {
      background: context.background,
      title: context.title || { text: "" },
      type: "heatmap",
      dataRange: isDataSourceRange ? context.dataSource.dataSets?.[0]?.dataRange : undefined,
      columnRange:
        (isDataSourceRange ? context.dataSource.labelRange : undefined) ?? context.auxiliaryRange,
      rowRange: undefined,
      dataSetsHaveTitle: isDataSourceRange ? context.dataSource.dataSetsHaveTitle ?? false : false,
      legendPosition: context.legendPosition === "right" ? "right" : "left",
      axesDesign: context.axesDesign,
      showValues: context.showValues,
      humanize: context.humanize,
      annotationText: context.annotationText,
      annotationLink: context.annotationLink,
    };
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(getters, definition): HeatmapChartRuntime {
    const chartData = getHeatmapChartData(definition, getters);
    const { labels, datasets } = getColorScaleGridDatasetAndLabels(definition, chartData);

    const config: ChartConfiguration<"calendar"> = {
      // Reuses the "calendar" chart.js controller: a thin bar-based grid renderer with no
      // calendar-specific logic, so the same rendering pipeline works for the heatmap chart.
      // This is purely an internal chart.js detail; the persisted definition.type is "heatmap".
      type: "calendar",
      data: {
        labels,
        datasets,
      },
      options: {
        ...CHART_COMMON_OPTIONS,
        indexAxis: "x",
        layout: getColorScaleGridLayout(definition, chartData),
        scales: getColorScaleGridScales(definition, datasets),
        plugins: {
          title: getChartTitle(definition, getters),
          legend: { display: false },
          tooltip: getColorScaleGridTooltip(definition, chartData),
          chartShowValuesPlugin: getColorScaleGridShowValues(definition, chartData, "heatmap"),
          chartColorScalePlugin: getColorScaleLegend(definition, chartData),
          background: { color: chartData.background },
        },
      },
    };

    return { chartJsConfig: config };
  },
};
