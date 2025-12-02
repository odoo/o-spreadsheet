import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { deepEquals, positions, toTrimmedLowerCase } from "../../../helpers";
import { fuzzyLookup } from "../../../helpers/search";
import { Position } from "../../../types";
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
  displayedValues: Value[];
  textFilter: string;
  selectedValue: string | undefined;
  numberOfDisplayedValues: number;
  hasMoreValues: boolean;
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
    displayedValues: [],
    textFilter: "",
    selectedValue: undefined,
    numberOfDisplayedValues: 50,
    hasMoreValues: false,
  });

  private searchBar = useRef("filterMenuSearchBar");

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.filterPosition, this.props.filterPosition)) {
        this.state.values = this.getFilterHiddenValues(nextProps.filterPosition);
        this.computeDisplayedValues();
      }
    });

    this.state.values = this.getFilterHiddenValues(this.props.filterPosition);
    this.computeDisplayedValues();
  }

  private getFilterHiddenValues(position: Position): Value[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const filter = this.env.model.getters.getFilter({ sheetId, ...position });
    if (!filter) {
      return [];
    }
    const filterValue = this.env.model.getters.getFilterValue({ sheetId, ...position });

    let cells = (filter.filteredRange ? positions(filter.filteredRange.zone) : []).map(
      (position) => ({
        position,
        cellValue: this.env.model.getters.getEvaluatedCell({ sheetId, ...position }).formattedValue,
      })
    );
    if (filterValue?.filterType !== "criterion") {
      cells = cells.filter((val) => !this.env.model.getters.isRowHidden(sheetId, val.position.row));
    }

    const cellValues = cells.map((val) => val.cellValue);
    const filterValues = filterValue?.filterType === "values" ? filterValue.hiddenValues : [];
    const normalizedFilteredValues = new Set(filterValues.map(toTrimmedLowerCase));

    const set = new Set<string>();
    const values: (Value & { normalizedValue: string })[] = [];
    const addValue = (value: string) => {
      const normalizedValue = toTrimmedLowerCase(value);
      if (!set.has(normalizedValue)) {
        values.push({
          string: value || "",
          checked:
            filterValue?.filterType !== "criterion"
              ? !normalizedFilteredValues.has(normalizedValue)
              : false,
          normalizedValue,
        });
        set.add(normalizedValue);
      }
    };
    cellValues.forEach(addValue);
    filterValues.forEach(addValue);

    return values.sort((val1, val2) =>
      val1.normalizedValue.localeCompare(val2.normalizedValue, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
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
    this.state.displayedValues.forEach((value) => (value.checked = true));
    this.props.onUpdateHiddenValues([]);
  }

  clearAll() {
    this.state.displayedValues.forEach((value) => (value.checked = false));
    const hiddenValues = this.state.values.map((val) => val.string);
    this.props.onUpdateHiddenValues(hiddenValues);
  }

  updateHiddenValues() {
    const hiddenValues = this.state.values.filter((val) => !val.checked).map((val) => val.string);
    this.props.onUpdateHiddenValues(hiddenValues);
  }

  updateSearch(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.state.textFilter = target.value;
    this.state.selectedValue = undefined;
    this.computeDisplayedValues();
  }

  computeDisplayedValues() {
    const values = !this.state.textFilter
      ? this.state.values
      : fuzzyLookup(this.state.textFilter, this.state.values, (val) => val.string);
    this.state.displayedValues = values.slice(0, this.state.numberOfDisplayedValues);
    this.state.hasMoreValues = values.length > this.state.numberOfDisplayedValues;
  }

  loadMoreValues() {
    this.state.numberOfDisplayedValues += 100;
    this.computeDisplayedValues();
  }

  onKeyDown(ev: KeyboardEvent) {
    const displayedValues = this.state.displayedValues;

    if (displayedValues.length === 0) {
      return;
    }

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
