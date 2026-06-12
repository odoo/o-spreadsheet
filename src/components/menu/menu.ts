import { props, signal } from "@odoo/owl";
import {
  Action,
  adaptShortcutMacOs,
  isMenuItemEnabled,
  isRootMenu,
  MenuItemOrSeparator,
} from "../../actions/action";
import { Component, useLayoutEffect } from "../../owl3_compatibility_layer";
import { Pixel } from "../../types/misc";
import { Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../helpers/css";
import { types } from "../props_validation";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

export type MenuItemRects = { [menuItemId: string]: Rect };

export interface MenuState {
  isOpen: boolean;
  parentMenu?: Action;
  scrollOffset?: Pixel;
  menuItems: Action[];
  isHoveringChild?: boolean;
}

export class Menu extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Menu";
  static components = {};

  protected props = props({
    menuItems: types.ArrayOf<MenuItemOrSeparator>(),
    onClose: types.function(),
    onClickMenu: types.function<(menu: Action, ev: PointerEvent) => void>().optional(),
    onMouseEnter: types.function<(menu: Action, ev: PointerEvent) => void>().optional(),
    onMouseLeave: types.function<(menu: Action, ev: PointerEvent) => void>().optional(),
    width: types.number().optional(),
    hoveredMenuId: types.string().optional(),
    isHoveredMenuFocused: types.boolean().optional(),
    onScroll: types.function<(ev: CustomEvent) => void>().optional(),
    onKeyDown: types.function<(ev: KeyboardEvent) => void>().optional(),
    disableKeyboardNavigation: types.boolean().optional(),
  });

  private menuRef = signal<HTMLElement | null>(null);

  setup(): void {
    useLayoutEffect(() => {
      const menuEl = this.menuRef();
      if (
        this.props.hoveredMenuId &&
        this.props.isHoveredMenuFocused &&
        menuEl &&
        !this.props.disableKeyboardNavigation
      ) {
        const selector = `[data-name='${this.props.hoveredMenuId}']`;
        const menuItemElement = menuEl.querySelector(selector) as HTMLElement;
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

  getShortcut(menu: Action) {
    return adaptShortcutMacOs(menu.shortcut);
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
    return isMenuItemEnabled(this.env, menu);
  }

  get menuStyle() {
    return this.props.width ? cssPropertiesToCss({ width: this.props.width + "px" }) : "";
  }

  onClickMenu(menu: Action, ev: PointerEvent) {
    if (!this.isEnabled(menu)) {
      return;
    }
    this.props.onClickMenu?.(menu, ev);
  }
}
