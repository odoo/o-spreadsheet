import { Component, onWillUpdateProps, useExternalListener, useRef, useState } from "@odoo/owl";
import {
  DISABLED_TEXT_COLOR,
  MENU_ITEM_HEIGHT,
  MENU_SEPARATOR_HEIGHT,
  MENU_VERTICAL_PADDING,
  MENU_WIDTH,
} from "../../constants";
import { getMenuChildren, getMenuDescription, getMenuName } from "../../registries/menus/helpers";
import { FullMenuItem, MenuItem } from "../../registries/menu_items_registry";
import { DOMCoordinates, MenuMouseEvent, Pixel, SpreadsheetChildEnv, UID } from "../../types";
import { css } from "../helpers/css";
import { getOpenedMenus, isChildEvent } from "../helpers/dom_helpers";
import { useAbsoluteBoundingRect } from "../helpers/position_hook";
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
        color: ${DISABLED_TEXT_COLOR};
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
  private position: DOMCoordinates = useAbsoluteBoundingRect(this.menuRef);

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    useExternalListener(window, "contextmenu", this.onExternalClick, { capture: true });
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

    return 2 * MENU_VERTICAL_PADDING + menuItemsHeight;
  }

  get popoverProps(): PopoverProps {
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
      onPopoverHidden: () => this.closeSubMenu(),
      onPopoverMoved: () => this.closeSubMenu(),
      maxHeight: this.menuHeight,
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
  private subMenuVerticalPosition(menuIndex: number): Pixel {
    const menusAbove = this.visibleMenuItems.slice(0, menuIndex);
    return this.position.y + this.getMenuItemsHeight(menusAbove) + MENU_VERTICAL_PADDING;
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

  private getMenuItemsHeight(menuItems: MenuItem[]): Pixel {
    const numberOfSeparators = menuItems.filter((m) => m.separator).length;
    return MENU_ITEM_HEIGHT * menuItems.length + MENU_SEPARATOR_HEIGHT * numberOfSeparators;
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
  openSubMenu(menu: FullMenuItem, menuIndex: number) {
    const y = this.subMenuVerticalPosition(menuIndex);
    this.subMenu.position = {
      x: this.position.x + this.props.depth * MENU_WIDTH,
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

  onClickMenu(menu: FullMenuItem, menuIndex: number) {
    if (this.isEnabled(menu)) {
      if (this.isRoot(menu)) {
        this.openSubMenu(menu, menuIndex);
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

Menu.props = {
  position: Object,
  menuItems: Array,
  depth: { type: Number, optional: true },
  onClose: Function,
  onMenuClicked: { type: Function, optional: true },
  menuId: { type: String, optional: true },
};
