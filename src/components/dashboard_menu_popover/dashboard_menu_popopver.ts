import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { CellPosition, SpreadsheetChildEnv } from "../..";
import { ActionSpec, createActions } from "../../actions/action";
import { dashboardGridMenuRegistry } from "../../registries/menus/dashboard_grid_menu_registry";
import { CellPopoverComponent, PopoverBuilders } from "../../types/cell_popovers";
import { useTimeOut } from "../helpers/time_hooks";
import { MenuItems } from "../menu/menu_items";

interface Props {
  position: CellPosition;
}

export class DashboardPopoverMenu extends Component<Props, SpreadsheetChildEnv> {
  static maxSize = { maxHeight: 200 };
  static template = "o-spreadsheet-DashboardPopoverMenu";
  static components = { MenuItems };
  static props = {
    position: Object,
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

  get menuItems() {
    const actions: ActionSpec[] = dashboardGridMenuRegistry
      .getAll()
      .map((action) => ({
        ...action,
        isVisible: (env: SpreadsheetChildEnv) =>
          action.isVisible?.(env.model.getters, this.props.position) ?? true,
        execute: (env: SpreadsheetChildEnv, isMiddleClick) =>
          action.execute(env, this.props.position, isMiddleClick),
        onStartHover: (env: SpreadsheetChildEnv) => action.onStartHover?.(env, this.props.position),
        isReadonlyAllowed: true,
      }))
      .filter((action) => action.isVisible?.(this.env));
    return createActions(actions);
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
    const hasVisibleItems = dashboardGridMenuRegistry
      .getAll()
      .some((action) => action.isVisible?.(getters, position));
    return {
      isOpen: hasVisibleItems,
      props: {
        position,
      },
      Component: DashboardPopoverMenu,
      cellCorner: "top-right",
    };
  },
};
