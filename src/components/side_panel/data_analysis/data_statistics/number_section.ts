import { proxy, useProps } from "@odoo/owl";
import { HIGHLIGHT_COLOR } from "../../../../constants";
import { toXC } from "../../../../helpers/coordinates";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { Component } from "../../../../owl3_compatibility_layer";
import { Highlight } from "../../../../types/misc";
import { Range } from "../../../../types/range";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { useHighlights } from "../../../helpers/highlight_hook";
import { types } from "../../../props_validation";
import { StatisticItem } from "./statistic_item";

export class NumberSection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NumberSection";
  protected props = useProps({
    section: types.StatSection(),
  });
  static components = {
    StatisticItem,
  };
  private hoveredStat = proxy<StatValue>({ name: "", value: "", formula: "" });

  setup() {
    useHighlights(this);
  }

  hoverStat(stat: StatValue, isHovered: boolean) {
    this.hoveredStat.name = isHovered ? stat.name : "";
    this.hoveredStat.value = isHovered ? stat.value : "";
    this.hoveredStat.formula = isHovered ? stat.formula : "";
  }

  get highlights(): Highlight[] {
    if (this.hoveredStat.name !== "Max" && this.hoveredStat.name !== "Min") {
      return [];
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zones = this.env.model.getters.getSelectedZones();
    const matches: Range[] = [];
    for (const zone of zones) {
      const cells = this.env.model.getters.getEvaluatedCellsInZone(sheetId, zone);
      for (const cell of cells) {
        if (cell.formattedValue === this.hoveredStat.value) {
          const cellXC = toXC(cell.position!.col, cell.position!.row);
          matches.push(this.env.model.getters.getRangeFromSheetXC(sheetId, cellXC));
        }
      }
    }
    return matches.map((range) => ({
      range,
      color: HIGHLIGHT_COLOR,
      noBorder: true,
      thinLine: true,
    }));
  }
}
