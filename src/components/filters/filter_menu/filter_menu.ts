import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { BUTTON_ACTIVE_BG } from "../../../constants";
import { deepEquals } from "../../../helpers";
import { interactiveSort } from "../../../helpers/sort";
import { Position, SortDirection, SpreadsheetChildEnv } from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { css } from "../../helpers/css";
import { FilterMenuValueList } from "../filter_menu_value_list/filter_menu_value_list";

const FILTER_MENU_HEIGHT = 295;

css/* scss */ `
  .o-filter-menu {
    padding: 8px 16px;
    height: ${FILTER_MENU_HEIGHT}px;
    line-height: 1;

    .o-filter-menu-item {
      display: flex;
      cursor: pointer;
      user-select: none;

      &.selected,
      &:hover {
        background-color: ${BUTTON_ACTIVE_BG};
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

interface State {
  updatedHiddenValue: string[] | undefined;
}

export class FilterMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenu";
  static props = {
    filterPosition: Object,
    onClosed: { type: Function, optional: true },
  };
  static components = { FilterMenuValueList };

  private state: State = useState({
    updatedHiddenValue: undefined,
  });

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.filterPosition, this.props.filterPosition)) {
        this.state.updatedHiddenValue = undefined;
      }
    });
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

  get table() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const position = this.props.filterPosition;
    return this.env.model.getters.getTable({ sheetId, ...position });
  }

  onUpdateHiddenValues(values: string[]) {
    this.state.updatedHiddenValue = values;
  }

  confirm() {
    if (!this.state.updatedHiddenValue) {
      this.props.onClosed?.();
      return;
    }
    const position = this.props.filterPosition;
    this.env.model.dispatch("UPDATE_FILTER", {
      ...position,
      sheetId: this.env.model.getters.getActiveSheetId(),
      hiddenValues: this.state.updatedHiddenValue,
    });
    this.props.onClosed?.();
  }

  cancel() {
    this.props.onClosed?.();
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
}

export const FilterMenuPopoverBuilder: PopoverBuilders = {
  onOpen: (position, getters): CellPopoverComponent<typeof FilterMenu> => {
    return {
      isOpen: true,
      props: { filterPosition: position },
      Component: FilterMenu,
      cellCorner: "bottom-left",
    };
  },
};
