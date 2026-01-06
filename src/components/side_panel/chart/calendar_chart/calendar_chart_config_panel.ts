import { toJsDate } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { ALL_PERIODS } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_helpers";
import {
  CALENDAR_CHART_GRANULARITIES,
  CalendarChartDefinition,
  CalendarChartGranularity,
} from "@odoo/o-spreadsheet-engine/types/chart/calendar_chart";
import { isDateTime } from "../../../../helpers";
import { getBarChartData, getChartData } from "../../../../helpers/figures/charts/runtime";
import { DEFAULT_LOCALE } from "../../../../types";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";
import { ChartSidePanelProps } from "../common";

export class CalendarChartConfigPanel extends GenericChartConfigPanel<
  ChartSidePanelProps<CalendarChartDefinition>
> {
  static template = "o-spreadsheet-CalendarChartConfigPanel";

  groupByChoices = CALENDAR_CHART_GRANULARITIES.map((value) => ({
    value,
    label: ALL_PERIODS[value],
  }));

  getLabelRangeOptions() {
    return [
      {
        name: "dataSetsHaveTitle",
        label: this.dataSetsHaveTitleLabel,
        value: this.props.definition.dataSource.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
  }

  getGroupByOptions() {
    const sheetId = this.env.model.getters.getFigureSheetId(
      this.env.model.getters.getFigureIdFromChartId(this.props.chartId)
    )!;
    const data = getBarChartData(
      this.props.definition,
      getChartData(this.env.model.getters, sheetId, this.props.definition.dataSource),
      this.env.model.getters
    );
    const labels = data.labels.filter((l) => isDateTime(l, DEFAULT_LOCALE));
    if (labels.length === 0) {
      return [];
    }
    const dates = labels.map((label) => toJsDate(label, this.env.model.getters.getLocale()));
    const uniqueYears = new Set<number>();
    const uniqueMonths = new Set<number>();
    const uniqueDays = new Set<number>();
    const uniqueHours = new Set<number>();
    const uniqueMinutes = new Set<number>();
    const uniqueSeconds = new Set<number>();
    for (const date of dates) {
      uniqueYears.add(date.getFullYear());
      uniqueMonths.add(date.getMonth());
      uniqueDays.add(date.getDate());
      uniqueHours.add(date.getHours());
      uniqueMinutes.add(date.getMinutes());
      uniqueSeconds.add(date.getSeconds());
    }
    const groupByPossibilities = this.groupByChoices.filter((groupBy) => {
      switch (groupBy.value) {
        case "year":
          return uniqueYears.size > 1;
        case "quarter_number":
        case "month_number":
          return uniqueMonths.size > 1;
        case "iso_week_number":
        case "day_of_month":
        case "day_of_week":
          return uniqueDays.size > 1;
        case "hour_number":
          return uniqueHours.size > 1;
        case "minute_number":
          return uniqueMinutes.size > 1;
        case "second_number":
          return uniqueSeconds.size > 1;
        default:
          return false;
      }
    });
    return groupByPossibilities;
  }

  getGroupByType(currentAxis: "horizontal" | "vertical"): CalendarChartGranularity {
    const groupBy =
      currentAxis === "horizontal"
        ? this.props.definition.horizontalGroupBy
        : this.props.definition.verticalGroupBy;
    return groupBy || "year";
  }

  updateGroupBy(currentAxis: "horizontal" | "vertical", value: CalendarChartGranularity) {
    this.props.updateChart(this.props.chartId, {
      [currentAxis === "horizontal" ? "horizontalGroupBy" : "verticalGroupBy"]: value,
    });
  }
}
