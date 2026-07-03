import { onWillUpdateProps, proxy, useProps } from "@odoo/owl";
import { toXC } from "../../../../helpers/coordinates";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { deepEquals } from "../../../../helpers/misc";
import { toTrimmedLowerCase } from "../../../../helpers/text_helper";
import { Component } from "../../../../owl3_compatibility_layer";
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
  namesSortType: "asc" | "desc" | "none";
  valuesSortType: "asc" | "desc" | "none";
}

export class Occurrences extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Occurrences";
  protected props = useProps({
    items: types.array(types.StatValue()),
  });
  static components = {
    StatisticItem,
  };
  private listState = proxy<ListState>({
    displayedValues: [],
    numberOfDisplayedValues: 50,
    hasMoreValues: false,
    namesSortType: "none",
    valuesSortType: "desc",
  });
  private hoveredStat = proxy<StatValue>({ id: "", name: "", value: "", formula: "" });

  setup() {
    onWillUpdateProps((nextProps) => {
      if (!deepEquals(nextProps.items, this.props.items)) {
        this.computeDisplayedValues(nextProps.items);
      }
    });
    this.computeDisplayedValues();
    useHighlights(this);
  }

  hoverStat(stat: StatValue, isHovered: boolean) {
    this.hoveredStat.name = isHovered ? stat.name : "";
    this.hoveredStat.value = isHovered ? stat.value : "";
    this.hoveredStat.id = isHovered ? stat.id : "";
    this.hoveredStat.formula = isHovered ? stat.formula : "";
  }

  get total() {
    return this.props.items.reduce((acc, item) => {
      const value = Number(item.value);
      return acc + (isNaN(value) ? 0 : value);
    }, 0);
  }

  computePercentage(value: number): string | undefined {
    if (this.total === 0) {
      return undefined;
    }
    return `(${Math.round((value / this.total) * 100)}%)`;
  }

  computeDisplayedValues(items = this.props.items) {
    const { valuesSortType, namesSortType } = this.listState;
    const sortedItems = [...items];
    sortedItems.sort((a, b) => {
      if (namesSortType !== "none") {
        return namesSortType === "desc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (valuesSortType !== "none") {
        return valuesSortType === "asc"
          ? Number(a.value) - Number(b.value) || a.name.localeCompare(b.name)
          : Number(b.value) - Number(a.value) || a.name.localeCompare(b.name);
      }
      return 0;
    });
    this.listState.displayedValues = sortedItems.slice(0, this.listState.numberOfDisplayedValues);
    this.listState.hasMoreValues = sortedItems.length > this.listState.numberOfDisplayedValues;
  }

  loadMoreValues() {
    this.listState.numberOfDisplayedValues += 50;
    this.computeDisplayedValues();
  }

  sortItemsByName() {
    this.listState.valuesSortType = "none";
    switch (this.listState.namesSortType) {
      case "desc":
        this.listState.namesSortType = "asc";
        break;
      case "asc":
        this.listState.namesSortType = "none";
        break;
      case "none":
        this.listState.namesSortType = "desc";
        break;
    }
    this.computeDisplayedValues();
  }

  sortItemsByValues() {
    this.listState.namesSortType = "none";
    switch (this.listState.valuesSortType) {
      case "desc":
        this.listState.valuesSortType = "asc";
        break;
      case "asc":
        this.listState.valuesSortType = "none";
        break;
      case "none":
        this.listState.valuesSortType = "desc";
        break;
    }
    this.computeDisplayedValues();
  }

  get highlights(): Highlight[] {
    if (this.hoveredStat.name === "") {
      return [];
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const matches: Range[] = [];
    for (const zone of this.env.model.getters.getSelectedZones()) {
      const cells = this.env.model.getters.getEvaluatedCellsInZone(sheetId, zone);
      for (const cell of cells) {
        const normalizedValue = toTrimmedLowerCase(String(cell.value));
        const normalizedHoveredId = toTrimmedLowerCase(String(this.hoveredStat.id));
        if (normalizedValue === normalizedHoveredId) {
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
