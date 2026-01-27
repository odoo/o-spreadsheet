import type { ChartConfiguration } from "chart.js";
import { ChartTypeBuilder } from "../../../registries/chart_registry";
import { CommandResult } from "../../../types";
import { LegendPosition } from "../../../types/chart";
import {
  CALENDAR_CHART_GRANULARITIES,
  CalendarChartDefinition,
  CalendarChartRuntime,
} from "../../../types/chart/calendar_chart";
import { Validator } from "../../../types/validator";
import { AbstractChart } from "./abstract_chart";
import { CHART_COMMON_OPTIONS } from "./chart_ui_common";
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

  getDefinitionFromContextCreation(context, dataSourceBuilder) {
    let legendPosition: LegendPosition = "left";
    if (context.legendPosition === "right") {
      legendPosition = "right";
    }
    return {
      background: context.background,
      dataSource: dataSourceBuilder.fromContextCreation(context),
      dataSetStyles: context.dataSetStyles ?? {},
      title: context.title || { text: "" },
      type: "calendar",
      showValues: context.showValues,
      axesDesign: context.axesDesign,
      legendPosition,
      horizontalGroupBy: "day_of_week",
      verticalGroupBy: "month_number",
      annotationLink: context.annotationLink,
      annotationText: context.annotationText,
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
          background: { color: definition.background },
        },
      },
    };

    return { chartJsConfig: config };
  },
};
