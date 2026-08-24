import { ALL_PERIODS } from "../../../../helpers/pivot/pivot_helpers";
import {
  CALENDAR_CHART_GRANULARITIES,
  CalendarChartDefinition,
  CalendarChartGranularity,
} from "../../../../types/chart/calendar_chart";
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
        value: this.props.definition.dataSetsHaveTitle,
        onChange: this.onUpdateDataSetsHaveTitle.bind(this),
      },
    ];
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
