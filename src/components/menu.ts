import { Component, hooks, tags, useState } from "@odoo/owl";
import { FullMenuItem, MenuItem } from "../registries";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { SpreadsheetEnv, Coordinates } from "../types";
import { isChildEvent } from "./helpers/dom_helpers";
import * as icons from "./icons";
import { MENU_WIDTH, MENU_ITEM_HEIGHT, MENU_SEPARATOR_BORDER_WIDTH, MENU_SEPARATOR_PADDING } from "../constants";
import { menuComponentHeight } from "./helpers/menu";
import { GridComponent } from "./grid_component";

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
      <GridComponent
        t-if="subMenu.isOpen"
        position="subMenuPosition"
        gridOrigin="gridOrigin"
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
      </GridComponent>
    </div>`;

const CSS = css/* scss */ `
  .o-menu {
    width: ${MENU_WIDTH}px;
    background-color: white;
    box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
    font-size: 13px;
    overflow-y: auto;
    z-index: 10;
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
  position: Coordinates;
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
  static components = { Menu, GridComponent };
  static style = CSS;
  static defaultProps = {
    depth: 1,
  };
  private subMenu: MenuState;
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
    return menuComponentHeight(this.subMenu.menuItems)
  }

  get gridOrigin(): Coordinates {
    return {
      x: this.props.position.x,
      y: this.props.position.y,
    }
  }

  // private get renderRight(): boolean {
  //   const { x, offsetLeft, width } = this.props.position;
  //   const offset = offsetLeft ? offsetLeft : 0;
  //   return x + offset < width - MENU_WIDTH;
  // }

  // private get renderBottom(): boolean {
  //   const { y, offsetTop, height } = this.props.position;
  //   const offset = offsetTop ? offsetTop : 0;
  //   return y + offset < height - this.menuHeight;
  // }

  // private get menuHeight(): number {
  //   const separators = this.props.menuItems.filter((m) => m.separator);
  //   const others = this.props.menuItems;
  //   return MENU_ITEM_HEIGHT * others.length + separators.length * MENU_SEPARATOR_HEIGHT;
  // }

  get style() {
    const { height } = this.env.getters.getViewportDimension();
    return `max-height:${height}px`;
    // return `${vStyle}px;${hStyle}px;${heightStyle}px`;
  }

  activateMenu(menu: FullMenuItem) {
    menu.action(this.env);
    this.close();
  }

  private close() {
    this.subMenu.isOpen = false;
    this.trigger("close");
  }

  // private menuVerticalPosition(): number {
  //   const { y, height } = this.props.position;
  //   if (this.renderBottom) {
  //     return y;
  //   }
  //   return Math.max(MENU_ITEM_HEIGHT, y - Math.min(this.menuHeight, height));
  // }

  // private subMenuHorizontalPosition(): number {
  //   const { x, width } = this.props.position;
  //   const offset = offsetLeft ? offsetLeft : 0;
  //   const spaceRight = x + 2 * MENU_WIDTH + offset < width;
  //   if (this.renderRight && spaceRight) {
  //     return x + MENU_WIDTH;
  //   } else if (this.renderRight && !spaceRight) {
  //     return x - MENU_WIDTH;
  //   }
  //   return x - (this.props.depth + 1) * MENU_WIDTH;
  // }

  private subMenuVerticalPosition(subMenuItems: MenuItem[], position: number): number {
    return this.menuItemVerticalOffset(position)
    // const { height, offsetTop } = this.props.position;
    // const offset = offsetTop ? offsetTop : 0;
    // const y = this.menuVerticalPosition() + this.menuItemVerticalOffset(position);
    // const subMenuHeight = this.computeMenuHeight(subMenuItems, height);
    // const spaceBelow = y + offset < height - subMenuHeight;
    // if (spaceBelow) {
    //   return y;
    // }
    // return Math.max(MENU_ITEM_HEIGHT - offset, y - subMenuHeight + MENU_ITEM_HEIGHT);
  }

  /**
   * Return the number of pixels between the top of the menu
   * and the menu item at a given index.
   */
  private menuItemVerticalOffset(index: number): number {
    const menusAbove = this.props.menuItems.slice(0, index);
    return menuComponentHeight(menusAbove);
    // return this.computeMenuHeight(menusAbove, this.props.position.height);
  }

  private onClick(ev: MouseEvent) {
    // Don't close a root menu when clicked to open the submenus.
    if (this.el && isChildEvent(this.el, ev)) {
      return;
    }
    this.close();
  }

  /**
   * Return the total height (in pixels) needed for some
   * menu items
   */
  // private computeMenuHeight(menuItems: MenuItem[], maxHeight: number): number {
  //   const separatorCount = menuItems.filter((menu) => menu.separator).length;
  //   return Math.min(
  //     maxHeight,
  //     menuItems.length * MENU_ITEM_HEIGHT + separatorCount * MENU_SEPARATOR_HEIGHT
  //   );
  // }

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
    this.subMenu.isOpen = true;
    this.subMenu.menuItems = cellMenuRegistry.getChildren(menu, this.env);
    const y = this.subMenuVerticalPosition(this.subMenu.menuItems, position);
    this.subMenu.position = {
      x: MENU_WIDTH,
      // x: this.subMenuHorizontalPosition(),
      y: y - (this.subMenu.scrollOffset || 0),
      // offsetTop: 0,
    };
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
