import { onWillUpdateProps, proxy, useProps } from "@odoo/owl";
import { HIGHLIGHT_COLOR } from "../../../../constants";
import { toXC } from "../../../../helpers/coordinates";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { deepEquals } from "../../../../helpers/misc";
import { Component } from "../../../../owl3_compatibility_layer";
import { Highlight } from "../../../../types/misc";
import { Range } from "../../../../types/range";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { useHighlights } from "../../../helpers/highlight_hook";
import { types } from "../../../props_validation";
import { StatisticItem } from "./statistic_item";

interface ListState {
  displayedValues: StatValue[];
  numberOfDisplayedValues: number;
  hasMoreValues: boolean;
  sortType: "asc" | "desc" | "none";
}

export class CategorySection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CategorySection";
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
  private hoveredStat = proxy<{ name: string | undefined }>({ name: undefined });

  setup() {
    onWillUpdateProps((nextProps) => {
      if (!deepEquals(nextProps.statSections, this.props.statSections)) {
        this.computeDisplayedValues(nextProps.statSections[1].items);
      }
    });
    this.computeDisplayedValues(this.categorySection.items);
    useHighlights(this);
  }

  get categorySection() {
    return this.props.statSections[1];
  }

  computeDisplayedValues(items: StatValue[]) {
    this.listState.displayedValues = items.slice(0, this.listState.numberOfDisplayedValues);
    this.listState.hasMoreValues = items.length > this.listState.numberOfDisplayedValues;
  }

  loadMoreValues() {
    this.listState.numberOfDisplayedValues += 50;
    this.computeDisplayedValues(this.categorySection.items);
  }

  get total() {
    return this.categorySection.items.reduce((acc, item) => acc + Number(item.value), 0);
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

  sortItems() {
    const items = this.categorySection.items;
    switch (this.listState.sortType) {
      case "desc":
        this.listState.sortType = "asc";
        items.sort((a, b) => Number(a.value) - Number(b.value) || a.name.localeCompare(b.name));
        break;
      case "asc":
        this.listState.sortType = "none";
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "none":
        this.listState.sortType = "desc";
        items.sort((a, b) => Number(b.value) - Number(a.value) || a.name.localeCompare(b.name));
        break;
    }
    this.computeDisplayedValues(items);
  }

  get highlights(): Highlight[] {
    if (this.hoveredStat.name === undefined) {
      return [];
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zones = this.env.model.getters.getSelectedZones();
    const matches: Range[] = [];
    for (const zone of zones) {
      const cells = this.env.model.getters.getEvaluatedCellsInZone(sheetId, zone);
      for (const cell of cells) {
        if (cell.value === this.hoveredStat.name) {
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
