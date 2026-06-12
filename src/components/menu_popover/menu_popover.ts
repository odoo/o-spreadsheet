import { onWillUnmount, onWillUpdateProps, props, proxy, signal } from "@odoo/owl";
import { Action, getMenuItemsAndSeparators, isMenuItemEnabled } from "../../actions/action";
import { DESKTOP_MENU_ITEM_HEIGHT, MENU_VERTICAL_PADDING, MENU_WIDTH } from "../../constants";
import { Component, useExternalListener, useLayoutEffect } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { MenuMouseEvent, Pixel, UID } from "../../types/misc";
import { PropsOf } from "../../types/props_of";
import { Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../helpers/css";
import {
  getBoundingRectAsPOJO,
  getElBoundingRect,
  getOpenedMenus,
  isChildEvent,
  isMiddleClickOrCtrlClick,
} from "../helpers/dom_helpers";
import { useTimeOut } from "../helpers/time_hooks";
import { Menu } from "../menu/menu";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

//------------------------------------------------------------------------------
// Context MenuPopover Component
//------------------------------------------------------------------------------

const TIMEOUT_DELAY = 250;

export interface MenuState {
  isOpen: boolean;
  parentMenu?: Action;
  anchorRect: null | Rect;
  scrollOffset?: Pixel;
  menuItems: Action[];
  isHoveringChild?: boolean;
  autoSelectFirstItem?: boolean;
}

interface State {
  hoveredMenu?: Action;
}

export class MenuPopover extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Menu-Popover";
  static components = { MenuPopover, Menu, Popover };

  protected props = props({
    anchorRect: types.Rect(),
    popoverPositioning: types
      .or([types.literal("top-right"), types.literal("bottom-left")])
      .optional("top-right"),
    menuItems: types.ArrayOf<Action>(),
    depth: types.number().optional(0),
    maxHeight: types.Pixel().optional(),
    onClose: types.function(),
    onMenuClicked: types.function<(ev: CustomEvent) => void>().optional(),
    menuId: types.UID().optional(),
    onMouseOver: types.function().optional(),
    width: types.number().optional(),
    autoSelectFirstItem: types.boolean().optional(),
    disableKeyboardNavigation: types.boolean().optional(),
    onKeyboardNavigation: types.function<(ev: KeyboardEvent) => void>().optional(),
  });
  private subMenu: MenuState = proxy({
    isOpen: false,
    anchorRect: null,
    scrollOffset: 0,
    menuItems: [],
    isHoveringChild: false,
  });
  private state: State = proxy({
    hoveredMenu: this.props.autoSelectFirstItem ? this.getNextEnabledMenuItem() : undefined,
  });
  private menuRef = signal<HTMLElement | null>(null);

  private openingTimeOut = useTimeOut();

  setup() {
    const domFocusableElementStore = useStore(DOMFocusableElementStore);

    useLayoutEffect(() => {
      if (
        !this.props.disableKeyboardNavigation &&
        !this.state.hoveredMenu &&
        !this.subMenu.isOpen
      ) {
        this.menuRef()?.focus();
      }
    });

    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    useExternalListener(window, "contextmenu", this.onExternalClick, { capture: true });
    onWillUpdateProps((nextProps: PropsOf<MenuPopover>) => {
      if (nextProps.menuItems !== this.props.menuItems) {
        this.closeSubMenu();
      }
    });
    onWillUnmount(() => {
      this.state.hoveredMenu?.onStopHover?.(this.env);
      if (this.menuRef()?.contains(document.activeElement)) {
        domFocusableElementStore.focus();
      }
    });
  }

  get menuProps(): PropsOf<Menu> {
    const menItems = this.menuItems;
    const hoveredMenuId = menItems
      .filter((menuItem) => menuItem !== "separator")
      .find((menuItem) => this.isMenuHovered(menuItem))?.id;
    return {
      menuItems: this.menuItems,
      onClose: this.close.bind(this),
      onClickMenu: this.onClickMenu.bind(this),
      onMouseEnter: this.onMenuItemMouseEnter.bind(this),
      onMouseLeave: this.onMouseLeave.bind(this),
      width: this.props.width || MENU_WIDTH,
      onScroll: this.onScroll.bind(this),
      onKeyDown: this.onKeydown.bind(this),
      hoveredMenuId,
      isHoveredMenuFocused: !this.subMenu.isOpen,
      disableKeyboardNavigation: this.props.disableKeyboardNavigation,
    };
  }

  get subMenuAnchorRect(): Rect {
    const anchorRect = Object.assign({}, this.subMenu.anchorRect);
    anchorRect.y -= this.subMenu.scrollOffset || 0;
    return anchorRect;
  }

  get popoverProps(): PropsOf<Popover> {
    const isRoot = this.props.depth === 0;
    return {
      anchorRect: {
        x: this.props.anchorRect.x,
        y: this.props.anchorRect.y,
        width: isRoot ? this.props.anchorRect.width : this.props.width || MENU_WIDTH,
        height: isRoot ? this.props.anchorRect.height : DESKTOP_MENU_ITEM_HEIGHT,
      },
      positioning: this.props.popoverPositioning,
      verticalOffset: isRoot ? 0 : MENU_VERTICAL_PADDING,
      onPopoverHidden: () => this.closeSubMenu(),
      onPopoverMoved: () => this.closeSubMenu(),
      maxHeight: this.props.maxHeight,
    };
  }

  get childrenHaveIcon(): boolean {
    return this.props.menuItems.some((menuItem) => !!this.getIconName(menuItem));
  }

  getIconName(menu: Action) {
    if (menu.icon(this.env)) {
      return menu.icon(this.env);
    }
    if (menu.isActive?.(this.env)) {
      return "o-spreadsheet-Icon.CHECK";
    }

    return "";
  }

  getColor(menu: Action) {
    return cssPropertiesToCss({ color: menu.textColor });
  }

  getIconColor(menu: Action) {
    return cssPropertiesToCss({ color: menu.iconColor });
  }

  async activateMenu(menu: Action, isMiddleClick?: boolean) {
    const result = await menu.execute?.(this.env, isMiddleClick);
    this.close();
    this.props.onMenuClicked?.({ detail: result } as CustomEvent);
  }

  private close() {
    this.closeSubMenu();
    this.props.onClose();
  }

  private onExternalClick(ev: MenuMouseEvent) {
    // Don't close a root menu when clicked to open the submenus.
    const el = this.menuRef();
    if (el && getOpenedMenus().some((el) => isChildEvent(el, ev))) {
      return;
    }
    ev.closedMenuId = this.props.menuId;
    this.close();
  }

  get menuItems() {
    return getMenuItemsAndSeparators(this.env, this.props.menuItems);
  }

  getName(menu: Action) {
    return menu.name(this.env);
  }

  isRoot(menu: Action) {
    return !menu.execute;
  }

  isMenuHovered(menuItem: Action): boolean {
    return (
      ((this.subMenu?.isHoveringChild || false) && this.isParentMenu(this.subMenu, menuItem)) ||
      this.state.hoveredMenu?.id === menuItem.id
    );
  }

  onScroll(ev) {
    this.subMenu.scrollOffset = ev.target.scrollTop;
  }

  /**
   * If the given menu is not disabled, open it's submenu at the
   * correct position according to available surrounding space.
   */
  private openSubMenu(menu: Action, y: number, autoSelectFirstItem = false) {
    this.subMenu.anchorRect = {
      x: getElBoundingRect(this.menuRef()).x,
      y: y - (this.subMenu.scrollOffset || 0),
      width: this.props.width || MENU_WIDTH,
      height: DESKTOP_MENU_ITEM_HEIGHT,
    };
    this.subMenu.menuItems = menu.children(this.env);
    this.subMenu.isOpen = true;
    this.subMenu.parentMenu = menu;
    this.subMenu.autoSelectFirstItem = autoSelectFirstItem;
  }

  private isParentMenu(subMenu: MenuState, menuItem: Action) {
    return subMenu.parentMenu?.id === menuItem.id;
  }

  private closeSubMenu() {
    this.subMenu.isOpen = false;
    this.subMenu.parentMenu = undefined;
  }

  async onClickMenu(menu: Action, ev: PointerEvent) {
    if (this.isRoot(menu)) {
      this.openSubMenu(menu, (ev.target as HTMLElement).getBoundingClientRect().top);
    } else {
      await this.activateMenu(menu, isMiddleClickOrCtrlClick(ev));
    }
  }

  onMenuItemMouseEnter(menu: Action, ev: PointerEvent) {
    this.state.hoveredMenu = menu;
    menu.onStartHover?.(this.env);

    if (this.isParentMenu(this.subMenu, menu)) {
      this.openingTimeOut.clear();
      return;
    }
    const currentTarget = ev.currentTarget as HTMLElement;
    if (this.isRoot(menu)) {
      this.openingTimeOut.schedule(() => {
        this.openSubMenu(menu, currentTarget.getBoundingClientRect().top);
      }, TIMEOUT_DELAY);
    }
  }

  onMouseOverMainMenu() {
    this.props.onMouseOver?.();
    this.subMenu.isHoveringChild = false;
  }

  onMouseOverChildMenu() {
    this.subMenu.isHoveringChild = true;
    this.openingTimeOut.clear();
  }

  onMouseLeave(menu: Action) {
    this.state.hoveredMenu = undefined;
    menu.onStopHover?.(this.env);

    this.openingTimeOut.schedule(this.closeSubMenu.bind(this), TIMEOUT_DELAY);
  }

  get menuStyle() {
    return this.props.width ? cssPropertiesToCss({ width: this.props.width + "px" }) : "";
  }

  onKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    if (this.navigateMenu(ev.key) !== "eventHandled") {
      this.props.onKeyboardNavigation?.(ev);
    }
  }

  private navigateMenu(key: string): "eventHandled" | "notHandled" {
    const selectedMenuItem = this.state.hoveredMenu;
    switch (key) {
      case "Enter":
        if (selectedMenuItem && this.isRoot(selectedMenuItem)) {
          const rect = this.getMenuItemRect(selectedMenuItem.id);
          if (rect) {
            this.openSubMenu(selectedMenuItem, rect.y, true);
            return "eventHandled";
          }
        } else if (selectedMenuItem && isMenuItemEnabled(this.env, selectedMenuItem)) {
          void this.activateMenu(selectedMenuItem);
          return "eventHandled";
        }
        return "notHandled";
      case "Escape":
        if (this.subMenu.isOpen) {
          this.closeSubMenu();
          return "eventHandled";
        } else if (this.props.depth === 0) {
          this.close();
          return "eventHandled";
        }
        return "notHandled";
      case "ArrowLeft":
        if (this.subMenu.isOpen) {
          this.state.hoveredMenu = this.subMenu.parentMenu;
          this.closeSubMenu();
          return "eventHandled";
        }
        return "notHandled";
      case "ArrowDown": {
        this.state.hoveredMenu = this.getNextEnabledMenuItem(this.state.hoveredMenu);
        return "eventHandled";
      }
      case "ArrowUp": {
        this.state.hoveredMenu = this.getPreviousEnabledMenuItem(this.state.hoveredMenu);
        return "eventHandled";
      }
      case "ArrowRight": {
        if (
          selectedMenuItem &&
          this.isRoot(selectedMenuItem) &&
          this.subMenu.parentMenu?.id !== selectedMenuItem.id
        ) {
          const rect = this.getMenuItemRect(selectedMenuItem.id);
          if (rect) {
            this.openSubMenu(selectedMenuItem, rect.y, true);
          }
          return "eventHandled";
        }
        return "notHandled";
      }
    }

    return "notHandled";
  }

  private getMenuItemRect(menuItemId: UID): Rect | undefined {
    const menuEl = this.menuRef()?.querySelector<HTMLElement>(`[data-name="${menuItemId}"]`);
    return menuEl ? getBoundingRectAsPOJO(menuEl) : undefined;
  }

  getNextEnabledMenuItem(currentHoveredMenu?: Action): Action | undefined {
    const menuItems = this.menuItems.filter((i) => i !== "separator");
    const start = menuItems.findIndex((i) => i.id === currentHoveredMenu?.id);

    for (let offset = 1; offset <= menuItems.length; offset++) {
      const item = menuItems[(start + offset) % menuItems.length];
      if (isMenuItemEnabled(this.env, item)) {
        return item;
      }
    }

    return undefined;
  }

  getPreviousEnabledMenuItem(currentHoveredMenu?: Action): Action | undefined {
    const menuItems = this.menuItems.filter((i) => i !== "separator");
    let start = menuItems.findIndex((i) => i.id === currentHoveredMenu?.id);
    if (start === -1) {
      start = menuItems.length;
    }

    for (let offset = 1; offset <= menuItems.length; offset++) {
      const item = menuItems[(start - offset + menuItems.length) % menuItems.length];
      if (isMenuItemEnabled(this.env, item)) {
        return item;
      }
    }

    return undefined;
  }
}
