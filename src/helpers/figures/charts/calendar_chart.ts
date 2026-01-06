import { CoreGetters, RangeAdapterFunctions, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  copyChartDataSourceInSheetId,
  createDataSets,
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
import { CommandResult, DataSet, Getters, Range, UID } from "../../../types";
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
    this.dataSets = createDataSets(getters, sheetId, definition.dataSource);
    this.labelRange = createValidRange(getters, sheetId, definition.dataSource.labelRange);
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
      dataSource: {
        type: "range",
        dataSets: [],
        dataSetsHaveTitle: false,
        labelRange: context.auxiliaryRange,
        ...context.dataSource,
      },
      dataSetStyles: context.dataSetStyles ?? {},
      title: context.title || { text: "" },
      type: "calendar",
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
        ...definition.dataSource,
        dataSets: [definition.dataSource.dataSets[0]],
      },
      auxiliaryRange: definition.dataSource.labelRange,
    };
  }

  copyInSheetId(sheetId: UID): CalendarChart {
    const dataSource = copyChartDataSourceInSheetId(
      this.getters,
      this.sheetId,
      sheetId,
      this.definition.dataSource
    );
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
    return new CalendarChart(definition, sheetId, this.getters);
  }

  getDefinition(): CalendarChartDefinition {
    return this.getDefinitionWithSpecificDataSets({
      ...this.definition.dataSource,
      dataSets: this.dataSets.map(({ dataSetId, dataRange }) => ({
        dataSetId,
        dataRange: this.getters.getRangeString(dataRange, this.sheetId),
      })),
      labelRange: this.labelRange && this.getters.getRangeString(this.labelRange, this.sheetId),
    });
  }

  private getDefinitionWithSpecificDataSets(
    dataSource: ChartRangeDataSource
  ): CalendarChartDefinition {
    return {
      ...this.definition,
      dataSource,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(adapterFunctions: RangeAdapterFunctions): CalendarChart {
    const { dataSource, isStale } = updateChartRangesWithDataSets(
      this.sheetId,
      adapterFunctions,
      this.definition.dataSource
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSource);
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
