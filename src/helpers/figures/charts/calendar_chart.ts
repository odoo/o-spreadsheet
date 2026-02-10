import { Validator } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { AbstractChart } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/abstract_chart";
import { getDataSourceFromContextCreation } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { CHART_COMMON_OPTIONS } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common";
import { ChartTypeBuilder } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { LegendPosition } from "@odoo/o-spreadsheet-engine/types/chart";
import {
  CALENDAR_CHART_GRANULARITIES,
  CalendarChartDefinition,
  CalendarChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart/calendar_chart";
import type { ChartConfiguration } from "chart.js";
import { CommandResult } from "../../../types";
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

export const CalendarChart: ChartTypeBuilder<"calendar"> = {
  sequence: 110,
  dataSeriesLimit: 1,
  allowedDefinitionKeys: [
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
  ],

  validateDefinition(
    validator: Validator,
    definition: CalendarChartDefinition<string>
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDateGranularity);
  },

  fromStrDefinition: (definition) => definition,

  toStrDefinition: (definition) => definition,

  copyInSheetId: (definition) => definition,

  duplicateInDuplicatedSheet: (definition) => definition,

  transformDefinition: (definition) => definition,

  updateRanges: (definition) => definition,

  getContextCreation: (definition) => definition,

  getDefinitionFromContextCreation(context) {
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
  },

  getDefinitionForExcel: () => undefined,

  getRuntime(getters, definition, { extractData }): CalendarChartRuntime {
    const data = extractData();
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
  },
};
