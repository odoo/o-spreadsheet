import { useProps } from "@odoo/owl";
import {
  DateGranularity,
  getStatIdFromDate,
  StatValue,
} from "../../../../helpers/data_statistics/statistics_items";
import { numberToJsDate } from "../../../../helpers/dates";
import { _t } from "../../../../translation";
import { Store } from "../../../../types/store_engine";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { DataAnalysisStore } from "../data_analysis_store";
import { useStatHighlights } from "./stat_highlights_hook";
import { StatisticItem } from "./statistic_item";

export class DateSection extends OSComponent {
  static template = "o-spreadsheet-DateSection";
  protected props = useProps({
    store: types.Store<DataAnalysisStore>(),
  });
  static components = {
    StatisticItem,
    Select,
  };

  onStatHovered!: (stat: StatValue, isHovered: boolean) => void;

  setup() {
    this.onStatHovered = useStatHighlights(
      this.props.store.mainColumnZone,
      (cell, stat) =>
        typeof cell.value === "number" &&
        stat.id === getStatIdFromDate(numberToJsDate(cell.value), this.store.dateGranularity)
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

  get store(): Store<DataAnalysisStore> {
    return this.props.store;
  }

  onGranularitySelected(granularity: DateGranularity) {
    this.store.setDateGranularity(granularity);
  }
}
