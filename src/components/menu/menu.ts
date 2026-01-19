import { Rect } from "@odoo/o-spreadsheet-engine";
import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef } from "@odoo/owl";
import { Action, isMenuItemEnabled, MenuItemOrSeparator } from "../../actions/action";
import { Pixel } from "../../types";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

export type MenuItemRects = { [menuItemId: string]: Rect };

export interface MenuProps {
  menuItems: MenuItemOrSeparator[];
  onClose: () => void;
  onScroll?: (ev: CustomEvent) => void;
  onClickMenu?: (menu: Action, ev: CustomEvent) => void;
  onMouseEnter?: (menu: Action, ev: PointerEvent) => void;
  onMouseLeave?: (menu: Action, ev: PointerEvent) => void;
  isActive?: (menu: Action) => boolean;
  width?: number;
  focusedMenuItemId?: string;
  onKeyDown?: (ev: KeyboardEvent) => void;
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
    onMouseLeave: { type: Function, optional: true },
    width: { type: Number, optional: true },
    isActive: { type: Function, optional: true },
    onScroll: { type: Function, optional: true },
    focusedMenuItemId: { type: String, optional: true },
    onKeyDown: { type: Function, optional: true },
  };

  static components = {};
  static defaultProps = {};

  private menuRef = useRef("menu");

  setup(): void {
    useEffect(() => {
      if (this.props.focusedMenuItemId && this.menuRef.el) {
        const selector = `[data-name='${this.props.focusedMenuItemId}']`;
        const menuItemElement = this.menuRef.el.querySelector(selector) as HTMLElement;
        menuItemElement?.focus();
      }
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
    return !menu.execute;
  }

  isEnabled(menu: Action) {
    return isMenuItemEnabled(this.env, menu);
  }

  get menuStyle() {
    return this.props.width ? cssPropertiesToCss({ width: this.props.width + "px" }) : "";
  }

  onClickMenu(menu: Action, ev: CustomEvent) {
    if (!this.isEnabled(menu)) {
      return;
    }
    this.props.onClickMenu?.(menu, ev);
  }
}
