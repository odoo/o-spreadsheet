import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUnmount } from "@odoo/owl";
import { Action, isRootMenu } from "../../actions/action";
import { Pixel } from "../../types";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

type MenuItemOrSeparator = Action | "separator";

export interface MenuProps {
  menuItems: MenuItemOrSeparator[];
  onClose: () => void;
  onScroll?: (ev: CustomEvent) => void;
  onClickMenu?: (menu: Action, ev: PointerEvent) => void;
  onMouseEnter?: (menu: Action, ev: PointerEvent) => void;
  onMouseOver?: (menu: Action, ev: PointerEvent) => void;
  onMouseLeave?: (menu: Action, ev: PointerEvent) => void;
  isActive?: (menu: Action) => boolean;
  width?: number;
}

export interface MenuState {
  isOpen: boolean;
  parentMenu?: Action;
  scrollOffset?: Pixel;
  menuItems: Action[];
  isHoveringChild?: boolean;
}

export class Menu extends Component<MenuProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Menu";
  static props = {
    menuItems: Array,
    onClose: Function,
    onClickMenu: { type: Function, optional: true },
    onMouseEnter: { type: Function, optional: true },
    onMouseOver: { type: Function, optional: true },
    onMouseLeave: { type: Function, optional: true },
    width: { type: Number, optional: true },
    isActive: { type: Function, optional: true },
    onScroll: { type: Function, optional: true },
  };

  static components = {};
  static defaultProps = {};

  private hoveredMenu: Action | undefined = undefined;

  setup() {
    onWillUnmount(() => {
      this.hoveredMenu?.onStopHover?.(this.env);
    });
  }

  get childrenHaveIcon(): boolean {
    return this.props.menuItems.some(
      (menuItem) => menuItem !== "separator" && !!this.getIconName(menuItem)
    );
  }

  getIconName(menu: Action) {
    if (menu.icon(this.env)) {
      return menu.icon(this.env);
    }
    if (menu.isActive?.(this.env)) {
      return "o-spreadsheet-Icon.CHECK";
    }

    return "";
  }

  getColor(menu: Action) {
    return cssPropertiesToCss({ color: menu.textColor });
  }

  getIconColor(menu: Action) {
    return cssPropertiesToCss({ color: menu.iconColor });
  }

  getName(menu: Action) {
    return menu.name(this.env);
  }

  isRoot(menu: Action) {
    return isRootMenu(menu);
  }

  isEnabled(menu: Action) {
    const children = menu.children?.(this.env);
    if (children.length) {
      return children.some((child) => this.isEnabled(child));
    } else {
      if (menu.isEnabled(this.env)) {
        return this.env.model.getters.isReadonly() ? menu.isReadonlyAllowed : true;
      }
      return false;
    }
  }

  get menuStyle() {
    return this.props.width ? cssPropertiesToCss({ width: this.props.width + "px" }) : "";
  }

  onMouseEnter(menu: Action, ev: PointerEvent) {
    this.hoveredMenu = menu;
    menu.onStartHover?.(this.env);
    this.props.onMouseEnter?.(menu, ev);
  }

  onMouseLeave(menu: Action, ev: PointerEvent) {
    this.hoveredMenu = undefined;
    menu.onStopHover?.(this.env);
    this.props.onMouseLeave?.(menu, ev);
  }

  onClickMenu(menu: Action, ev: PointerEvent) {
    if (!this.isEnabled(menu)) {
      return;
    }
    this.props.onClickMenu?.(menu, ev);
  }
}
