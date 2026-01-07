import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  createDataSets,
} from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { createValidRange } from "@odoo/o-spreadsheet-engine/helpers/range";
import {
  ChartCreationContext,
  ChartData,
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

  getDefinition(): CalendarChartDefinition {
    return this.definition;
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
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
