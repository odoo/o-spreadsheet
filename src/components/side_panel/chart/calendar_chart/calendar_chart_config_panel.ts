import { _t } from "../../../../translation";
import { Granularity } from "../../../../types";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class CalendarChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-CalendarChartConfigPanel";

  groupByChoices = [
    { value: "year", label: _t("Year") },
    { value: "month", label: _t("Month") },
    { value: "day_of_week", label: _t("Weekday") },
    { value: "hour_number", label: _t("Hour") },
    { value: "day_of_month", label: _t("Day of month") },
    { value: "iso_week_number", label: _t("Week") },
    { value: "quarter_number", label: _t("Quarter") },
  ];

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
