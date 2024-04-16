import { Component, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { MENU_ITEM_HEIGHT } from "../../../constants";
import { deepEquals, positions, toLowerCase } from "../../../helpers";
import { fuzzyLookup } from "../../../helpers/search";
import { Position, SortDirection, SpreadsheetChildEnv } from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { css } from "../../helpers/css";
import { FilterMenuValueItem } from "../filter_menu_item/filter_menu_value_item";

const FILTER_MENU_HEIGHT = 295;

const CSS = css/* scss */ `
  .o-filter-menu {
    box-sizing: border-box;
    padding: 8px 16px;
    height: ${FILTER_MENU_HEIGHT}px;
    line-height: 1;

    .o-filter-menu-item {
      display: flex;
      box-sizing: border-box;
      height: ${MENU_ITEM_HEIGHT}px;
      padding: 4px 4px 4px 0px;
      cursor: pointer;
      user-select: none;

      &.selected {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }

    input {
      box-sizing: border-box;
      margin-bottom: 5px;
      border: 1px solid #949494;
      height: 24px;
      padding-right: 28px;
    }

    .o-search-icon {
      right: 5px;
      top: 3px;
      opacity: 0.4;

      svg {
        height: 16px;
        width: 16px;
        vertical-align: middle;
      }
    }

    .o-filter-menu-actions {
      display: flex;
      flex-direction: row;
      margin-bottom: 4px;

      .o-filter-menu-action-text {
        cursor: pointer;
        margin-right: 10px;
        color: blue;
        text-decoration: underline;
      }
    }

    .o-filter-menu-list {
      flex: auto;
      overflow-y: auto;
      border: 1px solid #949494;

      .o-filter-menu-no-values {
        color: #949494;
        font-style: italic;
      }
    }

    .o-filter-menu-buttons {
      margin-top: 9px;

      .o-filter-menu-button {
        border: 1px solid lightgrey;
        padding: 6px 10px;
        cursor: pointer;
        border-radius: 4px;
        font-weight: 500;
        line-height: 16px;
      }

      .o-filter-menu-button-cancel {
        background: white;
        &:hover {
          background-color: rgba(0, 0, 0, 0.08);
        }
      }

      .o-filter-menu-button-primary {
        background-color: #188038;
        &:hover {
          background-color: #1d9641;
        }
        color: white;
        font-weight: bold;
        margin-left: 10px;
      }
    }
  }
`;

interface Props {
  filterPosition: Position;
  onClosed?: () => void;
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

export class FilterMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenu";
  static props = {
    filterPosition: Object,
    onClosed: { type: Function, optional: true },
  };
  static style = CSS;
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

  get isSortable() {
    if (!this.table) {
      return false;
    }
    const coreTable = this.env.model.getters.getCoreTableMatchingTopLeft(
      this.table.range.sheetId,
      this.table.range.zone
    );
    return !this.env.model.getters.isReadonly() && coreTable?.type !== "dynamic";
  }

  private getFilterHiddenValues(position: Position): Value[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const filter = this.env.model.getters.getFilter({ sheetId, ...position });
    if (!filter) {
      return [];
    }

    const cellValues = (filter.filteredRange ? positions(filter.filteredRange.zone) : [])
      .filter(({ row }) => !this.env.model.getters.isRowHidden(sheetId, row))
      .map(
        ({ col, row }) =>
          this.env.model.getters.getEvaluatedCell({ sheetId, col, row }).formattedValue
      );

    const filterValues = this.env.model.getters.getFilterHiddenValues({ sheetId, ...position });

    const strValues = [...cellValues, ...filterValues];
    const normalizedFilteredValues = filterValues.map(toLowerCase);

    // Set with lowercase values to avoid duplicates
    const normalizedValues = [...new Set(strValues.map(toLowerCase))];

    const sortedValues = normalizedValues.sort((val1, val2) =>
      val1.localeCompare(val2, undefined, { numeric: true, sensitivity: "base" })
    );

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
  }

  onMouseMove(value: Value) {
    this.state.selectedValue = value.string;
  }

  selectAll() {
    this.displayedValues.forEach((value) => (value.checked = true));
  }

  clearAll() {
    this.displayedValues.forEach((value) => (value.checked = false));
  }

  get table() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const position = this.props.filterPosition;
    return this.env.model.getters.getTable({ sheetId, ...position });
  }

  get displayedValues() {
    if (!this.state.textFilter) {
      return this.state.values;
    }
    return fuzzyLookup(this.state.textFilter, this.state.values, (val) => val.string);
  }

  confirm() {
    const position = this.props.filterPosition;
    this.env.model.dispatch("UPDATE_FILTER", {
      ...position,
      sheetId: this.env.model.getters.getActiveSheetId(),
      hiddenValues: this.state.values.filter((val) => !val.checked).map((val) => val.string),
    });
    this.props.onClosed?.();
  }

  cancel() {
    this.props.onClosed?.();
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

  sortFilterZone(sortDirection: SortDirection) {
    const filterPosition = this.props.filterPosition;
    const table = this.table;
    const tableZone = table?.range.zone;
    if (!filterPosition || !tableZone || tableZone.top === tableZone.bottom) {
      return;
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const contentZone = { ...tableZone, top: tableZone.top + 1 };
    this.env.model.dispatch("SORT_CELLS", {
      sheetId,
      col: filterPosition.col,
      row: contentZone.top,
      zone: contentZone,
      sortDirection,
      sortOptions: { emptyCellAsZero: true, sortHeaders: true },
    });
    this.props.onClosed?.();
  }
}

export const FilterMenuPopoverBuilder: PopoverBuilders = {
  onOpen: (position, getters): CellPopoverComponent<typeof FilterMenu> => {
    return {
      isOpen: true,
      props: { filterPosition: position },
      Component: FilterMenu,
      cellCorner: "BottomLeft",
    };
  },
};
