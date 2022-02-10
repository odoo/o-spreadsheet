import {
  Component,
  onWillUpdateProps,
  useExternalListener,
  useRef,
  useState,
  xml,
} from "@odoo/owl";
import {
  HEADER_HEIGHT,
  MENU_ITEM_DISABLED_COLOR,
  MENU_ITEM_HEIGHT,
  MENU_SEPARATOR_BORDER_WIDTH,
  MENU_SEPARATOR_HEIGHT,
  MENU_SEPARATOR_PADDING,
  MENU_WIDTH,
  TOPBAR_HEIGHT,
} from "../constants";
import { FullMenuItem, MenuItem } from "../registries";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { DOMCoordinates, SpreadsheetChildEnv } from "../types";
import { css } from "./helpers/css";
import { isChildEvent } from "./helpers/dom_helpers";
import { useAbsolutePosition } from "./helpers/position_hook";
import * as icons from "./icons";
import { Popover } from "./popover";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
    <Popover
      position="props.position"
      childWidth="${MENU_WIDTH}"
      childHeight="menuHeight"
      flipHorizontalOffset="popover.flipHorizontalOffset"
      flipVerticalOffset="popover.flipVerticalOffset"
      marginTop="popover.marginTop"
      >
      <div t-ref="menu" class="o-menu" t-on-scroll="onScroll" t-on-wheel.stop="" t-on-click.stop="">
        <t t-foreach="props.menuItems" t-as="menuItem" t-key="menuItem.id">
          <t t-set="isMenuRoot" t-value="isRoot(menuItem)"/>
          <t t-set="isMenuEnabled" t-value="isEnabled(menuItem)"/>
          <div
            t-att-title="getName(menuItem)"
            t-att-data-name="menuItem.id"
            t-on-click="() => this.onClickMenu(menuItem, menuItem_index)"
            t-on-mouseover="() => this.onMouseOver(menuItem, menuItem_index)"
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
            <t t-elif="menuItem.icon">
              <i t-att-class="menuItem.icon" class="o-menu-item-icon"/>
            </t>
          </div>
          <div t-if="menuItem.separator and !menuItem_last" class="o-separator"/>
        </t>
      </div>
      <Menu t-if="subMenu.isOpen"
        position="subMenuPosition"
        menuItems="subMenu.menuItems"
        depth="props.depth + 1"
        onMenuClicked="props.onMenuClicked"
        onClose="() => this.close()"/>
    </Popover>`;

css/* scss */ `
  .o-menu {
    background-color: white;
    padding: 8px 0px;
    .o-menu-item {
      display: flex;
      justify-content: space-between;
      box-sizing: border-box;
      height: ${MENU_ITEM_HEIGHT}px;
      padding: 4px 16px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: pointer;
      user-select: none;

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
        &:hover {
          background-color: #ebebeb;
        }
        .o-menu-item-shortcut {
          color: grey;
        }
      }
      &.disabled {
        color: ${MENU_ITEM_DISABLED_COLOR};
        cursor: not-allowed;
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
  position: DOMCoordinates;
  menuItems: FullMenuItem[];
  depth: number;
  onClose: () => void;
  onMenuClicked?: (ev: CustomEvent) => void;
}

export interface MenuState {
  isOpen: boolean;
  position: null | DOMCoordinates;
  scrollOffset?: number;
  menuItems: FullMenuItem[];
}
export class Menu extends Component<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;
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
        this.subMenu.isOpen = false;
      }
    });
  }

  get subMenuPosition(): DOMCoordinates {
    const position = Object.assign({}, this.subMenu.position);
    position.y -= this.subMenu.scrollOffset || 0;
    return position;
  }

  get menuHeight(): number {
    return this.menuComponentHeight(this.props.menuItems);
  }

  get subMenuHeight(): number {
    return this.menuComponentHeight(this.subMenu.menuItems);
  }

  get popover() {
    const isRoot = this.props.depth === 1;
    return {
      // some margin between the header and the component
      marginTop: HEADER_HEIGHT + 6 + TOPBAR_HEIGHT,
      flipHorizontalOffset: MENU_WIDTH * (this.props.depth - 1),
      flipVerticalOffset: isRoot ? 0 : MENU_ITEM_HEIGHT,
    };
  }

  async activateMenu(menu: FullMenuItem) {
    const result = await menu.action(this.env);
    this.close();
    this.props.onMenuClicked?.({ detail: result } as CustomEvent);
  }

  private close() {
    this.subMenu.isOpen = false;
    this.props.onClose();
  }

  /**
   * Return the number of pixels between the top of the menu
   * and the menu item at a given index.
   */
  private subMenuVerticalPosition(position: number): number {
    const menusAbove = this.props.menuItems.slice(0, position);
    return this.menuComponentHeight(menusAbove) + this.position.y;
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
    this.subMenu.isOpen = false;
  }

  /**
   * Return the total height (in pixels) needed for some
   * menu items
   */
  private menuComponentHeight(menuItems: MenuItem[]): number {
    const separators = menuItems.filter((m) => m.separator);
    const others = menuItems;
    return MENU_ITEM_HEIGHT * others.length + separators.length * MENU_SEPARATOR_HEIGHT;
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
  openSubMenu(menu: FullMenuItem, position: number) {
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
