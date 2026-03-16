import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSetsInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { isDefined } from "@odoo/o-spreadsheet-engine/helpers/misc";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  BarChartDefinition,
  ChartCreationContext,
  CustomizedDataSet,
  ExcelChartDefinition,
  LegendPosition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import {
  CALENDAR_CHART_GRANULARITIES,
  CalendarChartDefinition,
  CalendarChartGranularity,
  CalendarChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/calendar_chart";
import type { ChartConfiguration } from "chart.js";
import {
  AxesDesign,
  ChartColorScale,
  Color,
  CommandResult,
  DataSet,
  Getters,
  Range,
  RangeAdapter,
  UID,
} from "../../../types";
import {
  getCalendarChartData,
  getCalendarChartDatasetAndLabels,
  getCalendarChartLayout,
  getCalendarChartScales,
  getCalendarChartShowValues,
  getCalendarChartTooltip,
  getCalendarColorScale,
  getChartTitle,
} from "./runtime";

function checkDateGranularity(definition: CalendarChartDefinition): CommandResult {
  if (!CALENDAR_CHART_GRANULARITIES.includes(definition.horizontalGroupBy)) {
    return CommandResult.InvalidChartDefinition;
  }
  if (!CALENDAR_CHART_GRANULARITIES.includes(definition.verticalGroupBy)) {
    return CommandResult.InvalidChartDefinition;
  }
  return CommandResult.Success;
}

export class CalendarChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRanges: Range[];
  readonly background?: Color;
  readonly type = "calendar";
  readonly showValues?: boolean;
  readonly colorScale?: ChartColorScale;
  readonly axesDesign?: AxesDesign;
  readonly horizontalGroupBy: CalendarChartGranularity;
  readonly verticalGroupBy: CalendarChartGranularity;
  readonly legendPosition: LegendPosition;
  readonly missingValueColor?: Color;

  constructor(definition: CalendarChartDefinition, sheetId: UID, getters: CoreGetters) {
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
    this.showValues = definition.showValues;
    this.colorScale = definition.colorScale;
    this.axesDesign = definition.axesDesign;
    this.horizontalGroupBy = definition.horizontalGroupBy;
    this.verticalGroupBy = definition.verticalGroupBy;
    this.legendPosition = definition.legendPosition;
    this.missingValueColor = definition.missingValueColor;
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: BarChartDefinition,
    applyChange: RangeAdapter
  ): BarChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: BarChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(
      definition,
      checkDataset,
      checkLabelRange,
      checkDateGranularity
    );
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): CalendarChartDefinition {
    let legendPosition: LegendPosition = "left";
    if (context.legendPosition === "right") {
      legendPosition = "right";
    }
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      title: context.title || { text: "" },
      type: "calendar",
      labelRanges: context.auxiliaryRanges,
      showValues: context.showValues,
      axesDesign: context.axesDesign,
      legendPosition,
      horizontalGroupBy: "day_of_week",
      verticalGroupBy: "month_number",
    };
  }

  getContextCreation(): ChartCreationContext {
    const range: CustomizedDataSet[] = [
      { dataRange: this.getters.getRangeString(this.dataSets[0].dataRange, this.sheetId) },
    ];
    return {
      ...this,
      range,
      auxiliaryRanges: this.labelRanges.length
        ? this.labelRanges.map((r) => this.getters.getRangeString(r, this.sheetId))
        : undefined,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): CalendarChart {
    const dataSets = duplicateDataSetsInDuplicatedSheet(this.sheetId, newSheetId, this.dataSets);
    const labelRanges = this.labelRanges
      .map((r) =>
        createValidRange(this.getters, newSheetId, this.getters.getRangeString(r, this.sheetId))
      )
      .filter(isDefined);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRanges, newSheetId);
    return new CalendarChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): CalendarChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRanges,
      sheetId
    );
    return new CalendarChart(definition, sheetId, this.getters);
  }

  getDefinition(): CalendarChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRanges);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRanges: Range[],
    targetSheetId?: UID
  ): CalendarChartDefinition {
    const ranges: CustomizedDataSet[] = dataSets.map((dataSet) => ({
      dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
    }));
    return {
      type: "calendar",
      background: this.background,
      dataSets: ranges,
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      labelRanges: labelRanges.length
        ? labelRanges.map((r) => this.getters.getRangeString(r, targetSheetId || this.sheetId))
        : undefined,
      title: this.title,
      showValues: this.showValues,
      colorScale: this.colorScale,
      axesDesign: this.axesDesign,
      horizontalGroupBy: this.horizontalGroupBy,
      verticalGroupBy: this.verticalGroupBy,
      legendPosition: this.legendPosition,
      missingValueColor: this.missingValueColor,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): CalendarChart {
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
    return new CalendarChart(definition, this.sheetId, this.getters);
  }
}

export function createCalendarChartRuntime(
  chart: CalendarChart,
  getters: Getters
): CalendarChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getCalendarChartData(definition, chart.dataSets, chart.labelRanges, getters);
  const { labels, datasets } = getCalendarChartDatasetAndLabels(definition, chartData);

  const config: ChartConfiguration<"calendar"> = {
    type: "calendar",
    data: {
      labels,
      datasets,
    },
    options: {
      ...CHART_COMMON_OPTIONS,
      indexAxis: "x",
      layout: getCalendarChartLayout(definition, chartData),
      scales: getCalendarChartScales(definition, datasets),
      plugins: {
        title: getChartTitle(definition, getters),
        legend: { display: false },
        tooltip: getCalendarChartTooltip(definition, chartData),
        chartShowValuesPlugin: getCalendarChartShowValues(definition, chartData),
        chartColorScalePlugin: getCalendarColorScale(definition, chartData),
        background: { color: chart.background },
      },
    },
  };

  return { chartJsConfig: config };
}
