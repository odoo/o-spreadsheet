import {
  Component,
  onWillUnmount,
  onWillUpdateProps,
  useExternalListener,
  useRef,
  useState,
} from "@odoo/owl";
import { Action } from "../../actions/action";
import {
  BG_HOVER_COLOR,
  DISABLED_TEXT_COLOR,
  ICONS_COLOR,
  MENU_ITEM_HEIGHT,
  MENU_ITEM_PADDING_HORIZONTAL,
  MENU_ITEM_PADDING_VERTICAL,
  MENU_VERTICAL_PADDING,
  MENU_WIDTH,
} from "../../constants";
import { DOMCoordinates, MenuMouseEvent, Pixel, SpreadsheetChildEnv, UID } from "../../types";
import { css } from "../helpers/css";
import { getOpenedMenus, isChildEvent } from "../helpers/dom_helpers";
import { useAbsoluteBoundingRect } from "../helpers/position_hook";
import { useTimeOut } from "../helpers/time_hooks";
import { Popover, PopoverProps } from "../popover/popover";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

css/* scss */ `
  .o-menu {
    background-color: white;
    padding: ${MENU_VERTICAL_PADDING}px 0px;
    width: ${MENU_WIDTH}px;
    box-sizing: border-box !important;
    user-select: none;

    .o-menu-item {
      box-sizing: border-box;
      height: ${MENU_ITEM_HEIGHT}px;
      padding: ${MENU_ITEM_PADDING_VERTICAL}px ${MENU_ITEM_PADDING_HORIZONTAL}px;
      cursor: pointer;
      user-select: none;

      .o-menu-item-name {
        min-width: 40%;
      }

      .o-menu-item-icon {
        display: inline-block;
        margin: 0px 8px 0px 0px;
        width: ${MENU_ITEM_HEIGHT - 2 * MENU_ITEM_PADDING_VERTICAL}px;
        line-height: ${MENU_ITEM_HEIGHT - 2 * MENU_ITEM_PADDING_VERTICAL}px;
      }

      &:not(.disabled) {
        &:hover,
        &.o-menu-item-active {
          background-color: ${BG_HOVER_COLOR};
        }
        .o-menu-item-description {
          color: grey;
        }
        .o-menu-item-icon {
          .o-icon {
            color: ${ICONS_COLOR};
          }
        }
      }
      &.disabled {
        color: ${DISABLED_TEXT_COLOR};
        cursor: not-allowed;
      }
    }
  }
`;

type MenuItemOrSeparator = Action | "separator";

const TIMEOUT_DELAY = 250;

interface Props {
  position: DOMCoordinates;
  menuItems: Action[];
  depth: number;
  maxHeight?: Pixel;
  onClose: () => void;
  onMenuClicked?: (ev: CustomEvent) => void;
  menuId?: UID;
  onMouseOver?: () => void;
}

export interface MenuState {
  isOpen: boolean;
  parentMenu?: Action;
  position: null | DOMCoordinates;
  scrollOffset?: Pixel;
  menuItems: Action[];
  isHoveringChild?: boolean;
}

export class Menu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Menu";
  static props = {
    position: Object,
    menuItems: Array,
    depth: { type: Number, optional: true },
    maxHeight: { type: Number, optional: true },
    onClose: Function,
    onMenuClicked: { type: Function, optional: true },
    menuId: { type: String, optional: true },
    onMouseOver: { type: Function, optional: true },
  };

  static components = { Menu, Popover };
  static defaultProps = {
    depth: 1,
  };
  private subMenu: MenuState = useState({
    isOpen: false,
    position: null,
    scrollOffset: 0,
    menuItems: [],
    isHoveringChild: false,
  });
  private menuRef = useRef("menu");
  private hoveredMenu: Action | undefined = undefined;

  private position: DOMCoordinates = useAbsoluteBoundingRect(this.menuRef);

  private openingTimeOut = useTimeOut();

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    useExternalListener(window, "contextmenu", this.onExternalClick, { capture: true });
    onWillUpdateProps((nextProps: Props) => {
      if (nextProps.menuItems !== this.props.menuItems) {
        this.closeSubMenu();
      }
    });
    onWillUnmount(() => {
      this.hoveredMenu?.onStopHover?.(this.env);
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

  get subMenuPosition(): DOMCoordinates {
    const position = Object.assign({}, this.subMenu.position);
    position.y -= this.subMenu.scrollOffset || 0;
    return position;
  }

  get popoverProps(): PopoverProps {
    const isRoot = this.props.depth === 1;
    return {
      anchorRect: {
        x: this.props.position.x - MENU_WIDTH * (this.props.depth - 1),
        y: this.props.position.y,
        width: isRoot ? 0 : MENU_WIDTH,
        height: isRoot ? 0 : MENU_ITEM_HEIGHT,
      },
      positioning: "TopRight",
      verticalOffset: isRoot ? 0 : MENU_VERTICAL_PADDING,
      onPopoverHidden: () => this.closeSubMenu(),
      onPopoverMoved: () => this.closeSubMenu(),
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
    return menu.textColor ? `color: ${menu.textColor}` : undefined;
  }

  async activateMenu(menu: Action) {
    const result = await menu.execute?.(this.env);
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

  isEnabled(menu: Action) {
    if (menu.isEnabled(this.env)) {
      return this.env.model.getters.isReadonly() ? menu.isReadonlyAllowed : true;
    }
    return false;
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

    this.subMenu.position = {
      x: this.position.x + this.props.depth * MENU_WIDTH,
      y: y - (this.subMenu.scrollOffset || 0),
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

  onClickMenu(menu: Action, ev: MouseEvent) {
    if (this.isEnabled(menu)) {
      if (this.isRoot(menu)) {
        this.openSubMenu(menu, ev.currentTarget as HTMLElement);
      } else {
        this.activateMenu(menu);
      }
    }
  }

  onMouseOver(menu: Action, ev: MouseEvent) {
    if (this.isEnabled(menu)) {
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
  }

  onMouseOverMainMenu() {
    this.props.onMouseOver?.();
    this.subMenu.isHoveringChild = false;
  }

  onMouseOverChildMenu() {
    this.subMenu.isHoveringChild = true;
    this.openingTimeOut.clear();
  }

  onMouseEnter(menu: Action, ev: MouseEvent) {
    this.hoveredMenu = menu;
    menu.onStartHover?.(this.env);
  }

  onMouseLeave(menu: Action) {
    this.openingTimeOut.schedule(this.closeSubMenu.bind(this), TIMEOUT_DELAY);
    this.hoveredMenu = undefined;
    menu.onStopHover?.(this.env);
  }
}
