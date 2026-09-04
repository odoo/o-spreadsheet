import { proxy, useProps } from "@odoo/owl";
import { HIGHLIGHT_COLOR } from "../../../../constants";
import { toXC } from "../../../../helpers/coordinates";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { numberToJsDate } from "../../../../helpers/dates";
import { Component } from "../../../../owl3_compatibility_layer";
import { Highlight } from "../../../../types/misc";
import { Range } from "../../../../types/range";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { useHighlights } from "../../../helpers/highlight_hook";
import { types } from "../../../props_validation";
import { StatisticItem } from "./statistic_item";

export class DateSection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DateSection";
  protected props = useProps({
    statSections: types.array(types.StatSection()),
  });
  static components = {
    StatisticItem,
  };
  private hoveredStat = proxy<StatValue>({ id: "", name: "", value: "", formula: "" });

  setup() {
    useHighlights(this);
  }

  get total() {
    return this.props.statSections[1].items.reduce((acc, item) => acc + Number(item.value), 0);
  }

  computePercentage(value: number) {
    if (this.total === 0) {
      return "0%";
    }
    return `(${Math.round((value / this.total) * 100)}%)`;
  }

  hoverStat(stat: StatValue, isHovered: boolean) {
    this.hoveredStat.id = isHovered ? stat.id : "";
    this.hoveredStat.name = isHovered ? stat.name : "";
    this.hoveredStat.value = isHovered ? stat.value : "";
    this.hoveredStat.formula = isHovered ? stat.formula : "";
  }

  get highlights(): Highlight[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zones = this.env.model.getters.getSelectedZones();
    const matches: Range[] = [];
    for (const zone of zones) {
      const cells = this.env.model.getters.getEvaluatedCellsInZone(sheetId, zone);
      for (const cell of cells) {
        if (this.hoveredStat.id === "earliest" || this.hoveredStat.id === "latest") {
          if (cell.formattedValue === this.hoveredStat.value) {
            const cellXC = toXC(cell.position!.col, cell.position!.row);
            matches.push(this.env.model.getters.getRangeFromSheetXC(sheetId, cellXC));
          }
        } else if (typeof cell.value === "number") {
          const date = numberToJsDate(cell.value);
          if (date.getMonth() === this.hoveredStat.id) {
            const cellXC = toXC(cell.position!.col, cell.position!.row);
            matches.push(this.env.model.getters.getRangeFromSheetXC(sheetId, cellXC));
          }
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
