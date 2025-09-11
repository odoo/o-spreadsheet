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
    "month_number",
    "day_of_week",
    "hour_number",
    "day_of_month",
    "iso_week_number",
    "quarter_number",
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
