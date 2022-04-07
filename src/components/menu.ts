import { useExternalListener, useRef, xml } from "@odoo/owl";
import {
  MENU_ITEM_DISABLED_COLOR,
  MENU_ITEM_HEIGHT,
  MENU_SEPARATOR_BORDER_WIDTH,
  MENU_SEPARATOR_PADDING,
  MENU_WIDTH,
} from "../constants";
import { FullMenuItem } from "../registries";
import { cellMenuRegistry } from "../registries/menus/cell_menu_registry";
import { MenuStore } from "../stores/context_menu_store";
import { ConsumerComponent } from "../stores/providers";
import { DOMCoordinates, SpreadsheetChildEnv } from "../types";
import { css } from "./helpers/css";
import { isChildEvent } from "./helpers/dom_helpers";
import * as icons from "./icons";
import { Popover } from "./popover";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
    <Popover
      t-if="state.isOpen"
      position="state.position"
      childWidth="${MENU_WIDTH}"
      childHeight="state.menuHeight"
      flipHorizontalOffset="state.popoverProps.flipHorizontalOffset"
      flipVerticalOffset="state.popoverProps.flipVerticalOffset"
      marginTop="state.popoverProps.marginTop"
      >
      <div t-ref="menu" class="o-menu" t-on-scroll="onScroll" t-on-wheel.stop="" t-on-click.stop="">
        <t t-foreach="state.menuItems" t-as="menuItem" t-key="menuItem.id">
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
      <Menu t-if="state.subMenu.state.isOpen"
        store="state.subMenu"
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
  store: MenuStore;
  onClose: () => void;
  onMenuClicked?: (ev: CustomEvent) => void;
}

export interface MenuState {
  isOpen: boolean;
  position: null | DOMCoordinates;
  scrollOffset?: number;
  menuItems: FullMenuItem[];
}
export class Menu extends ConsumerComponent<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;
  static components = { Menu, Popover };
  static defaultProps = {
    onClose: () => {},
  };
  private menuRef = useRef("menu");

  setup() {
    super.setup();
    useExternalListener(window, "click", this.onClick);
  }

  get state() {
    return this.props.store.state;
  }

  get notify() {
    return this.props.store.notify;
  }

  async activateMenu(menu: FullMenuItem) {
    const result = await menu.action(this.env);
    this.close();
    this.props.onMenuClicked?.({ detail: result } as CustomEvent);
  }

  private close() {
    this.props.onClose();
    this.notify.close();
  }

  private onClick(ev: MouseEvent) {
    // Don't close a root menu when clicked to open the submenus.
    const el = this.menuRef.el;
    if (el && isChildEvent(el, ev)) {
      return;
    }
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
    if (menu.isEnabled(this.env)) {
      return this.env.model.getters.isReadonly() ? menu.isReadonlyAllowed : true;
    }
    return false;
  }

  onScroll(ev) {
    this.notify.scroll(ev.target.scrollTop);
  }

  /**
   * If the given menu is not disabled, open it's submenu at the
   * correct position according to available surrounding space.
   */
  openSubMenu(menu: FullMenuItem, position: number) {
    const subMenuItems = cellMenuRegistry.getChildren(menu, this.env);
    this.notify.openSubMenu(position, subMenuItems);
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
        this.notify.closeSubMenu();
      }
    }
  }
}
