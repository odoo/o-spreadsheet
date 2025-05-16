import { Component, onWillUnmount } from "@odoo/owl";
import { Action } from "../../actions/action";
import {
  BUTTON_ACTIVE_BG,
  BUTTON_ACTIVE_TEXT_COLOR,
  DISABLED_TEXT_COLOR,
  ICONS_COLOR,
  MENU_ITEM_HEIGHT,
  MENU_ITEM_PADDING_HORIZONTAL,
  MENU_ITEM_PADDING_VERTICAL,
} from "../../constants";
import { Pixel, SpreadsheetChildEnv, UID } from "../../types";
import { css, cssPropertiesToCss } from "../helpers/css";

//------------------------------------------------------------------------------
// Context MenuPopover Component
//------------------------------------------------------------------------------

css/* scss */ `
  .o-menu {
    background-color: white;
    user-select: none;

    .o-menu-item {
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
          background-color: ${BUTTON_ACTIVE_BG};
          color: ${BUTTON_ACTIVE_TEXT_COLOR};
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

export interface MenuProps {
  menuItems: Action[];
  onClose: () => void;
  onScroll?: (ev: CustomEvent) => void;
  onClickMenu?: (menu: Action, ev: CustomEvent) => void;
  onMouseEnter?: (menu: Action, ev: PointerEvent) => void;
  onMouseOver?: (menu: Action, ev: PointerEvent) => void;
  onMouseLeave?: (menu: Action, ev: PointerEvent) => void;
  // TODORAR vraiment pas convaincu du tout ... ca devrait etre défini sur l'appelant a mon avis
  onMouseOverMainMenu?: () => void;

  isActive?: (menu: Action) => boolean;
  // TODORAR je pense que c'est inutile
  menuId?: UID;
  width?: number;
}

export interface MenuState {
  isOpen: boolean;
  parentMenu?: Action;
  scrollOffset?: Pixel;
  menuItems: Action[];
  isHoveringChild?: boolean;
}

export class Menu extends Component<MenuProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Menu";
  static props = {
    menuItems: Array,
    onClose: Function,
    onClickMenu: { type: Function, optional: true },
    menuId: { type: String, optional: true },
    onMouseEnter: { type: Function, optional: true },
    onMouseOver: { type: Function, optional: true },
    onMouseLeave: { type: Function, optional: true },
    onMouseOverMainMenu: { type: Function, optional: true },
    width: { type: Number, optional: true },
    isActive: { type: Function, optional: true },
    onScroll: { type: Function, optional: true },
  };

  static components = {};
  static defaultProps = {};

  private hoveredMenu: Action | undefined = undefined;

  setup() {
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

  get menuStyle() {
    return this.props.width ? cssPropertiesToCss({ width: this.props.width + "px" }) : "";
  }

  onMouseEnter(menu: Action, ev: PointerEvent) {
    this.hoveredMenu = menu;
    menu.onStartHover?.(this.env);
    this.props.onMouseEnter?.(menu, ev);
  }

  onMouseLeave(menu: Action, ev: PointerEvent) {
    this.hoveredMenu = undefined;
    menu.onStopHover?.(this.env);
    this.props.onMouseLeave?.(menu, ev);
  }
}
