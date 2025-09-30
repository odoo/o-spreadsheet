import { toJsDate } from "../../../../functions/helpers";
import { createValidRange } from "../../../../helpers";
import { createDataSets } from "../../../../helpers/figures/charts";
import { getBarChartData } from "../../../../helpers/figures/charts/runtime";
import { ALL_PERIODS } from "../../../../helpers/pivot/pivot_helpers";
import { Granularity } from "../../../../types";
import { CalendarChartDefinition } from "../../../../types/chart/calendar_chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";
import { ChartSidePanelProps } from "../common";

export class CalendarChartConfigPanel extends GenericChartConfigPanel<
  ChartSidePanelProps<CalendarChartDefinition>
> {
  static template = "o-spreadsheet-CalendarChartConfigPanel";

  groupByChoices = [
    "year",
    "quarter_number",
    "month_number",
    "iso_week_number",
    "day_of_month",
    "day_of_week",
    "hour_number",
    "minute_number",
    "second_number",
  ].map((value) => ({
    value,
    label: ALL_PERIODS[value],
  }));

  getLabelRangeOptions() {
    return [
      {
        name: "dataSetsHaveTitle",
        label: this.dataSetsHaveTitleLabel,
        value: this.props.definition.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
  }

  getGroupByOptions() {
    const sheetId = this.env.model.getters.getFigureSheetId(
      this.env.model.getters.getFigureIdFromChartId(this.props.chartId)
    )!;
    const dataSets = createDataSets(
      this.env.model.getters,
      this.props.definition.dataSets,
      sheetId,
      this.props.definition.dataSetsHaveTitle
    );
    if (dataSets.length === 0) {
      return [];
    }
    const labelRange = createValidRange(
      this.env.model.getters,
      sheetId,
      this.props.definition.labelRange
    );
    const data = getBarChartData(
      this.props.definition,
      dataSets,
      labelRange,
      this.env.model.getters
    );
    const dates = data.labels.map((label) => toJsDate(label, this.env.model.getters.getLocale()));
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

  getGroupByType(currentAxis: "horizontal" | "vertical"): Granularity {
    const groupBy =
      currentAxis === "horizontal"
        ? this.props.definition.horizontalGroupBy
        : this.props.definition.verticalGroupBy;
    return groupBy || "year";
  }

  updateGroupBy(currentAxis: "horizontal" | "vertical", value: Granularity) {
    this.props.updateChart(this.props.chartId, {
      [currentAxis === "horizontal" ? "horizontalGroupBy" : "verticalGroupBy"]: value,
    });
  }
}
