import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import {
  DESKTOP_MENU_ITEM_HEIGHT,
  MENU_VERTICAL_PADDING,
  MENU_WIDTH,
} from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import {
  Component,
  onWillUnmount,
  onWillUpdateProps,
  useEffect,
  useExternalListener,
  useRef,
  useState,
} from "@odoo/owl";
import { Action, getMenuItemsAndSeparators, isMenuItemEnabled } from "../../actions/action";
import { useStore } from "../../store_engine";
import { DOMFocusableElementStore } from "../../stores/DOM_focus_store";
import { MenuMouseEvent, Pixel, Rect, UID } from "../../types";
import { PopoverPropsPosition } from "../../types/cell_popovers";
import {
  getBoundingRectAsPOJO,
  getOpenedMenus,
  getRefBoundingRect,
  isChildEvent,
  isMiddleClickOrCtrlClick,
} from "../helpers/dom_helpers";
import { useTimeOut } from "../helpers/time_hooks";
import { Menu, MenuProps } from "../menu/menu";
import { Popover, PopoverProps } from "../popover/popover";

//------------------------------------------------------------------------------
// Context MenuPopover Component
//------------------------------------------------------------------------------

const TIMEOUT_DELAY = 250;

interface Props {
  anchorRect: Rect;
  popoverPositioning: PopoverPropsPosition;
  menuItems: Action[];
  depth: number;
  maxHeight?: Pixel;
  onClose: () => void;
  onMenuClicked?: (ev: CustomEvent) => void;
  menuId?: UID;
  onMouseOver?: () => void;
  width?: number;
  autoSelectFirstItem?: boolean;
  onKeyboardNavigation?: (ev: KeyboardEvent) => void;
}

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

export class MenuPopover extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Menu-Popover";
  static props = {
    anchorRect: Object,
    popoverPositioning: { type: String, optional: true },
    menuItems: Array,
    depth: { type: Number, optional: true },
    maxHeight: { type: Number, optional: true },
    onClose: Function,
    onMenuClicked: { type: Function, optional: true },
    menuId: { type: String, optional: true },
    onMouseOver: { type: Function, optional: true },
    width: { type: Number, optional: true },
    autoSelectFirstItem: { type: Boolean, optional: true },
    onKeyboardNavigation: { type: Function, optional: true },
  };

  static components = { MenuPopover, Menu, Popover };
  static defaultProps = {
    depth: 0,
    popoverPositioning: "top-right",
  };
  private subMenu: MenuState = useState({
    isOpen: false,
    anchorRect: null,
    scrollOffset: 0,
    menuItems: [],
    isHoveringChild: false,
  });
  private state: State = useState({
    hoveredMenu: this.props.autoSelectFirstItem ? this.getNextEnabledMenuItem() : undefined,
  });
  private menuRef = useRef("menu");

  private openingTimeOut = useTimeOut();

  setup() {
    const domFocusableElementStore = useStore(DOMFocusableElementStore);

    useEffect(() => {
      if (!this.state.hoveredMenu && !this.subMenu.isOpen) {
        this.menuRef.el?.focus();
      }
    });

    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    useExternalListener(window, "contextmenu", this.onExternalClick, { capture: true });
    onWillUpdateProps((nextProps: Props) => {
      if (nextProps.menuItems !== this.props.menuItems) {
        this.closeSubMenu();
      }
    });
    onWillUnmount(() => {
      this.state.hoveredMenu?.onStopHover?.(this.env);
      if (this.menuRef.el?.contains(document.activeElement)) {
        domFocusableElementStore.focus();
      }
    });
  }

  get menuProps(): MenuProps {
    const menItems = this.menuItems;
    const hoveredMenuId = menItems
      .filter((menuItem) => menuItem !== "separator")
      .find((menuItem) => this.isMenuHovered(menuItem))?.id;
    return {
      menuItems: this.menuItems,
      onClose: this.close.bind(this),
      // @ts-ignore
      onClickMenu: this.onClickMenu.bind(this),
      onMouseEnter: this.onMenuItemMouseEnter.bind(this),
      onMouseLeave: this.onMouseLeave.bind(this),
      width: this.props.width || MENU_WIDTH,
      onScroll: this.onScroll.bind(this),
      onKeyDown: this.onKeydown.bind(this),
      hoveredMenuId,
      isHoveredMenuFocused: !this.subMenu.isOpen,
    };
  }

  get menuItems() {
    return getMenuItemsAndSeparators(this.env, this.props.menuItems);
  }

  get subMenuAnchorRect(): Rect {
    const anchorRect = Object.assign({}, this.subMenu.anchorRect);
    anchorRect.y -= this.subMenu.scrollOffset || 0;
    return anchorRect;
  }

  get popoverProps(): PopoverProps {
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
    const el = this.menuRef.el;
    if (el && getOpenedMenus().some((el) => isChildEvent(el, ev))) {
      return;
    }
    ev.closedMenuId = this.props.menuId;
    this.close();
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
      x: getRefBoundingRect(this.menuRef).x,
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
    if (this.subMenu.isHoveringChild) {
      return;
    }
    this.subMenu.isOpen = false;
    this.subMenu.parentMenu = undefined;
  }

  private forceCloseSubMenu() {
    // TODO: see if if(this.subMenu.isHoveringChild) is really needed/not buggy in closeSubMenu
    this.subMenu.isOpen = false;
    this.subMenu.parentMenu = undefined;
  }

  onClickMenu(menu: Action, ev: MouseEvent) {
    if (this.isRoot(menu)) {
      this.openSubMenu(menu, (ev.target as HTMLElement).getBoundingClientRect().top);
    } else {
      this.activateMenu(menu, isMiddleClickOrCtrlClick(ev));
    }
  }

  onMenuItemMouseEnter(menu: Action, ev: MouseEvent) {
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
    console.log("Navigate menu popover:", this.props.menuId + " " + this.props.depth, key);
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
          this.activateMenu(selectedMenuItem);
          return "eventHandled";
        }
        return "notHandled";
      case "Escape":
        if (this.subMenu.isOpen) {
          this.forceCloseSubMenu();
          return "eventHandled";
        } else if (this.props.depth === 0) {
          this.close();
          return "eventHandled";
        }
        return "notHandled";
      case "ArrowLeft":
        if (this.subMenu.isOpen) {
          this.state.hoveredMenu = this.subMenu.parentMenu;
          this.forceCloseSubMenu();
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
    const menuEl = this.menuRef.el?.querySelector<HTMLElement>(`[data-name="${menuItemId}"]`);
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
