import { proxy, useProps } from "@odoo/owl";
import { HIGHLIGHT_IN_SELECTION_COLOR } from "../../../../constants";
import { toXC } from "../../../../helpers/coordinates";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { generateItemIdFromValue } from "../../../../helpers/data_statistics/statistics_suggestion";
import { Highlight } from "../../../../types/misc";
import { Range } from "../../../../types/range";
import { Store } from "../../../../types/store_engine";
import { useHighlights } from "../../../helpers/highlight_hook";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { DataAnalysisStore } from "../data_analysis_store";
import { StatisticItem } from "./statistic_item";

export class GroupedSums extends OSComponent {
  static template = "o-spreadsheet-Occurrences";
  protected props = useProps({
    store: types.Store<DataAnalysisStore>(),
  });
  static components = {
    StatisticItem,
  };
  private hoveredStat = proxy<StatValue>({ id: "", name: "", value: "", formula: "" });

  setup() {
    useHighlights(this);
  }

  get store(): Store<DataAnalysisStore> {
    return this.props.store;
  }

  hoverStat(stat: StatValue, isHovered: boolean) {
    this.hoveredStat.name = isHovered ? stat.name : "";
    this.hoveredStat.value = isHovered ? stat.value : "";
    this.hoveredStat.id = isHovered ? stat.id : "";
    this.hoveredStat.formula = isHovered ? stat.formula : "";
  }

  get highlights(): Highlight[] {
    if (this.hoveredStat.name === "") {
      return [];
    }
    const sheetId = this.model().getters.getActiveSheetId();
    const matches: Range[] = [];
    const normalizedHoveredId = generateItemIdFromValue(this.hoveredStat.id);
    for (const zone of this.model().getters.getSelectedZones()) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.model().getters.getEvaluatedCell({ sheetId, col, row });
          const normalizedValue = generateItemIdFromValue(cell.value);
          if (normalizedValue === normalizedHoveredId) {
            const cellXC = toXC(cell.position!.col, cell.position!.row);
            matches.push(this.model().getters.getRangeFromSheetXC(sheetId, cellXC));
          }
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
