import * as icons from "../icons";
import { Component, tags, useState, hooks } from "@odoo/owl";
import { SpreadsheetEnv } from "../../types";
import {
  ActionContextMenuItem,
  ContextMenuItem,
  RootContextMenuItem,
} from "./context_menu_registry";

const { xml, css } = tags;
const { useExternalListener } = hooks;

const MENU_WIDTH = 180;
const MENU_ITEM_HEIGHT = 36;
const SEPARATOR_HEIGHT = 1;

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
    <div>
      <div class="o-context-menu" t-att-style="style">
        <t t-foreach="props.menuItems" t-as="menuItem" t-key="menuItem.name">
          <t t-set="isEnabled" t-value="!menuItem.isEnabled or menuItem.isEnabled(env.getters.getActiveCell())"/>
          <div
            t-if="menuItem.type === 'action'"
            t-att-data-name="menuItem.name"
            t-on-click="activateMenu(menuItem)"
            t-on-mouseover="subMenu.isOpen = false"
            class="o-menuitem"
            t-att-class="{disabled: !isEnabled}">
              <t t-esc="menuItem.description"/>
          </div>
          <div
            t-elif="menuItem.type === 'root'"
            t-att-data-name="menuItem.name"
            t-on-click="openSubMenu(menuItem, menuItem_index)"
            t-on-mouseover="openSubMenu(menuItem, menuItem_index)"
            class="o-menuitem root-menu"
            t-att-class="{disabled: !isEnabled}">
              <t t-esc="menuItem.description"/>
              ${icons.TRIANGLE_RIGHT_ICON}
          </div>
          <div t-else="" class="o-menuitem separator" />
        </t>
      </div>
      <ContextMenu t-if="subMenu.isOpen"
        position="subMenu.position"
        menuItems="subMenu.menuItems"
        depth="props.depth + 1"
        t-on-close="subMenu.isOpen=false"/>
    </div>`;

const CSS = css/* scss */ `
  .o-context-menu {
    position: absolute;
    width: ${MENU_WIDTH}px;
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    font-size: 14px;
    .o-menuitem {
      box-sizing: border-box;
      height: ${MENU_ITEM_HEIGHT}px;
      padding: 10px 25px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: pointer;

      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }

      &.disabled {
        color: grey;
      }

      &.separator {
        height: ${SEPARATOR_HEIGHT}px;
        background-color: rgba(0, 0, 0, 0.12);
        margin: 0 8px;
        padding: 0;
      }

      &.root-menu {
        display: flex;
        justify-content: space-between;
      }
    }
  }
`;

interface Props {
  position: { x: number; y: number; width: number; height: number };
  menuItems: ContextMenuItem[];
  depth: number;
}

export interface MenuState {
  isOpen: boolean;
  position: null | { x: number; y: number; width: number; height: number };
  menuItems: ContextMenuItem[];
}

export class ContextMenu extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { ContextMenu };
  static style = CSS;
  static defaultProps = {
    depth: 1,
  };
  private subMenu: MenuState;

  constructor() {
    super(...arguments);
    useExternalListener(window, "click", this.onClick);
    useExternalListener(window, "contextmenu", this.onContextMenu);
    this.subMenu = useState({
      isOpen: false,
      position: null,
      menuItems: [],
    });
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
    const separators = this.props.menuItems.filter((m) => m.type === "separator");
    const others = this.props.menuItems.filter((m) => m.type !== "separator");
    return MENU_ITEM_HEIGHT * others.length + separators.length * SEPARATOR_HEIGHT;
  }

  get style() {
    const { x, y } = this.props.position;
    const hStyle = `left:${this.renderRight ? x : x - MENU_WIDTH}`;
    const vStyle = `top:${this.renderBottom ? y : y - this.menuHeight}`;
    return `${vStyle}px;${hStyle}px`;
  }

  activateMenu(menu: ActionContextMenuItem) {
    if (!menu.isEnabled || menu.isEnabled(this.env.getters.getActiveCell())) {
      menu.action(this.env);
      this.close();
    }
  }

  private close() {
    this.subMenu.isOpen = false;
    this.trigger("close");
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
    const y = this.props.position.y + this.menuItemVerticalOffset(position);
    const subMenuHeight = menuCount * MENU_ITEM_HEIGHT;
    const spaceBelow = y < height - subMenuHeight;
    if (this.renderBottom && spaceBelow) {
      return y;
    } else if (this.renderBottom && !spaceBelow) {
      return y - subMenuHeight + MENU_ITEM_HEIGHT;
    }
    return y - this.menuHeight;
  }

  /**
   * Return the number of pixels between the top of the menu
   * and the menu item at a given index.
   */
  private menuItemVerticalOffset(index: number): number {
    return this.props.menuItems
      .slice(0, index)
      .reduce(
        (offset, item) =>
          offset + (item.type === "separator" ? SEPARATOR_HEIGHT : MENU_ITEM_HEIGHT),
        0
      );
  }

  /**
   * Return true if the event was triggered from
   * a child element.
   */
  private isChildEvent(ev: Event) {
    return ev.target && this.el!.contains(ev.target as Node);
  }

  private onClick(ev: MouseEvent) {
    // Don't close a root menu when clicked to open the submenus.
    if (this.isChildEvent(ev)) {
      return;
    }
    this.close();
  }

  private onContextMenu(ev: MouseEvent) {
    // Don't close a root menu when clicked to open the submenus.
    if (this.isChildEvent(ev)) {
      return;
    }
    this.subMenu.isOpen = false;
  }

  /**
   * If the given menu is not disabled, open it's submenu at the
   * correct position according to available surrounding space.
   */
  openSubMenu(menu: RootContextMenuItem, position: number, delay: number) {
    if (!menu.isEnabled || menu.isEnabled(this.env.getters.getActiveCell())) {
      this.subMenu.isOpen = true;
      this.subMenu.menuItems = menu.subMenus(this.env);
      const { width, height } = this.props.position;
      this.subMenu.position = {
        x: this.subMenuHorizontalPosition(),
        y: this.subMenuVerticalPosition(this.subMenu.menuItems.length, position),
        height,
        width,
      };
    }
  }
}
