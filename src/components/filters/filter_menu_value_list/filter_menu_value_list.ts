import { onWillUpdateProps, props, proxy, signal } from "@odoo/owl";
import { deepEquals } from "../../../helpers/misc";
import { fuzzyLookup } from "../../../helpers/search";
import { Component } from "../../../owl3_compatibility_layer";
import { PropsOf } from "../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { types } from "../../props_validation";
import { FilterMenuValueItem } from "../filter_menu_item/filter_menu_value_item";

interface Value {
  checked: boolean;
  string: string;
  scrolledTo?: "top" | "bottom";
}

interface State {
  displayedValues: Value[];
  textFilter: string;
  selectedValue: string | undefined;
  numberOfDisplayedValues: number;
  hasMoreValues: boolean;
}

export class FilterMenuValueList extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuValueList";
  static components = { FilterMenuValueItem };

  protected props = props({
    values: types.array(
      types.object({
        checked: types.boolean(),
        string: types.string(),
        "scrolledTo?": types.or([types.literal("top"), types.literal("bottom")]),
      })
    ),
    onUpdateHiddenValues: types.function<[values: string[]]>([types.array(types.string())]),
  });

  private state: State = proxy({
    displayedValues: [],
    textFilter: "",
    selectedValue: undefined,
    numberOfDisplayedValues: 50,
    hasMoreValues: false,
  });

  private searchBarRef = signal<HTMLInputElement | null>(null);

  setup() {
    onWillUpdateProps((nextProps: PropsOf<FilterMenuValueList>) => {
      if (!deepEquals(nextProps.values, this.props.values)) {
        this.computeDisplayedValues(nextProps);
      }
    });
    this.computeDisplayedValues(this.props);
  }

  checkValue(value: Value) {
    this.state.selectedValue = value.string;
    value.checked = !value.checked;
    this.searchBarRef()?.focus();
    this.updateHiddenValues();
  }

  onMouseMove(value: Value) {
    this.state.selectedValue = value.string;
  }

  private getSearchedValues(props: PropsOf<FilterMenuValueList>): Value[] {
    return !this.state.textFilter
      ? props.values
      : fuzzyLookup(this.state.textFilter, props.values, (val) => val.string);
  }

  setAllChecked(checked: boolean) {
    const searchedValues = new Set(this.getSearchedValues(this.props));
    for (const value of this.props.values) {
      if (searchedValues.has(value)) {
        value.checked = checked;
      }
    }
    this.updateHiddenValues();
  }

  selectAll() {
    this.setAllChecked(true);
  }

  clearAll() {
    this.setAllChecked(false);
  }

  updateHiddenValues() {
    const hiddenValues = this.props.values.filter((val) => !val.checked).map((val) => val.string);
    this.props.onUpdateHiddenValues(hiddenValues);
  }

  updateSearch(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.state.textFilter = target.value;
    this.state.selectedValue = undefined;
    this.computeDisplayedValues(this.props);
  }

  computeDisplayedValues(props: PropsOf<FilterMenuValueList>) {
    const searchedValues = this.getSearchedValues(props);
    this.state.displayedValues = searchedValues.slice(0, this.state.numberOfDisplayedValues);
    this.state.hasMoreValues = searchedValues.length > this.state.numberOfDisplayedValues;
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
