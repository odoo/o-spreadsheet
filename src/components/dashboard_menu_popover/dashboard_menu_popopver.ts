import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { CellPosition, SpreadsheetChildEnv } from "../..";
import { Action, createActions } from "../../actions/action";
import { dashboardGridMenuRegistry } from "../../registries/menus/dashboard_grid_menu_registry";
import { CellPopoverComponent, PopoverBuilders } from "../../types/cell_popovers";
import { useTimeOut } from "../helpers/time_hooks";
import { MenuItems } from "../menu/menu_items";

interface Props {
  position: CellPosition;
  menuItems: Action[];
}

export class DashboardPopoverMenu extends Component<Props, SpreadsheetChildEnv> {
  static maxSize = { maxHeight: 200 };
  static template = "o-spreadsheet-DashboardPopoverMenu";
  static components = { MenuItems };
  static props = {
    position: Object,
    menuItems: Array,
    onClosed: { type: Function, optional: true },
  };

  state = useState({ isOpen: false });
  timeOut = useTimeOut();

  setup(): void {
    onWillUpdateProps((nextProps: Props) => {
      if (
        nextProps.position.col !== this.props.position.col ||
        nextProps.position.row !== this.props.position.row
      ) {
        this.state.isOpen = false;
      }
    });
  }

  scheduleOpen() {
    this.timeOut.schedule(() => {
      this.state.isOpen = true;
    }, 300);
  }

  onClick() {
    this.state.isOpen = true;
  }
}

export const DashboardPopoverMenuBuilder: PopoverBuilders = {
  onHover: (position, getters): CellPopoverComponent<typeof DashboardPopoverMenu> => {
    const visibleItems = dashboardGridMenuRegistry
      .getAll()
      .filter((action) => action.isVisible?.(getters, position));
    if (visibleItems.length === 0) {
      return { isOpen: false };
    }
    const actionSpecs = visibleItems.map((action) => ({
      ...action,
      iconColor: (env: SpreadsheetChildEnv) => action.iconColor?.(env, position) ?? "",
      isVisible: (env: SpreadsheetChildEnv) =>
        action.isVisible?.(env.model.getters, position) ?? true,
      execute: (env: SpreadsheetChildEnv, isMiddleClick) =>
        action.execute(env, position, isMiddleClick),
      onStartHover: (env: SpreadsheetChildEnv) => action.onStartHover?.(env, position),
      isReadonlyAllowed: true,
    }));
    return {
      isOpen: true,
      props: {
        position,
        menuItems: createActions(actionSpecs),
      },
      Component: DashboardPopoverMenu,
      cellCorner: "top-right",
    };
  },
};
