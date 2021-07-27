import { Component, hooks, tags, useState } from "@odoo/owl";
import {
  MENU_ITEM_HEIGHT,
  MENU_SEPARATOR_BORDER_WIDTH,
  MENU_SEPARATOR_PADDING,
  MENU_WIDTH,
} from "../constants";
import { FullMenuItem } from "../registries";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { Coordinates, SpreadsheetEnv } from "../types";
import { isChildEvent } from "./helpers/dom_helpers";
import { menuComponentHeight } from "./helpers/menu";
import { usePositionInGrid } from "./helpers/position_hook";
import * as icons from "./icons";
import { Popover } from "./popover";

const { xml, css } = tags;
const { useExternalListener, useRef } = hooks;

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
    <div>
      <div class="o-menu" t-att-style="style" t-on-scroll="onScroll" t-on-wheel.stop="" t-on-click.stop="">
        <t t-foreach="props.menuItems" t-as="menuItem" t-key="menuItem.id">
          <t t-set="isMenuRoot" t-value="isRoot(menuItem)"/>
          <t t-set="isMenuEnabled" t-value="isEnabled(menuItem)"/>
          <div
            t-att-title="getName(menuItem)"
            t-att-data-name="menuItem.id"
            t-on-click="onClickMenu(menuItem, menuItem_index)"
            t-on-mouseover="onMouseOver(menuItem, menuItem_index)"
            class="o-menu-item"
            t-att-class="{
              'o-menu-root': isMenuRoot,
              'disabled': !isMenuEnabled,
            }">
            <t t-esc="getName(menuItem)"/>
            <span class="o-menu-item-shortcut" t-esc="getShortCut(menuItem)"/>
            <t t-if="isMenuRoot">
              ${icons.TRIANGLE_RIGHT_ICON}
            </t>
          </div>
          <div t-if="menuItem.separator and !menuItem_last" class="o-separator"/>
        </t>
      </div>
      <Popover
        t-if="subMenu.isOpen"
        position="subMenuPosition"
        childWidth="${MENU_WIDTH}"
        childHeight="subMenuComponentHeight"
        flipHorizontalOffset="${MENU_WIDTH}"
        flipVerticalOffset="${MENU_ITEM_HEIGHT}"
      >
        <Menu
          position="subMenuPosition"
          menuItems="subMenu.menuItems"
          depth="props.depth + 1"
          t-ref="subMenuRef"
          t-on-close="subMenu.isOpen=false"/>
      </Popover>
    </div>`;

const CSS = css/* scss */ `
  .o-menu {
    width: ${MENU_WIDTH}px;
    background-color: white;
    box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
    font-size: 13px;
    overflow-y: auto;
    padding: 5px 0px;
    .o-menu-item {
      display: flex;
      justify-content: space-between;
      box-sizing: border-box;
      height: ${MENU_ITEM_HEIGHT}px;
      padding: 7px 20px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: pointer;

      &:hover {
        background-color: #ebebeb;
      }

      &.disabled {
        color: grey;
        cursor: not-allowed;
      }

      &.o-menu-root {
        display: flex;
        justify-content: space-between;
      }
      .o-menu-item-shortcut {
        color: grey;
      }

      .o-icon {
        width: 10px;
      }
    }

    .o-separator {
      border-bottom: ${MENU_SEPARATOR_BORDER_WIDTH}px solid #e0e2e4;
      margin-top: ${MENU_SEPARATOR_PADDING}px;
      margin-bottom: ${MENU_SEPARATOR_PADDING}px;
    }
  }
`;

interface Props {
  menuItems: FullMenuItem[];
  depth: number;
}

export interface MenuState {
  isOpen: boolean;
  position: null | Coordinates;
  scrollOffset?: number;
  menuItems: FullMenuItem[];
}
export class Menu extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { Menu, Popover };
  static style = CSS;
  static defaultProps = {
    depth: 1,
  };
  private subMenu: MenuState;
  private position = usePositionInGrid();
  subMenuRef = useRef("subMenuRef");

  constructor() {
    super(...arguments);
    useExternalListener(window, "click", this.onClick);
    useExternalListener(window, "contextmenu", this.onContextMenu);
    this.subMenu = useState({
      isOpen: false,
      position: null,
      scrollOffset: 0,
      menuItems: [],
    });
  }

  get subMenuPosition(): Coordinates {
    const position = Object.assign({}, this.subMenu.position);
    position.y -= this.subMenu.scrollOffset || 0;
    return position;
  }

  get subMenuComponentHeight(): number {
    return menuComponentHeight(this.subMenu.menuItems);
  }

  get style() {
    const { height } = this.env.getters.getViewportDimension();
    return `max-height:${height}px`;
  }

  activateMenu(menu: FullMenuItem) {
    const result = menu.action(this.env);
    this.close();
    this.trigger(`menu-clicked`, result);
  }

  private close() {
    this.subMenu.isOpen = false;
    this.trigger("close");
  }

  /**
   * Return the number of pixels between the top of the menu
   * and the menu item at a given index.
   */
  private subMenuVerticalPosition(position: number): number {
    const menusAbove = this.props.menuItems.slice(0, position);
    return menuComponentHeight(menusAbove) + this.position.y;
  }

  private onClick(ev: MouseEvent) {
    // Don't close a root menu when clicked to open the submenus.
    if (this.el && isChildEvent(this.el, ev)) {
      return;
    }
    this.close();
  }

  private onContextMenu(ev: MouseEvent) {
    // Don't close a root menu when clicked to open the submenus.
    if (this.el && isChildEvent(this.el, ev)) {
      return;
    }
    this.subMenu.isOpen = false;
  }

  getName(menu: FullMenuItem) {
    return cellMenuRegistry.getName(menu, this.env);
  }
  getShortCut(menu: FullMenuItem) {
    return cellMenuRegistry.getShortCut(menu);
  }

  isRoot(menu: FullMenuItem) {
    return !menu.action;
  }

  isEnabled(menu: FullMenuItem) {
    if (menu.isEnabled(this.env)) {
      return this.env.getters.isReadonly() ? menu.isReadonlyAllowed : true;
    }
    return false;
  }

  closeSubMenus() {
    if (this.subMenuRef.comp) {
      (<Menu>this.subMenuRef.comp).closeSubMenus();
    }
    this.subMenu.isOpen = false;
  }

  onScroll(ev) {
    this.subMenu.scrollOffset = ev.target.scrollTop;
  }

  /**
   * If the given menu is not disabled, open it's submenu at the
   * correct position according to available surrounding space.
   */
  openSubMenu(menu: FullMenuItem, position: number) {
    this.closeSubMenus();
    const y = this.subMenuVerticalPosition(position);
    this.subMenu.position = {
      x: this.position.x + MENU_WIDTH,
      y: y - (this.subMenu.scrollOffset || 0),
    };
    this.subMenu.menuItems = cellMenuRegistry.getChildren(menu, this.env);
    this.subMenu.isOpen = true;
  }

  onClickMenu(menu: FullMenuItem, position: number) {
    if (this.isEnabled(menu)) {
      if (this.isRoot(menu)) {
        this.openSubMenu(menu, position);
      } else {
        this.activateMenu(menu);
      }
    }
  }

  onMouseOver(menu: FullMenuItem, position: number) {
    if (menu.isEnabled(this.env)) {
      if (this.isRoot(menu)) {
        this.openSubMenu(menu, position);
      } else {
        this.subMenu.isOpen = false;
      }
    }
  }
}
