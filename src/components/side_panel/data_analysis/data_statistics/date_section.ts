import { proxy, useProps } from "@odoo/owl";
import { HIGHLIGHT_IN_SELECTION_COLOR } from "../../../../constants";
import { toXC } from "../../../../helpers/coordinates";
import {
  DateGranularity,
  getStatIdFromDate,
  StatValue,
} from "../../../../helpers/data_statistics/statistics_items";
import { numberToJsDate } from "../../../../helpers/dates";
import { _t } from "../../../../translation";
import { Highlight } from "../../../../types/misc";
import { Range } from "../../../../types/range";
import { Store } from "../../../../types/store_engine";
import { useHighlights } from "../../../helpers/highlight_hook";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { DataAnalysisStore } from "../data_analysis_store";
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
  private state = proxy<{ hoveredStat?: StatValue }>({ hoveredStat: undefined });

  setup() {
    useHighlights(this);
  }

  get granularityOptions() {
    return [
      { value: "year", label: _t("Year") },
      { value: "month", label: _t("Month") },
      { value: "day", label: _t("Day of week") },
    ];
  }

  get store(): Store<DataAnalysisStore> {
    return this.props.store;
  }

  onGranularitySelected(granularity: DateGranularity) {
    this.store.setDateGranularity(granularity);
  }

  hoverStat(stat: StatValue, isHovered: boolean) {
    this.state.hoveredStat = isHovered ? stat : undefined;
  }

  get highlights(): Highlight[] {
    const sheetId = this.model().getters.getActiveSheetId();
    const matches: Range[] = [];
    for (const zone of this.model().getters.getSelectedZones()) {
      const cells = this.model().getters.getEvaluatedCellsInZone(sheetId, zone);
      for (const cell of cells) {
        let doesMatch = false;
        if (typeof cell.value === "number") {
          const date = numberToJsDate(cell.value);
          if (this.state.hoveredStat?.id === getStatIdFromDate(date, this.store.dateGranularity)) {
            doesMatch = true;
          }
        }
        if (doesMatch) {
          const cellXC = toXC(cell.position!.col, cell.position!.row);
          matches.push(this.model().getters.getRangeFromSheetXC(sheetId, cellXC));
        }
      }
    }
    return matches.map((range) => ({
      range,
      color: HIGHLIGHT_IN_SELECTION_COLOR,
      thinLine: true,
    }));
  }
}
