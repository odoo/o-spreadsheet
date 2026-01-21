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
  useExternalListener,
  useRef,
  useState,
} from "@odoo/owl";
import { Action, getMenuItemsAndSeparators } from "../../actions/action";
import { MenuMouseEvent, Pixel, Rect, UID } from "../../types";
import { PopoverPropsPosition } from "../../types/cell_popovers";
import {
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
}

export interface MenuState {
  isOpen: boolean;
  parentMenu?: Action;
  anchorRect: null | Rect;
  scrollOffset?: Pixel;
  menuItems: Action[];
  isHoveringChild?: boolean;
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
  };

  static components = { MenuPopover, Menu, Popover };
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
  private hoveredMenu: Action | undefined = undefined;

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

  get menuProps(): MenuProps {
    return {
      menuItems: this.menuItems,
      onClose: this.close.bind(this),
      onClickMenu: this.onClickMenu.bind(this),
      onMouseOver: this.onMouseOver.bind(this),
      onMouseLeave: this.onMouseLeave.bind(this),
      width: this.props.width || MENU_WIDTH,
      isActive: this.isActive.bind(this),
      onScroll: this.onScroll.bind(this),
    };
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

  get menuItems() {
    return getMenuItemsAndSeparators(this.env, this.props.menuItems);
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

    this.subMenu.anchorRect = {
      x: getRefBoundingRect(this.menuRef).x,
      y: y - (this.subMenu.scrollOffset || 0),
      width: this.props.width || MENU_WIDTH,
      height: DESKTOP_MENU_ITEM_HEIGHT,
    };
    this.subMenu.menuItems = menu.children(this.env);
    this.subMenu.isOpen = true;
    this.subMenu.parentMenu = menu;
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

  onClickMenu(menu: Action, ev: PointerEvent) {
    if (this.isRoot(menu)) {
      this.openSubMenu(menu, ev.currentTarget as HTMLElement);
    } else {
      this.activateMenu(menu, isMiddleClickOrCtrlClick(ev));
    }
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

  onMouseLeave(menu: Action) {
    this.openingTimeOut.schedule(this.closeSubMenu.bind(this), TIMEOUT_DELAY);
  }

  get menuStyle() {
    return this.props.width ? cssPropertiesToCss({ width: this.props.width + "px" }) : "";
  }
}
