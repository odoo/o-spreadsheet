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

export class BooleanSection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BooleanSection";
  protected props = useProps({
    section: types.StatSection(),
  });
  static components = {
    StatisticItem,
  };
  private hoveredStat = proxy<{ name: string | undefined }>({ name: undefined });

  setup() {
    useHighlights(this);
  }

  get total() {
    return this.props.section.items.reduce((acc, item) => acc + Number(item.value), 0);
  }

  computePercentage(value: number) {
    if (this.total === 0) {
      return "0%";
    }
    return `(${Math.round((value / this.total) * 100)}%)`;
  }

  hoverStat(stat: StatValue, isHovered: boolean) {
    this.hoveredStat.name = isHovered ? stat.name : undefined;
  }

  get highlights(): Highlight[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zones = this.env.model.getters.getSelectedZones();
    const matches: Range[] = [];
    for (const zone of zones) {
      const cells = this.env.model.getters.getEvaluatedCellsInZone(sheetId, zone);
      for (const cell of cells) {
        if (cell.formattedValue === this.hoveredStat.name) {
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
