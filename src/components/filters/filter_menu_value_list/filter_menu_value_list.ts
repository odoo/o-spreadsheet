import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { deepEquals, fuzzyLookup } from "../../../helpers";
import { FilterMenuValueItem } from "../filter_menu_item/filter_menu_value_item";

interface Props {
  values: Value[];
  onUpdateHiddenValues: (values: string[]) => void;
}

interface Value {
  checked: boolean;
  string: string;
  scrolledTo?: "top" | "bottom" | undefined;
}

interface State {
  displayedValues: Value[];
  textFilter: string;
  selectedValue: string | undefined;
  numberOfDisplayedValues: number;
  hasMoreValues: boolean;
}

export class FilterMenuValueList extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuValueList";
  static props = {
    values: Object,
    onUpdateHiddenValues: Function,
  };
  static components = { FilterMenuValueItem };

  private state: State = useState({
    displayedValues: [],
    textFilter: "",
    selectedValue: undefined,
    numberOfDisplayedValues: 50,
    hasMoreValues: false,
  });

  private searchBar = useRef("filterMenuSearchBar");

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.values, this.props.values)) {
        this.computeDisplayedValues(nextProps);
      }
    });
    this.computeDisplayedValues(this.props);
  }

  computeDisplayedValues(props: Props) {
    const values = !this.state.textFilter
      ? props.values
      : fuzzyLookup(this.state.textFilter, props.values, (val) => val.string);
    this.state.displayedValues = values.slice(0, this.state.numberOfDisplayedValues);
    this.state.hasMoreValues = values.length > this.state.numberOfDisplayedValues;
  }

  updateHiddenValues() {
    const hiddenValues = this.props.values.filter((val) => !val.checked).map((val) => val.string);
    this.props.onUpdateHiddenValues(hiddenValues);
  }

  checkValue(value: Value) {
    this.state.selectedValue = value.string;
    value.checked = !value.checked;
    this.searchBar.el?.focus();
    this.updateHiddenValues();
  }

  selectAll() {
    this.state.displayedValues.forEach((value) => (value.checked = true));
    this.props.onUpdateHiddenValues([]);
  }

  clearAll() {
    this.state.displayedValues.forEach((value) => (value.checked = false));
    const hiddenValues = this.props.values.map((val) => val.string);
    this.props.onUpdateHiddenValues(hiddenValues);
  }

  onMouseMove(value: Value) {
    this.state.selectedValue = value.string;
  }

  updateSearch(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.state.textFilter = target.value;
    this.state.selectedValue = undefined;
    this.computeDisplayedValues(this.props);
  }

  loadMoreValues() {
    this.state.numberOfDisplayedValues += 100;
    this.computeDisplayedValues(this.props);
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
    this.props.values.forEach((val) => (val.scrolledTo = undefined));
  }

  private scrollListToSelectedValue(arrow: "ArrowUp" | "ArrowDown") {
    this.clearScrolledToValue();
    const selectedValue = this.props.values.find((val) => val.string === this.state.selectedValue);
    if (selectedValue) {
      selectedValue.scrolledTo = arrow === "ArrowUp" ? "top" : "bottom";
    }
  }
}
