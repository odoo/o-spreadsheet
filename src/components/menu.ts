import { Component, hooks, tags, useState } from "@odoo/owl";
import { FullMenuItem } from "../registries";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { SpreadsheetEnv } from "../types";
import { isChildEvent } from "./helpers/dom_helpers";
import * as icons from "./icons";

const { xml, css } = tags;
const { useExternalListener, useRef } = hooks;

const MENU_WIDTH = 200;
const MENU_ITEM_HEIGHT = 32;
const SEPARATOR_HEIGHT = 1;

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
    <div>
      <div class="o-menu" t-att-style="style" t-on-scroll="onScroll" t-on-wheel.stop="" t-on-contextmenu.prevent="">
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
              'o-separator': menuItem.separator and !menuItem_last,
              'disabled': !isMenuEnabled,
            }">
            <t t-esc="getName(menuItem)"/>
            <t t-if="isMenuRoot">
              ${icons.TRIANGLE_RIGHT_ICON}
            </t>
          </div>
        </t>
      </div>
      <Menu t-if="subMenu.isOpen"
        position="subMenuPosition"
        menuItems="subMenu.menuItems"
        depth="props.depth + 1"
        t-ref="subMenuRef"
        t-on-close="subMenu.isOpen=false"/>
    </div>`;

const CSS = css/* scss */ `
  .o-menu {
    position: absolute;
    width: ${MENU_WIDTH}px;
    background-color: white;
    box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
    font-size: 13px;
    overflow-y: auto;
    z-index: 10;
    padding: 5px 0px;
    .o-menu-item {
      box-sizing: border-box;
      height: ${MENU_ITEM_HEIGHT}px;
      padding: 7px 20px;
      padding-right: 2px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: pointer;
      user-select: none;

      &:hover {
        background-color: #ebebeb;
      }

      &.disabled {
        color: grey;
        cursor: not-allowed;
      }

      &.o-separator {
        border-bottom: ${SEPARATOR_HEIGHT}px solid #e0e2e4;
      }

      &.o-menu-root {
        display: flex;
        justify-content: space-between;
      }
    }
  }
`;

interface MenuPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  position: MenuPosition;
  menuItems: FullMenuItem[];
  depth: number;
}

export interface MenuState {
  isOpen: boolean;
  position: null | MenuPosition;
  scrollOffset?: number;
  menuItems: FullMenuItem[];
}

export class Menu extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { Menu };
  static style = CSS;
  static defaultProps = {
    depth: 1,
  };
  private subMenu: MenuState;
  private subMenuRef = useRef("subMenuRef");

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

  get subMenuPosition(): MenuPosition {
    const position = Object.assign({}, this.subMenu.position);
    position.y -= this.subMenu.scrollOffset || 0;
    return position;
  }

  private get renderRight(): boolean {
    const { x, width } = this.props.position;
    return x < width - MENU_WIDTH;
  }

  private get renderBottom(): boolean {
    const { y, height } = this.props.position;
    return y < height - this.menuHeight;
  }

  private get menuHeight(): number {
    const separators = this.props.menuItems.filter((m) => m.separator);
    const others = this.props.menuItems;
    return MENU_ITEM_HEIGHT * others.length + separators.length * SEPARATOR_HEIGHT;
  }

  get style() {
    const { x, height } = this.props.position;
    const hStyle = `left:${this.renderRight ? x : x - MENU_WIDTH}`;
    const vStyle = `top:${this.menuVerticalPosition()}`;
    const heightStyle = `max-height:${height}`;
    return `${vStyle}px;${hStyle}px;${heightStyle}px`;
  }

  activateMenu(menu: FullMenuItem) {
    menu.action(this.env);
    this.close();
  }

  private close() {
    this.subMenu.isOpen = false;
    this.trigger("close");
  }

  private menuVerticalPosition(): number {
    const { y, height } = this.props.position;
    if (this.renderBottom) {
      return y;
    }
    return Math.max(MENU_ITEM_HEIGHT, y - Math.min(this.menuHeight, height));
  }

  private subMenuHorizontalPosition(): number {
    const { x, width } = this.props.position;
    const spaceRight = x + 2 * MENU_WIDTH < width;
    if (this.renderRight && spaceRight) {
      return x + MENU_WIDTH;
    } else if (this.renderRight && !spaceRight) {
      return x - MENU_WIDTH;
    }
    return x - (this.props.depth + 1) * MENU_WIDTH;
  }

  private subMenuVerticalPosition(menuCount: number, position: number): number {
    const { height } = this.props.position;
    const y = this.menuVerticalPosition() + this.menuItemVerticalOffset(position);
    const subMenuHeight = menuCount * MENU_ITEM_HEIGHT;
    const spaceBelow = y < height - subMenuHeight;
    if (spaceBelow) {
      return y;
    }
    return Math.max(MENU_ITEM_HEIGHT, y - subMenuHeight + MENU_ITEM_HEIGHT);
  }

  /**
   * Return the number of pixels between the top of the menu
   * and the menu item at a given index.
   */
  private menuItemVerticalOffset(index: number): number {
    return this.props.menuItems.slice(0, index).length * MENU_ITEM_HEIGHT;
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

  isRoot(menu: FullMenuItem) {
    return !menu.action;
  }

  isEnabled(menu: FullMenuItem) {
    return menu.isEnabled(this.env);
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
    this.subMenu.isOpen = true;
    this.subMenu.menuItems = cellMenuRegistry.getChildren(menu, this.env);
    const { width, height } = this.props.position;
    this.subMenu.position = {
      x: this.subMenuHorizontalPosition(),
      y: this.subMenuVerticalPosition(this.subMenu.menuItems.length, position),
      height,
      width,
    };
  }

  onClickMenu(menu: FullMenuItem, position: number) {
    if (menu.isEnabled(this.env)) {
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
