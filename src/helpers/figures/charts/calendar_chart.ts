import { CoreGetters, Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import { getDataSourceFromContextCreation } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartDataSourceHandler } from "@odoo/o-spreadsheet-engine/registries/chart_data_source_registry";
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
import { CommandResult, Getters, Range, UID } from "../../../types";
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

function checkDateGranularity(definition: CalendarChartDefinition<string>): CommandResult {
  if (!CALENDAR_CHART_GRANULARITIES.includes(definition.horizontalGroupBy)) {
    return CommandResult.InvalidChartDefinition;
  }
  if (!CALENDAR_CHART_GRANULARITIES.includes(definition.verticalGroupBy)) {
    return CommandResult.InvalidChartDefinition;
  }
  return CommandResult.Success;
}

export class CalendarChart extends AbstractChart {
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

  constructor(
    private definition: CalendarChartDefinition<Range>,
    sheetId: UID,
    getters: CoreGetters
  ) {
    super(sheetId, getters);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: CalendarChartDefinition<string>
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDateGranularity);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): CalendarChartDefinition<string> {
    let legendPosition: LegendPosition = "left";
    if (context.legendPosition === "right") {
      legendPosition = "right";
    }
    return {
      background: context.background,
      dataSource: getDataSourceFromContextCreation(context),
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

  getContextCreation(
    dataSource: ChartDataSourceHandler,
    definition: CalendarChartDefinition<string>
  ): ChartCreationContext {
    return definition;
  }

  getRangeDefinition(): CalendarChartDefinition {
    return this.definition;
  }

  getDefinition() {
    return this.definition;
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  getRuntime(getters: Getters, data: ChartData): CalendarChartRuntime {
    const definition = this.definition;
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
}
