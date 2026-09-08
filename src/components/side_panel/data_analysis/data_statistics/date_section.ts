import { proxy, useProps } from "@odoo/owl";
import { toXC } from "../../../../helpers/coordinates";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { numberToJsDate } from "../../../../helpers/dates";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { Highlight } from "../../../../types/misc";
import { Range } from "../../../../types/range";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { useHighlights } from "../../../helpers/highlight_hook";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";
import { StatisticItem } from "./statistic_item";

interface DateSectionState {
  granularity: "year" | "month" | "day";
  sortType: "desc" | "asc" | "chrono";
  displayedValues: StatValue[];
}

export class DateSection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DateSection";
  protected props = useProps({
    statSections: types.array(types.StatSection()),
  });
  static components = {
    StatisticItem,
    Select,
  };
  private hoveredStat = proxy<StatValue>({ id: "", name: "", value: "", formula: "" });
  private state = proxy<DateSectionState>({
    granularity: "month",
    sortType: "chrono",
    displayedValues: this.props.statSections[1].items,
  });

  setup() {
    useHighlights(this);
  }

  get granularityOptions() {
    return [
      { value: "year", label: _t("Year") },
      { value: "month", label: _t("Month") },
      { value: "day", label: _t("Day of week") },
    ];
  }
  onGranularitySelected(granularity: "year" | "month" | "day") {
    this.state.granularity = granularity;
  }

  sortItems() {
    const items = [...this.occurrencySection.items];
    switch (this.state.sortType) {
      case "desc":
        this.state.sortType = "asc";
        items.sort((a, b) => Number(a.value) - Number(b.value) || a.name.localeCompare(b.name));
        break;
      case "asc":
        this.state.sortType = "chrono";
        items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
        break;
      case "chrono":
        this.state.sortType = "desc";
        items.sort((a, b) => Number(b.value) - Number(a.value) || a.name.localeCompare(b.name));
        break;
    }
    this.state.displayedValues = items;
  }

  get total() {
    return this.props.statSections[1].items.reduce((acc, item) => acc + Number(item.value), 0);
  }

  get occurrencySection() {
    switch (this.state.granularity) {
      case "year":
        return this.props.statSections[0];
      case "month":
        return this.props.statSections[1];
      case "day":
        return this.props.statSections[2];
    }
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
        let doesMatch = false;
        if (
          (this.hoveredStat.id === "earliest" || this.hoveredStat.id === "latest") &&
          cell.formattedValue === this.hoveredStat.value
        ) {
          doesMatch = true;
        } else if (typeof cell.value === "number") {
          const date = numberToJsDate(cell.value);
          switch (this.state.granularity) {
            case "year":
              if (date.getFullYear() === Number(this.hoveredStat.id)) {
                doesMatch = true;
              }
              break;
            case "month":
              if (date.getMonth() === Number(this.hoveredStat.id)) {
                doesMatch = true;
              }
              break;
            case "day":
              if (date.getDay() === Number(this.hoveredStat.id)) {
                doesMatch = true;
              }
              break;
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
