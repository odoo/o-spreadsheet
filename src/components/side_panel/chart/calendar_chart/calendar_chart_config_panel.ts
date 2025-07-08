import { ALL_PERIODS } from "../../../../helpers/pivot/pivot_helpers";
import { Granularity } from "../../../../types";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class CalendarChartConfigPanel extends GenericChartConfigPanel {
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
    return this.props.definition[`${currentAxis}GroupBy`] || "year";
  }

  updateGroupBy(currentAxis: "horizontal" | "vertical", value: Granularity) {
    this.props.updateChart(this.props.chartId, {
      [`${currentAxis}GroupBy`]: value,
    });
  }
}
