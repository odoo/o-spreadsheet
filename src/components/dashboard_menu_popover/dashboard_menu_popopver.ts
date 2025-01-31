import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { CellPosition, SpreadsheetChildEnv } from "../..";
import { Action } from "../../actions/action";
import {
  createDashboardActions,
  dashboardGridMenuRegistry,
} from "../../registries/menus/dashboard_grid_menu_registry";
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
        this.timeOut.clear();
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
    if (!getters.isDashboard()) {
      return { isOpen: false };
    }
    const visibleItems = dashboardGridMenuRegistry
      .getAll()
      .filter((action) => action.isVisible?.(getters, position));
    if (visibleItems.length === 0) {
      return { isOpen: false };
    }
    return {
      isOpen: true,
      transition: true,
      props: {
        position,
        menuItems: createDashboardActions(visibleItems, position),
      },
      Component: DashboardPopoverMenu,
      cellCorner: "top-right",
    };
  },
};
