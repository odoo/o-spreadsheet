import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { Action } from "../../../actions/action";
import { topbarMenuRegistry } from "../../../registries";
import { SpreadsheetChildEnv } from "../../../types";
import { cssPropertiesToCss } from "../../helpers";

export const itemHeight = 40;

interface State {
  menuItems: Action[];
  title: string | undefined;
  parentState: State | undefined;
}

type MenuItemOrSeparator = Action | "separator";

export interface RibbonMenuProps {
  onClose: () => void;
}

export class RibbonMenu extends Component<RibbonMenuProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-RibbonMenu";
  static props = {
    onClose: Function,
  };

  rootItems = topbarMenuRegistry.getMenuItems();
  private menuRef = useRef("menu");

  state: State = useState({
    menuItems: this.rootItems,
    title: undefined,
    parentState: undefined,
  });

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  onExternalClick(ev: Event) {
    if (!this.menuRef.el?.contains(ev.target as HTMLElement)) {
      this.props.onClose();
    }
  }

  onClickMenu(menu: Action) {
    const children = menu.children(this.env);
    if (children.length) {
      this.state.parentState = { ...this.state };
      this.state.menuItems = children;
      this.state.title = menu.name(this.env);
    } else {
      this.state.menuItems = this.rootItems;
      this.state.title = undefined;
      this.state.parentState = undefined;
      menu.execute?.(this.env);
      this.props.onClose();
    }
  }

  isRoot(menu: Action) {
    return !menu.execute;
  }

  isEnabled(menu: Action) {
    if (menu.isEnabled(this.env)) {
      return this.env.model.getters.isReadonly() ? menu.isReadonlyAllowed : true;
    }
    return false;
  }

  isActive(menuItem: Action): boolean {
    return false;
  }

  getName(menu: Action) {
    return menu.name(this.env);
  }

  getColor(menu: Action) {
    return cssPropertiesToCss({ color: menu.textColor });
  }

  get menuItemsAndSeparators(): MenuItemOrSeparator[] {
    const menuItemsAndSeparators: MenuItemOrSeparator[] = [];
    for (let i = 0; i < this.state.menuItems.length; i++) {
      const menuItem = this.state.menuItems[i];
      if (menuItem.isVisible(this.env)) {
        menuItemsAndSeparators.push(menuItem);
      }
      if (
        menuItem.separator &&
        i !== this.state.menuItems.length - 1 && // no separator at the end
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
    return this.state.menuItems.some((menuItem) => !!this.getIconName(menuItem));
  }

  getIconColor(menu: Action) {
    return cssPropertiesToCss({ color: menu.iconColor });
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

  // TODORA support other items like in Odoo,
}
