import { onWillUpdateProps, proxy, useProps } from "@odoo/owl";
import { toXC } from "../../../../helpers/coordinates";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { deepEquals } from "../../../../helpers/misc";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { Highlight } from "../../../../types/misc";
import { Range } from "../../../../types/range";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { useHighlights } from "../../../helpers/highlight_hook";
import { types } from "../../../props_validation";
import { StatisticItem } from "./statistic_item";

export interface ListState {
  displayedValues: StatValue[];
  numberOfDisplayedValues: number;
  hasMoreValues: boolean;
  sortType: "asc" | "desc" | "none";
}

export class Occurencies extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Occurencies";
  protected props = useProps({
    items: types.array(types.StatValue()),
    sortItemsFunction: types
      .function<
        (
          items: StatValue[],
          sortType: "asc" | "desc" | "none"
        ) => { sortedItems: StatValue[]; newSortType: "asc" | "desc" | "none" }
      >()
      .optional(),
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
    onWillUpdateProps((nextProps) => {
      if (!deepEquals(nextProps.items, this.props.items)) {
        this.computeDisplayedValues(nextProps.items);
      }
    });
    this.computeDisplayedValues(this.props.items);
    useHighlights(this);
  }

  hoverStat(stat: StatValue, isHovered: boolean) {
    this.hoveredStat.name = isHovered ? stat.name : "";
    this.hoveredStat.value = isHovered ? stat.value : "";
    this.hoveredStat.id = isHovered ? stat.id : "";
    this.hoveredStat.formula = isHovered ? stat.formula : "";
  }

  get label() {
    return _t("Category occurrences");
  }

  get total() {
    return this.props.items.reduce((acc, item) => acc + Number(item.value), 0);
  }

  computePercentage(value: number) {
    if (this.total === 0) {
      return "0%";
    }
    return `(${Math.round((value / this.total) * 100)}%)`;
  }

  computeDisplayedValues(items: StatValue[]) {
    this.listState.displayedValues = items.slice(0, this.listState.numberOfDisplayedValues);
    this.listState.hasMoreValues = items.length > this.listState.numberOfDisplayedValues;
  }

  loadMoreValues() {
    this.listState.numberOfDisplayedValues += 50;
    this.computeDisplayedValues(this.props.items);
  }

  sortItems() {
    if (!this.props.sortItemsFunction) {
      return;
    }
    const { sortedItems, newSortType } = this.props.sortItemsFunction(
      [...this.props.items],
      this.listState.sortType
    );
    this.listState.sortType = newSortType;
    this.computeDisplayedValues(sortedItems);
  }

  get highlights(): Highlight[] {
    if (this.hoveredStat.name === "") {
      return [];
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zones = this.env.model.getters.getSelectedZones();
    const matches: Range[] = [];
    for (const zone of zones) {
      const cells = this.env.model.getters.getEvaluatedCellsInZone(sheetId, zone);
      for (const cell of cells) {
        if (cell.value === this.hoveredStat.id) {
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
