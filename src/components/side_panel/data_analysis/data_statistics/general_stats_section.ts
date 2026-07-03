import { proxy, useProps } from "@odoo/owl";
import { HIGHLIGHT_IN_SELECTION_COLOR } from "../../../../constants";
import { toXC } from "../../../../helpers/coordinates";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { Highlight } from "../../../../types/misc";
import { Range } from "../../../../types/range";
import { useHighlights } from "../../../helpers/highlight_hook";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { StatisticItem } from "./statistic_item";

export class GeneralStatsSection extends OSComponent {
  static template = "o-spreadsheet-GeneralStatsSection";
  protected props = useProps({
    items: types.array(types.object<StatValue>()),
  });
  static components = {
    StatisticItem,
  };
  private state = proxy<{ hoveredStat?: StatValue }>({ hoveredStat: undefined });

  setup() {
    useHighlights(this);
  }

  hoverStat(hoveredStat: StatValue, isHovered: boolean) {
    this.state.hoveredStat = isHovered ? hoveredStat : undefined;
  }

  get highlights(): Highlight[] {
    if (this.state.hoveredStat?.id !== "min" && this.state.hoveredStat?.id !== "max") {
      return [];
    }
    const sheetId = this.model().getters.getActiveSheetId();
    const zones = this.model().getters.getSelectedZones();
    const matches: Range[] = [];
    for (const zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.model().getters.getEvaluatedCell({ sheetId, col, row });
          if (cell.formattedValue === this.state.hoveredStat?.value) {
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
