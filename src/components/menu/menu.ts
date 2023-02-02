import { Component, onWillUpdateProps, useExternalListener, useRef, useState } from "@odoo/owl";
import {
  HEADER_HEIGHT,
  MENU_ITEM_DISABLED_COLOR,
  MENU_ITEM_HEIGHT,
  MENU_SEPARATOR_HEIGHT,
  MENU_WIDTH,
  TOPBAR_HEIGHT,
} from "../../constants";
import { FullMenuItem, MenuItem } from "../../registries";
import { getMenuChildren, getMenuDescription, getMenuName } from "../../registries/menus/helpers";
import { DOMCoordinates, MenuMouseEvent, Pixel, SpreadsheetChildEnv, UID } from "../../types";
import { css } from "../helpers/css";
import { getOpenedMenus, isChildEvent } from "../helpers/dom_helpers";
import { useAbsolutePosition } from "../helpers/position_hook";
import { Popover } from "../popover/popover";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

css/* scss */ `
  .o-menu {
    background-color: white;
    padding: 5px 0px;
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
  menuItems: FullMenuItem[];
  depth: number;
  onClose: () => void;
  onMenuClicked?: (ev: CustomEvent) => void;
  menuId?: UID;
}

export interface MenuState {
  isOpen: boolean;
  parentMenu?: FullMenuItem;
  position: null | DOMCoordinates;
  scrollOffset?: Pixel;
  menuItems: FullMenuItem[];
}
export class Menu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Menu";
  MENU_WIDTH = MENU_WIDTH;

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
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    useExternalListener(window, "contextmenu", this.onExternalClick, { capture: true });
    onWillUpdateProps((nextProps: Props) => {
      if (nextProps.menuItems !== this.props.menuItems) {
        this.closeSubMenu();
      }
    });
  }

  get subMenuPosition(): DOMCoordinates {
    const position = Object.assign({}, this.subMenu.position);
    position.y -= this.subMenu.scrollOffset || 0;
    return position;
  }

  get menuHeight(): Pixel {
    return this.menuComponentHeight(this.props.menuItems);
  }

  get subMenuHeight(): Pixel {
    return this.menuComponentHeight(this.subMenu.menuItems);
  }

  get popover() {
    const isRoot = this.props.depth === 1;
    let marginTop = 6;
    if (!this.env.isDashboard()) {
      marginTop += TOPBAR_HEIGHT + HEADER_HEIGHT;
    }
    return {
      // some margin between the header and the component
      marginTop,
      flipHorizontalOffset: MENU_WIDTH * (this.props.depth - 1),
      flipVerticalOffset: isRoot ? 0 : MENU_ITEM_HEIGHT,
    };
  }

  getColor(menu: FullMenuItem) {
    return menu.textColor ? `color: ${menu.textColor}` : undefined;
  }

  async activateMenu(menu: FullMenuItem) {
    const result = await menu.action(this.env);
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
  private subMenuVerticalPosition(position: Pixel): Pixel {
    const menusAbove = this.props.menuItems.slice(0, position);
    return this.menuComponentHeight(menusAbove) + this.position.y;
  }

  private onExternalClick(ev: MenuMouseEvent) {
    // Don't close a root menu when clicked to open the submenus.
    const el = this.menuRef.el;
    if (el && getOpenedMenus().some((el) => isChildEvent(el, ev))) {
      return;
    }
    ev.closedMenuId = this.props.menuId;
    this.close();
  }

  /**
   * Return the total height (in pixels) needed for some
   * menu items
   */
  private menuComponentHeight(menuItems: MenuItem[]): Pixel {
    const separators = menuItems.filter((m) => m.separator);
    const others = menuItems;
    return MENU_ITEM_HEIGHT * others.length + separators.length * MENU_SEPARATOR_HEIGHT;
  }

  getName(menu: FullMenuItem) {
    return getMenuName(menu, this.env);
  }
  getDescription(menu: FullMenuItem) {
    return getMenuDescription(menu);
  }

  isRoot(menu: FullMenuItem) {
    return !menu.action;
  }

  isEnabled(menu: FullMenuItem) {
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
  openSubMenu(menu: FullMenuItem, position: Pixel) {
    const y = this.subMenuVerticalPosition(position);
    this.subMenu.position = {
      x: this.position.x + MENU_WIDTH,
      y: y - (this.subMenu.scrollOffset || 0),
    };
    this.subMenu.menuItems = getMenuChildren(menu, this.env).filter(
      (item) => !item.isVisible || item.isVisible(this.env)
    );
    this.subMenu.isOpen = true;
    this.subMenu.parentMenu = menu;
  }

  isParentMenu(subMenu: MenuState, menuItem: FullMenuItem) {
    return subMenu.parentMenu?.id === menuItem.id;
  }

  closeSubMenu() {
    this.subMenu.isOpen = false;
    this.subMenu.parentMenu = undefined;
  }

  onClickMenu(menu: FullMenuItem, position: Pixel) {
    if (this.isEnabled(menu)) {
      if (this.isRoot(menu)) {
        this.openSubMenu(menu, position);
      } else {
        this.activateMenu(menu);
      }
    }
  }

  onMouseOver(menu: FullMenuItem, position: Pixel) {
    if (menu.isEnabled(this.env)) {
      if (this.isRoot(menu)) {
        this.openSubMenu(menu, position);
      } else {
        this.closeSubMenu();
      }
    }
  }
}
