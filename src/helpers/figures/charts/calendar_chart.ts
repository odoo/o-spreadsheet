import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
  duplicateDataSourceInDuplicatedSheet,
  duplicateLabelRangeInDuplicatedSheet,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  ChartCreationContext,
  ChartData,
  ChartRangeDataSource,
  ExcelChartDefinition,
  LegendPosition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import {
  CALENDAR_CHART_GRANULARITIES,
  CalendarChartDefinition,
  CalendarChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/calendar_chart";
import type { ChartConfiguration } from "chart.js";
import {
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
  readonly labelRange?: Range | undefined;
  readonly type = "calendar";

  static allowedDefinitionKeys: readonly (keyof CalendarChartDefinition)[] = [
    ...AbstractChart.commonKeys,
    "dataSource",
    "dataSetStyles",
    "labelRange",
    "dataSetsHaveTitle",
    "showValues",
    "colorScale",
    "missingValueColor",
    "axesDesign",
    "horizontalGroupBy",
    "verticalGroupBy",
    "legendPosition",
  ] as const;

  constructor(private definition: CalendarChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(getters, sheetId, definition);
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
  }

  static transformDefinition(
    chartSheetId: UID,
    definition: CalendarChartDefinition,
    applyChange: RangeAdapter
  ): CalendarChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(chartSheetId, definition, applyChange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: CalendarChartDefinition
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
      dataSource: context.dataSource ?? { dataSets: [] },
      dataSetStyles: context.dataSetStyles ?? {},
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      title: context.title || { text: "" },
      type: "calendar",
      labelRange: context.auxiliaryRange || undefined,
      showValues: context.showValues,
      axesDesign: context.axesDesign,
      legendPosition,
      horizontalGroupBy: "day_of_week",
      verticalGroupBy: "month_number",
    };
  }

  getContextCreation(): ChartCreationContext {
    const definition = this.getDefinition();
    return {
      ...definition,
      dataSource: {
        dataSets: [definition.dataSource.dataSets[0]],
      },
      auxiliaryRange: definition.labelRange,
    };
  }

  duplicateInDuplicatedSheet(newSheetId: UID): CalendarChart {
    const dataSource = duplicateDataSourceInDuplicatedSheet(
      this.getters,
      this.sheetId,
      newSheetId,
      this.definition.dataSource
    );
    const labelRange = duplicateLabelRangeInDuplicatedSheet(
      this.sheetId,
      newSheetId,
      this.labelRange
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, labelRange, newSheetId);
    return new CalendarChart(definition, newSheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): CalendarChart {
    const dataSource = {
      dataSets: this.definition.dataSource.dataSets.map((dataSet) => {
        const range = this.getters.getRangeFromSheetXC(this.sheetId, dataSet.dataRange);
        return {
          ...dataSet,
          dataRange: this.getters.getRangeString(range, sheetId),
        };
      }),
    };
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, this.labelRange, sheetId);
    return new CalendarChart(definition, sheetId, this.getters);
  }

  getDefinition(): CalendarChartDefinition {
    return this.getDefinitionWithSpecificDataSets(
      {
        dataSets: this.dataSets.map(({ dataSetId, dataRange }) => ({
          dataSetId,
          dataRange: this.getters.getRangeString(dataRange, this.sheetId),
        })),
      },
      this.labelRange
    );
  }

  private getDefinitionWithSpecificDataSets(
    dataSource: ChartRangeDataSource,
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): CalendarChartDefinition {
    return {
      ...this.definition,
      dataSource,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges({ applyChange }: RangeAdapterFunctions): CalendarChart {
    const { dataSource, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      this.sheetId,
      applyChange,
      this.definition.dataSource,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSource, labelRange);
    return new CalendarChart(definition, this.sheetId, this.getters);
  }
}

export function createCalendarChartRuntime(
  getters: Getters,
  chart: CalendarChart,
  data: ChartData
): CalendarChartRuntime {
  const definition = chart.getDefinition();
  const chartData = getCalendarChartData(definition, data, getters);
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
      },
      chartBackground: definition.background || BACKGROUND_CHART_COLOR,
    },
  };

  return { chartJsConfig: config, background: definition.background || BACKGROUND_CHART_COLOR };
}
