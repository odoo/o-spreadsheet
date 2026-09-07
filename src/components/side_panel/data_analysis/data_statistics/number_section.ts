import { proxy, useProps } from "@odoo/owl";
import { toXC } from "../../../../helpers/coordinates";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { Component } from "../../../../owl3_compatibility_layer";
import { Highlight } from "../../../../types/misc";
import { Range } from "../../../../types/range";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { useHighlights } from "../../../helpers/highlight_hook";
import { types } from "../../../props_validation";
import { ListState } from "./category_section";
import { StatisticItem } from "./statistic_item";

export class NumberSection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-NumberSection";
  protected props = useProps({
    statSections: types.array(types.StatSection()),
  });
  static components = {
    StatisticItem,
  };

  private listState = proxy<ListState>({
    displayedValues: [],
    numberOfDisplayedValues: 50,
    hasMoreValues: false,
    sortType: "desc",
  });

  private hoveredStat = proxy<StatValue>({ id: "", name: "", value: "", formula: "" });

  setup() {
    this.computeDisplayedValues(this.occurrencySection.items);
    useHighlights(this);
  }

  get occurrencySection() {
    return this.props.statSections[1];
  }

  computeDisplayedValues(items: StatValue[]) {
    this.listState.displayedValues = items.slice(0, this.listState.numberOfDisplayedValues);
    this.listState.hasMoreValues = items.length > this.listState.numberOfDisplayedValues;
  }

  loadMoreValues() {
    this.listState.numberOfDisplayedValues += 50;
    this.computeDisplayedValues(this.occurrencySection.items);
  }

  sortItems() {
    const items = this.occurrencySection.items;
    switch (this.listState.sortType) {
      case "desc":
        this.listState.sortType = "asc";
        items.sort((a, b) => Number(a.value) - Number(b.value));
        break;
      case "asc":
        this.listState.sortType = "none";
        break;
      case "none":
        this.listState.sortType = "desc";
        items.sort((a, b) => Number(b.value) - Number(a.value));
        break;
    }
    this.computeDisplayedValues(items);
  }

  get total() {
    return this.occurrencySection.items.reduce((acc, item) => acc + Number(item.value), 0);
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
    if (this.hoveredStat.id === "" || ["average", "median", "sum"].includes(this.hoveredStat.id)) {
      return [];
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zones = this.env.model.getters.getSelectedZones();
    const matches: Range[] = [];
    for (const zone of zones) {
      const cells = this.env.model.getters.getEvaluatedCellsInZone(sheetId, zone);
      for (const cell of cells) {
        let doesMatch = false;
        if (["min", "max"].includes(this.hoveredStat.id)) {
          if (cell.formattedValue === this.hoveredStat.value) {
            doesMatch = true;
          }
        } else {
          if (cell.formattedValue === this.hoveredStat.name) {
            doesMatch = true;
          }
        }
        if (doesMatch) {
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
