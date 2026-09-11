import { proxy, useProps } from "@odoo/owl";
import { toXC } from "../../../../helpers/coordinates";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { Component } from "../../../../owl3_compatibility_layer";
import { Highlight } from "../../../../types/misc";
import { Range } from "../../../../types/range";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { useHighlights } from "../../../helpers/highlight_hook";
import { types } from "../../../props_validation";
import { StatisticItem } from "./statistic_item";

export class GeneralStatsSection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GeneralStatsSection";
  protected props = useProps({
    items: types.array(types.StatValue()),
  });
  static components = {
    StatisticItem,
  };

  private hoveredStat = proxy<StatValue>({ id: "", name: "", value: "", formula: "" });

  setup() {
    useHighlights(this);
  }

  hoverStat(stat: StatValue, isHovered: boolean) {
    this.hoveredStat.id = isHovered ? stat.id : "";
    this.hoveredStat.name = isHovered ? stat.name : "";
    this.hoveredStat.value = isHovered ? stat.value : "";
    this.hoveredStat.formula = isHovered ? stat.formula : "";
  }

  get highlights(): Highlight[] {
    if (this.hoveredStat.id !== "min" && this.hoveredStat.id !== "max") {
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
      color: "#ffeb3b9a",
      thinLine: true,
    }));
  }
}
