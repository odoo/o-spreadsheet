import { usePlugin } from "@odoo/owl";
import {
  DateGranularity,
  getStatIdFromDate,
  StatValue,
} from "../../../../helpers/data_statistics/statistics_items";
import { numberToJsDate } from "../../../../helpers/dates";
import { _t } from "../../../../translation";
import { OSComponent } from "../../../os_component";
import { Select } from "../../../select/select";
import { DataAnalysisPlugin } from "../data_analysis_store";
import { useStatHighlights } from "./stat_highlights_hook";
import { StatisticItem } from "./statistic_item";

export class DateSection extends OSComponent {
  static template = "o-spreadsheet-DateSection";
  static components = {
    StatisticItem,
    Select,
  };

  private dataAnalysisPlugin = usePlugin(DataAnalysisPlugin);

  onStatHovered!: (stat: StatValue, isHovered: boolean) => void;

  setup() {
    this.onStatHovered = useStatHighlights(
      (cell, stat) =>
        typeof cell.value === "number" &&
        stat.id ===
          getStatIdFromDate(numberToJsDate(cell.value), this.dataAnalysisPlugin.dateGranularity())
    );
  }

  get granularityOptions() {
    return [
      { value: "year", label: _t("Year") },
      { value: "quarter", label: _t("Quarter") },
      { value: "month", label: _t("Month") },
      { value: "week", label: _t("Week") },
      { value: "weekday", label: _t("Day of week") },
      { value: "day", label: _t("Day") },
      { value: "date", label: _t("Date") },
    ];
  }

  onGranularitySelected(granularity: DateGranularity) {
    this.dataAnalysisPlugin.setDateGranularity(granularity);
  }
}
