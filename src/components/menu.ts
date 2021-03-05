import { Component, hooks, tags } from "@odoo/owl";
import { FullMenuItem } from "../registries";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { SpreadsheetEnv } from "../types";
import { hasSomeParentTheClass } from "./helpers/dom_helpers";
import * as icons from "./icons";

const { xml, css } = tags;
const { useExternalListener, useState } = hooks;

const MENU_WIDTH = 200;
const MENU_ITEM_HEIGHT = 32;
const SEPARATOR_HEIGHT = 1;

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-menu" t-att-style="style" t-on-scroll="onScroll" t-on-wheel.stop="">
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
        <span class="o-menu-item-shortcut" t-esc="getShortCut(menuItem)"/>
        <t t-if="isMenuRoot">
          ${icons.TRIANGLE_RIGHT_ICON}
        </t>
      </div>
      <Menu
        class="o-menu-submenu"
        t-if="isSubMenuOpen(menuItem_index)"
        position="getSubMenuPosition(menuItem, menuItem_index)"
        menuItems="getSubMenuItems(menuItem)"
        depth="props.depth + 1"
      />
    </t>
  </div>
`;

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
    user-select: none;
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

      &.o-separator {
        border-bottom: ${SEPARATOR_HEIGHT}px solid #e0e2e4;
      }

      &.o-menu-root {
        display: flex;
        justify-content: space-between;
      }
      .o-menu-item-shortcut {
        color: grey;
      }
    }
  }
  .o-menu-submenu {
    position: fixed;
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

interface State {
  openedMenuIndex: number;
  scrollVerticalOffset: number;
}

export class Menu extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { Menu };
  static style = CSS;
  static defaultProps = {
    depth: 1,
  };

  state: State = useState({
    openedMenuIndex: -1,
    scrollVerticalOffset: 0,
  });

  constructor() {
    super(...arguments);
    useExternalListener(window, "click", this.onClick);
    useExternalListener(window, "contextmenu", this.onContextMenu);
  }

  private onContextMenu() {
    this.state.openedMenuIndex = -1;
  }

  private onClick(ev: MouseEvent) {
    if (hasSomeParentTheClass(ev.target as HTMLElement, "o-menu-item")) {
      return;
    }
    this.close();
  }

  get style() {
    const { height } = this.props.position;
    const hStyle = `left:${this.menuHorizontalPosition}`;
    const vStyle = `top:${this.menuVerticalPosition}`;
    const heightStyle = `max-height:${height}`;
    return `${vStyle}px;${hStyle}px;${heightStyle}px`;
  }

  // ---------------------------------------------------------------------------
  //  Menu geter/methode
  // ---------------------------------------------------------------------------

  private get renderRight(): boolean {
    const { x, width } = this.props.position;
    return x < width - MENU_WIDTH;
  }

  private get menuHeight(): number {
    const separators = this.props.menuItems.filter((m) => m.separator);
    const others = this.props.menuItems;
    return MENU_ITEM_HEIGHT * others.length + separators.length * SEPARATOR_HEIGHT;
  }

  private get renderBottom(): boolean {
    const { y, height } = this.props.position;
    return y < height - this.menuHeight;
  }

  private get menuHorizontalPosition(): number {
    const { x } = this.props.position;
    return this.renderRight ? x : x - MENU_WIDTH;
  }

  private get menuVerticalPosition(): number {
    const { y, height } = this.props.position;
    if (this.renderBottom) {
      return y;
    }
    return Math.max(MENU_ITEM_HEIGHT, y - Math.min(this.menuHeight, height));
  }

  private close() {
    this.state.openedMenuIndex = -1;
    this.trigger("close");
  }

  activateMenu(menu: FullMenuItem) {
    menu.action(this.env);
    this.close();
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
    return menu.isEnabled(this.env);
  }

  onClickMenu(menu: FullMenuItem) {
    if (menu.isEnabled(this.env) && !this.isRoot(menu)) {
      this.activateMenu(menu);
    }
  }

  onMouseOver(menu: FullMenuItem, position: number) {
    this.state.openedMenuIndex = -1;
    if (menu.isEnabled(this.env)) {
      if (this.isRoot(menu)) {
        this.state.openedMenuIndex = position;
      }
    }
  }

  onScroll(ev) {
    this.state.scrollVerticalOffset = ev.target.scrollTop;
  }

  // ---------------------------------------------------------------------------
  //  Sub menu methode
  // ---------------------------------------------------------------------------

  isSubMenuOpen(menuItemIndex: number): boolean {
    return this.state.openedMenuIndex === menuItemIndex;
  }

  getSubMenuItems(menu: FullMenuItem): FullMenuItem[] {
    return cellMenuRegistry.getChildren(menu, this.env);
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

  /**
   * Return the number of pixels between the top of the menu
   * and the menu item at a given index.
   */
  private menuItemVerticalOffset(index: number): number {
    return this.props.menuItems.slice(0, index).length * MENU_ITEM_HEIGHT;
  }

  private subMenuVerticalPosition(menuCount: number, position: number): number {
    const { height } = this.props.position;
    const y = this.menuVerticalPosition + this.menuItemVerticalOffset(position);
    const subMenuHeight = menuCount * MENU_ITEM_HEIGHT;
    const spaceBelow = y < height - subMenuHeight;
    if (spaceBelow) {
      return y;
    }
    return Math.max(MENU_ITEM_HEIGHT, y - subMenuHeight + MENU_ITEM_HEIGHT);
  }

  getSubMenuPosition(menu: FullMenuItem, position: number): MenuPosition {
    const { width, height } = this.props.position;
    return {
      x: this.subMenuHorizontalPosition(),
      y:
        this.subMenuVerticalPosition(this.getSubMenuItems(menu).length, position) -
        this.state.scrollVerticalOffset,
      height,
      width,
    };
  }
}
