import { Component, onWillUnmount } from "@odoo/owl";
import { Action } from "../../actions/action";
import { Pixel, SpreadsheetChildEnv } from "../../types";
import { cssPropertiesToCss } from "../helpers/css";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

type MenuItemOrSeparator = Action | "separator";

export interface MenuProps {
  menuItems: Action[];
  onClose: () => void;
  onScroll?: (ev: CustomEvent) => void;
  onClickMenu?: (menu: Action, ev: CustomEvent) => void;
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

  get menuItemsAndSeparators(): MenuItemOrSeparator[] {
    const menuItemsAndSeparators: MenuItemOrSeparator[] = [];
    for (let i = 0; i < this.props.menuItems.length; i++) {
      const menuItem = this.props.menuItems[i];
      if (
        menuItem.isVisible(this.env) &&
        (!this.isRoot(menuItem) || this.hasVisibleChildren(menuItem))
      ) {
        menuItemsAndSeparators.push(menuItem);
      }
      if (
        menuItem.separator &&
        i !== this.props.menuItems.length - 1 && // no separator at the end
        menuItemsAndSeparators[menuItemsAndSeparators.length - 1] !== "separator" // no double separator
      ) {
        menuItemsAndSeparators.push("separator");
      }
    }
    if (menuItemsAndSeparators[menuItemsAndSeparators.length - 1] === "separator") {
      menuItemsAndSeparators.pop();
    }
    if (menuItemsAndSeparators.length === 1 && menuItemsAndSeparators[0] === "separator") {
      return [];
    }
    return menuItemsAndSeparators;
  }

  get childrenHaveIcon(): boolean {
    return this.props.menuItems.some((menuItem) => !!this.getIconName(menuItem));
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
    return !menu.execute;
  }

  private hasVisibleChildren(menu: Action) {
    return menu.children(this.env).some((child) => child.isVisible(this.env));
  }

  isEnabled(menu: Action) {
    if (menu.isEnabled(this.env)) {
      return this.env.model.getters.isReadonly() ? menu.isReadonlyAllowed : true;
    }
    return false;
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

  onClickMenu(menu: Action, ev: CustomEvent) {
    if (!this.isEnabled(menu)) {
      return;
    }
    this.props.onClickMenu?.(menu, ev);
  }
}
