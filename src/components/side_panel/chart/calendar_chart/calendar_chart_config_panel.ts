import { _t } from "../../../../translation";
import { CalendarChartGroupBy } from "../../../../types/chart/calendar_chart";
import { GenericChartConfigPanel } from "../building_blocks/generic_side_panel/config_panel";

export class CalendarChartConfigPanel extends GenericChartConfigPanel {
  static template = "o-spreadsheet-CalendarChartConfigPanel";

  groupByChoices = [
    { value: "year", label: _t("Year") },
    { value: "month", label: _t("Month") },
    { value: "weekday", label: _t("Weekday") },
    { value: "hour", label: _t("Hour") },
    { value: "monthday", label: _t("Month day") },
    { value: "week", label: _t("Week") },
    { value: "quarter", label: _t("Quarter") },
    { value: "date", label: _t("Date") },
    { value: "quarter-year", label: _t("Quarter-Year") },
    { value: "month-year", label: _t("Month-Year") },
    { value: "week-year", label: _t("Week-Year") },
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

  getGroupByType(currentAxis: "horizontal" | "vertical"): CalendarChartGroupBy {
    return this.props.definition[`${currentAxis}GroupBy`] || "year";
  }

  updateGroupBy(currentAxis: "horizontal" | "vertical", value: CalendarChartGroupBy) {
    this.props.updateChart(this.props.chartId, {
      [`${currentAxis}GroupBy`]: value,
    });
  }

  get maxNumberOfUsedRanges(): number {
    return 1;
  }
}
