import { Component, onWillUpdateProps, useExternalListener, useRef, useState } from "@odoo/owl";
import {
  MENU_ITEM_DISABLED_COLOR,
  MENU_ITEM_HEIGHT,
  MENU_SEPARATOR_HEIGHT,
  MENU_VERTICAL_PADDING,
  MENU_WIDTH,
} from "../../constants";
import { MenuItem } from "../../registries/menu_items_registry";
import { DOMCoordinates, Pixel, SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers/css";
import { isChildEvent } from "../helpers/dom_helpers";
import { useAbsolutePosition } from "../helpers/position_hook";
import { Popover, PopoverProps } from "../popover/popover";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

css/* scss */ `
  .o-menu {
    background-color: white;
    padding: ${MENU_VERTICAL_PADDING}px 0px;
    width: ${MENU_WIDTH}px;
    box-sizing: border-box !important;

    .o-menu-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-sizing: border-box;
      height: ${MENU_ITEM_HEIGHT}px;
      padding: 4px 16px;
      cursor: pointer;
      user-select: none;

      .o-menu-item-name {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      &.o-menu-root {
        display: flex;
        justify-content: space-between;
      }
      .o-menu-item-icon {
        margin-top: auto;
        margin-bottom: auto;
      }
      .o-icon {
        width: 10px;
      }

      &:not(.disabled) {
        &:hover,
        &.o-menu-item-active {
          background-color: #ebebeb;
        }
        .o-menu-item-description {
          color: grey;
        }
      }
      &.disabled {
        color: ${MENU_ITEM_DISABLED_COLOR};
        cursor: not-allowed;
      }
    }
  }
`;

interface Props {
  position: DOMCoordinates;
  menuItems: MenuItem[];
  depth: number;
  maxHeight?: Pixel;
  onClose: () => void;
  onMenuClicked?: (ev: CustomEvent) => void;
}

export interface MenuState {
  isOpen: boolean;
  parentMenu?: MenuItem;
  position: null | DOMCoordinates;
  scrollOffset?: Pixel;
  menuItems: MenuItem[];
}
export class Menu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Menu";

  static components = { Menu, Popover };
  static defaultProps = {
    depth: 1,
  };
  private subMenu: MenuState = useState({
    isOpen: false,
    position: null,
    scrollOffset: 0,
    menuItems: [],
  });
  private menuRef = useRef("menu");
  private position = useAbsolutePosition(this.menuRef);

  setup() {
    useExternalListener(window, "click", this.onClick);
    useExternalListener(window, "contextmenu", this.onContextMenu);
    onWillUpdateProps((nextProps: Props) => {
      if (nextProps.menuItems !== this.props.menuItems) {
        this.closeSubMenu();
      }
    });
  }

  get visibleMenuItems(): MenuItem[] {
    return this.props.menuItems.filter((x) => x.isVisible(this.env));
  }

  get subMenuPosition(): DOMCoordinates {
    const position = Object.assign({}, this.subMenu.position);
    position.y -= this.subMenu.scrollOffset || 0;
    return position;
  }

  get menuHeight(): Pixel {
    const menuItems = this.visibleMenuItems;

    let menuItemsHeight = this.getMenuItemsHeight(menuItems);

    // We don't display separator at the end of a menu
    if (menuItems[menuItems.length - 1].separator) {
      menuItemsHeight -= MENU_SEPARATOR_HEIGHT;
    }

    const menuHeight = 2 * MENU_VERTICAL_PADDING + menuItemsHeight;
    return this.props.maxHeight ? Math.min(menuHeight, this.props.maxHeight) : menuHeight;
  }

  get popover(): PopoverProps {
    const isRoot = this.props.depth === 1;
    return {
      anchorRect: {
        x: this.props.position.x - MENU_WIDTH * (this.props.depth - 1),
        y: this.props.position.y,
        width: isRoot ? 0 : MENU_WIDTH,
        height: isRoot ? 0 : MENU_ITEM_HEIGHT,
      },
      positioning: "TopRight",
      verticalOffset: isRoot ? 0 : MENU_VERTICAL_PADDING,
    };
  }

  getColor(menu: MenuItem) {
    return menu.textColor ? `color: ${menu.textColor}` : undefined;
  }

  async activateMenu(menu: MenuItem) {
    const result = await menu.action?.(this.env);
    this.close();
    this.props.onMenuClicked?.({ detail: result } as CustomEvent);
  }

  private close() {
    this.closeSubMenu();
    this.props.onClose();
  }

  /**
   * Return the number of pixels between the top of the menu
   * and the menu item at a given index.
   */
  private subMenuVerticalPosition(menuIndex: number): Pixel {
    const menusAbove = this.visibleMenuItems.slice(0, menuIndex);
    return this.position.y + this.getMenuItemsHeight(menusAbove) + MENU_VERTICAL_PADDING;
  }

  private onClick(ev: MouseEvent) {
    // Don't close a root menu when clicked to open the submenus.
    const el = this.menuRef.el;
    if (el && isChildEvent(el, ev)) {
      return;
    }
    this.close();
  }

  private onContextMenu(ev: MouseEvent) {
    // Don't close a root menu when clicked to open the submenus.
    const el = this.menuRef.el;
    if (el && isChildEvent(el, ev)) {
      return;
    }
    this.closeSubMenu();
  }

  private getMenuItemsHeight(menuItems: MenuItem[]): Pixel {
    const numberOfSeparators = menuItems.filter((m) => m.separator).length;
    return MENU_ITEM_HEIGHT * menuItems.length + MENU_SEPARATOR_HEIGHT * numberOfSeparators;
  }

  getName(menu: MenuItem) {
    return menu.name(this.env);
  }

  isRoot(menu: MenuItem) {
    return !menu.action;
  }

  isEnabled(menu: MenuItem) {
    if (menu.isEnabled(this.env)) {
      return this.env.model.getters.isReadonly() ? menu.isReadonlyAllowed : true;
    }
    return false;
  }

  onScroll(ev) {
    this.subMenu.scrollOffset = ev.target.scrollTop;
  }

  /**
   * If the given menu is not disabled, open it's submenu at the
   * correct position according to available surrounding space.
   */
  openSubMenu(menu: MenuItem, menuIndex: number) {
    const y = this.subMenuVerticalPosition(menuIndex);
    this.subMenu.position = {
      x: this.position.x + MENU_WIDTH,
      y: y - (this.subMenu.scrollOffset || 0),
    };
    this.subMenu.menuItems = menu.children(this.env);
    this.subMenu.isOpen = true;
    this.subMenu.parentMenu = menu;
  }

  isParentMenu(subMenu: MenuState, menuItem: MenuItem) {
    return subMenu.parentMenu?.id === menuItem.id;
  }

  closeSubMenu() {
    this.subMenu.isOpen = false;
    this.subMenu.parentMenu = undefined;
  }

  onClickMenu(menu: MenuItem, menuIndex: number) {
    if (this.isEnabled(menu)) {
      if (this.isRoot(menu)) {
        this.openSubMenu(menu, menuIndex);
      } else {
        this.activateMenu(menu);
      }
    }
  }

  onMouseOver(menu: MenuItem, position: Pixel) {
    if (menu.isEnabled(this.env)) {
      if (this.isRoot(menu)) {
        this.openSubMenu(menu, position);
      } else {
        this.closeSubMenu();
      }
    }
  }
}

Menu.props = {
  position: Object,
  menuItems: Array,
  depth: { type: Number, optional: true },
  maxHeight: { type: Number, optional: true },
  onClose: Function,
  onMenuClicked: { type: Function, optional: true },
};
