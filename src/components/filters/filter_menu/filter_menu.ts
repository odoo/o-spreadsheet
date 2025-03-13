import { Component, ComponentConstructor, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { Action, createAction } from "../../../actions/action";
import { GRAY_300 } from "../../../constants";
import { deepEquals, positions, toLowerCase } from "../../../helpers";
import { fuzzyLookup } from "../../../helpers/search";
import { interactiveSort } from "../../../helpers/sort";
import {
  criterionComponentRegistry,
  getCriterionMenuItems,
} from "../../../registries/criterion_component_registry";
import { criterionEvaluatorRegistry } from "../../../registries/criterion_registry";
import { _t } from "../../../translation";
import {
  GenericCriterion,
  Position,
  SortDirection,
  SpreadsheetChildEnv,
  availableFiltersOperators,
} from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { css } from "../../helpers/css";
import { SidePanelCollapsible } from "../../side_panel/components/collapsible/side_panel_collapsible";
import { SelectMenu } from "../../side_panel/select_menu/select_menu";
import { FilterMenuValueItem } from "../filter_menu_item/filter_menu_value_item";

// const FILTER_MENU_HEIGHT = 295;

const CSS = css/* scss */ `
  .o-filter-menu {
    width: 245px;
    padding: 8px 16px;
    user-select: none;

    // ADRM TODO: something better
    .o_side_panel_collapsible_title {
      font-size: inherit;
      padding: 0 0 4px 0 !important;
      font-weight: 500 !important;

      .collapsor-arrow {
        transform-origin: 6px 8px;

        .o-icon {
          width: 12px;
          height: 16px;
        }
      }
    }

    .o-filter-menu-item {
      display: flex;
      cursor: pointer;
      user-select: none;
      line-height: 1;

      &.selected {
        background-color: rgba(0, 0, 0, 0.08);
      }
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
      line-height: 1;
    }

    .o-filter-menu-list {
      flex: auto;
      overflow-y: auto;
      border: 1px solid ${GRAY_300};
      height: 130px;
      line-height: 1;

      .o-filter-menu-no-values {
        color: #949494;
        font-style: italic;
      }
    }

    .o-filter-menu-buttons {
      margin-top: 9px;

      .o-button {
        height: 26px;
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
  static components = { FilterMenuValueItem, SelectMenu, SidePanelCollapsible };

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
    const sortAnchor = { col: filterPosition.col, row: contentZone.top };
    const sortOptions = { emptyCellAsZero: true, sortHeaders: true };
    interactiveSort(this.env, sheetId, sortAnchor, contentZone, sortDirection, sortOptions);
    this.props.onClosed?.();
  }

  get criterionMenuItems(): Action[] {
    const items = getCriterionMenuItems((type) => {}, availableFiltersOperators);
    const emptyItem = createAction({
      name: _t("None"),
      id: "none",
      separator: true,
      execute: () => {},
    });
    return [emptyItem, ...items];
  }

  get selectedCriterionName(): string {
    return criterionEvaluatorRegistry.get("isBetween").name;
  }

  get criterionComponent(): ComponentConstructor | undefined {
    return criterionComponentRegistry.get("isBetween").component;
  }

  get genericCriterion(): GenericCriterion {
    return {
      type: "isBetween",
      values: ["5", "6"],
    };
  }

  onRuleValuesChanged(values: string[]) {
    this.genericCriterion.values = values;
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
