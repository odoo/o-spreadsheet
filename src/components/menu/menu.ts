import { Component, onWillUpdateProps, useExternalListener, useRef, useState } from "@odoo/owl";
import { Action } from "../../actions/action";
import {
  MENU_ITEM_HEIGHT,
  MENU_VERTICAL_PADDING,
  MENU_WIDTH,
} from "../../constants";
import { MenuMouseEvent, Pixel, Rect, SpreadsheetChildEnv, UID } from "../../types";
import { PopoverPropsPosition } from "../../types/cell_popovers";
import { css, cssPropertiesToCss } from "../helpers/css";
import {
  getOpenedMenus,
  getRefBoundingRect,
  isChildEvent,
} from "../helpers/dom_helpers";
import { useTimeOut } from "../helpers/time_hooks";
import { Popover, PopoverProps } from "../popover/popover";
import { MenuItemOrSeparator, MenuItems } from "./menu_items";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

css/* scss */ `
  .o-menu {
    background-color: white;
    padding: ${MENU_VERTICAL_PADDING}px 0px;
    width: ${MENU_WIDTH}px;
    user-select: none;
  }
`;

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
}

export interface MenuState {
  isOpen: boolean;
  parentMenu?: Action;
  anchorRect: null | Rect;
  scrollOffset?: Pixel;
  menuItems: Action[];
  isHoveringChild?: boolean;
}

export class Menu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Menu";
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
  };

  static components = { Menu, MenuItems, Popover };
  static defaultProps = {
    depth: 1,
    popoverPositioning: "top-right",
  };
  private subMenu: MenuState = useState({
    isOpen: false,
    anchorRect: null,
    scrollOffset: 0,
    menuItems: [],
    isHoveringChild: false,
  });
  private menuRef = useRef("menu");

  private openingTimeOut = useTimeOut();

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    useExternalListener(window, "contextmenu", this.onExternalClick, { capture: true });
    onWillUpdateProps((nextProps: Props) => {
      if (nextProps.menuItems !== this.props.menuItems) {
        this.closeSubMenu();
      }
    });
  }

  get menuItemsAndSeparators(): MenuItemOrSeparator[] {
    const menuItemsAndSeparators: MenuItemOrSeparator[] = [];
    for (let i = 0; i < this.props.menuItems.length; i++) {
      const menuItem = this.props.menuItems[i];
      if (menuItem.isVisible(this.env)) {
        menuItemsAndSeparators.push(menuItem);
      }
      if (
        menuItem.separator &&
        i !== this.props.menuItems.length - 1 && // no separator at the end
        menuItemsAndSeparators[menuItemsAndSeparators.length - 1] !== "separator" // no double separator
      ) {
        menuItemsAndSeparators.push("separator");
      }
    }
    if (menuItemsAndSeparators[menuItemsAndSeparators.length - 1] === "separator") {
      menuItemsAndSeparators.pop();
    }
    if (menuItemsAndSeparators.length === 1 && menuItemsAndSeparators[0] === "separator") {
      return [];
    }
    return menuItemsAndSeparators;
  }

  get subMenuAnchorRect(): Rect {
    const anchorRect = Object.assign({}, this.subMenu.anchorRect);
    anchorRect.y -= this.subMenu.scrollOffset || 0;
    return anchorRect;
  }

  get popoverProps(): PopoverProps {
    const isRoot = this.props.depth === 1;
    return {
      anchorRect: {
        x: this.props.anchorRect.x,
        y: this.props.anchorRect.y,
        width: isRoot ? this.props.anchorRect.width : this.props.width || MENU_WIDTH,
        height: isRoot ? this.props.anchorRect.height : MENU_ITEM_HEIGHT,
      },
      positioning: this.props.popoverPositioning,
      verticalOffset: isRoot ? 0 : MENU_VERTICAL_PADDING,
      onPopoverHidden: () => this.closeSubMenu(),
      onPopoverMoved: () => this.closeSubMenu(),
    };
  }

  get activeMenuItem() {
    return this.props.menuItems.find((menuItem) => this.isActive(menuItem));
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

  isRoot(menu: Action) {
    return !menu.execute;
  }

  isActive(menuItem: Action): boolean {
    return (this.subMenu?.isHoveringChild || false) && this.isParentMenu(this.subMenu, menuItem);
  }

  onScroll(ev) {
    this.subMenu.scrollOffset = ev.target.scrollTop;
  }

  /**
   * If the given menu is not disabled, open it's submenu at the
   * correct position according to available surrounding space.
   */
  private openSubMenu(menu: Action, parentMenuEl: HTMLElement) {
    if (!parentMenuEl) {
      return;
    }
    const y = parentMenuEl.getBoundingClientRect().top;

    this.subMenu.anchorRect = {
      x: getRefBoundingRect(this.menuRef).x,
      y: y - (this.subMenu.scrollOffset || 0),
      width: this.props.width || MENU_WIDTH,
      height: MENU_ITEM_HEIGHT,
    };
    this.subMenu.menuItems = menu.children(this.env);
    this.subMenu.isOpen = true;
    this.subMenu.parentMenu = menu;
  }

  isParentMenu(subMenu: MenuState, menuItem: Action) {
    return subMenu.parentMenu?.id === menuItem.id;
  }

  private closeSubMenu() {
    if (this.subMenu.isHoveringChild) {
      return;
    }
    this.subMenu.isOpen = false;
    this.subMenu.parentMenu = undefined;
  }

  onMenuClicked(menu: Action, event: CustomEvent) {
    this.close();
    this.props.onMenuClicked?.(event);
  }

  onRootMenuClicked(menu: Action, ev: MouseEvent) {
    this.openSubMenu(menu, ev.currentTarget as HTMLElement);
  }

  onMouseOver(menu: Action, ev: MouseEvent) {
    if (this.isParentMenu(this.subMenu, menu)) {
      this.openingTimeOut.clear();
      return;
    }
    const currentTarget = ev.currentTarget as HTMLElement;
    if (this.isRoot(menu)) {
      this.openingTimeOut.schedule(() => {
        this.openSubMenu(menu, currentTarget);
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

  onMouseEnter(menu: Action) {}

  onMouseLeave(menu: Action) {
    this.openingTimeOut.schedule(this.closeSubMenu.bind(this), TIMEOUT_DELAY);
  }

  get menuStyle() {
    return this.props.width ? cssPropertiesToCss({ width: this.props.width + "px" }) : "";
  }
}
