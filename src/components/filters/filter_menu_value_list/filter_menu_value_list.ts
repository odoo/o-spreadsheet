import { Component, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { deepEquals, positions, toLowerCase } from "../../../helpers";
import { fuzzyLookup } from "../../../helpers/search";
import { Position, SpreadsheetChildEnv } from "../../../types";
import { FilterMenuValueItem } from "../filter_menu_item/filter_menu_value_item";

interface Props {
  filterPosition: Position;
  onUpdateHiddenValues: (values: string[]) => void;
}

interface Value {
  checked: boolean;
  string: string;
  scrolledTo?: "top" | "bottom" | undefined;
}

interface State {
  values: Value[];
  textFilter: string;
  selectedValue: string | undefined;
}

export class FilterMenuValueList extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuValueList";
  static props = {
    filterPosition: Object,
    onUpdateHiddenValues: Function,
  };
  static components = { FilterMenuValueItem };

  private state: State = useState({
    values: [],
    textFilter: "",
    selectedValue: undefined,
  });

  private searchBar = useRef("filterMenuSearchBar");

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.filterPosition, this.props.filterPosition)) {
        this.state.values = this.getFilterHiddenValues(nextProps.filterPosition);
      }
    });

    this.state.values = this.getFilterHiddenValues(this.props.filterPosition);
  }

  private getFilterHiddenValues(position: Position): Value[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const filter = this.env.model.getters.getFilter({ sheetId, ...position });
    if (!filter) {
      return [];
    }

    const cellValues = (filter.filteredRange ? positions(filter.filteredRange.zone) : []).map(
      (position) => ({
        position,
        cellValue: this.env.model.getters.getEvaluatedCell({ sheetId, ...position }).formattedValue,
      })
    );

    const sortFn = (val1: string, val2: string) =>
      val1.localeCompare(val2, undefined, { numeric: true, sensitivity: "base" });

    const filterValue = this.env.model.getters.getFilterValue({ sheetId, ...position });
    if (filterValue?.filterType === "criterion") {
      return [...new Set(cellValues.map((val) => toLowerCase(val.cellValue)))]
        .sort(sortFn)
        .map((val) => ({
          checked: false,
          string: val,
        }));
    }

    const nonHiddenValues = cellValues
      .filter((val) => !this.env.model.getters.isRowHidden(sheetId, val.position.row))
      .map((val) => val.cellValue);
    const strValues = [...nonHiddenValues, ...(filterValue?.hiddenValues || [])];

    const normalizedFilteredValues = filterValue?.hiddenValues.map(toLowerCase) || [];

    // Set with lowercase values to avoid duplicates
    const normalizedValues = [...new Set(strValues.map(toLowerCase))];

    const sortedValues = normalizedValues.sort(sortFn);

    return sortedValues.map((normalizedValue) => {
      const checked =
        normalizedFilteredValues.findIndex((filteredValue) => filteredValue === normalizedValue) ===
        -1;
      return {
        checked,
        string: strValues.find((val) => toLowerCase(val) === normalizedValue) || "",
      };
    });
  }

  checkValue(value: Value) {
    this.state.selectedValue = value.string;
    value.checked = !value.checked;
    this.searchBar.el?.focus();
    this.updateHiddenValues();
  }

  onMouseMove(value: Value) {
    this.state.selectedValue = value.string;
  }

  selectAll() {
    this.displayedValues.forEach((value) => (value.checked = true));
    this.updateHiddenValues();
  }

  clearAll() {
    this.displayedValues.forEach((value) => (value.checked = false));
    this.updateHiddenValues();
  }

  updateHiddenValues() {
    const hiddenValues = this.state.values.filter((val) => !val.checked).map((val) => val.string);
    this.props.onUpdateHiddenValues(hiddenValues);
  }

  get displayedValues() {
    if (!this.state.textFilter) {
      return this.state.values;
    }
    return fuzzyLookup(this.state.textFilter, this.state.values, (val) => val.string);
  }

  onKeyDown(ev: KeyboardEvent) {
    const displayedValues = this.displayedValues;

    if (displayedValues.length === 0) return;

    let selectedIndex: number | undefined = undefined;
    if (this.state.selectedValue !== undefined) {
      const index = displayedValues.findIndex((val) => val.string === this.state.selectedValue);
      selectedIndex = index === -1 ? undefined : index;
    }

    switch (ev.key) {
      case "ArrowDown":
        if (selectedIndex === undefined) {
          selectedIndex = 0;
        } else {
          selectedIndex = Math.min(selectedIndex + 1, displayedValues.length - 1);
        }
        ev.preventDefault();
        ev.stopPropagation();
        break;
      case "ArrowUp":
        if (selectedIndex === undefined) {
          selectedIndex = displayedValues.length - 1;
        } else {
          selectedIndex = Math.max(selectedIndex - 1, 0);
        }
        ev.preventDefault();
        ev.stopPropagation();
        break;
      case "Enter":
        if (selectedIndex !== undefined) {
          this.checkValue(displayedValues[selectedIndex]);
        }
        ev.stopPropagation();
        ev.preventDefault();
        break;
    }

    this.state.selectedValue =
      selectedIndex !== undefined ? displayedValues[selectedIndex].string : undefined;
    if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
      this.scrollListToSelectedValue(ev.key);
    }
  }

  clearScrolledToValue() {
    this.state.values.forEach((val) => (val.scrolledTo = undefined));
  }

  private scrollListToSelectedValue(arrow: "ArrowUp" | "ArrowDown") {
    this.clearScrolledToValue();
    const selectedValue = this.state.values.find((val) => val.string === this.state.selectedValue);
    if (selectedValue) {
      selectedValue.scrolledTo = arrow === "ArrowUp" ? "top" : "bottom";
    }
  }
}
