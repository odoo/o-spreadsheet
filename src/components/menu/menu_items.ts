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
import { SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers/css";
import { isMiddleClickOrCtrlClick } from "../helpers/dom_helpers";

css/* scss */ `
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
`;

export type MenuItemOrSeparator = Action | "separator";

interface Props {
  menuItemsAndSeparators: MenuItemOrSeparator[];
  onMenuClicked?: (menu: Action, event: CustomEvent) => void;
  onRootMenuClicked?: (menu: Action, event: MouseEvent) => void;
  onMouseEnter?: (menu: Action) => void;
  onMouseOver?: (menu: Action, event: MouseEvent) => void;
  onMouseLeave?: (menu: Action) => void;
}

export class MenuItems extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-MenuItems";
  static props = {
    menuItemsAndSeparators: Array,
    activeMenuItem: { type: Object, optional: true },
    onMenuClicked: { type: Function, optional: true },
    onRootMenuClicked: { type: Function, optional: true },
    onMouseEnter: { type: Function, optional: true },
    onMouseOver: { type: Function, optional: true },
    onMouseLeave: { type: Function, optional: true },
  };

  static components = {};

  private hoveredMenuCleanFn: (() => void) | void = undefined;

  setup() {
    onWillUnmount(() => {
      this.hoveredMenuCleanFn?.();
    });
  }

  get childrenHaveIcon(): boolean {
    return this.props.menuItemsAndSeparators.some(
      (menuItem) => menuItem !== "separator" && !!this.getIconName(menuItem)
    );
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

  getName(menu: Action) {
    return menu.name(this.env);
  }

  getColor(menu: Action) {
    return cssPropertiesToCss({ color: menu.textColor });
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

  getIconColor(menu: Action) {
    return cssPropertiesToCss({ color: menu.iconColor });
  }

  async onClickMenu(menu: Action, ev: MouseEvent) {
    if (this.isEnabled(menu)) {
      if (this.isRoot(menu)) {
        this.props.onRootMenuClicked?.(menu, ev);
      } else {
        const isMiddleClick = isMiddleClickOrCtrlClick(ev);
        const result = await menu.execute?.(this.env, isMiddleClick);
        this.props.onMenuClicked?.(menu, { detail: result } as CustomEvent);
      }
    }
  }

  onMouseEnter(menu: Action) {
    this.props.onMouseEnter?.(menu);
    this.hoveredMenuCleanFn = menu.onStartHover?.(this.env);
  }

  onMouseLeave(menu: Action) {
    this.props.onMouseLeave?.(menu);
    this.hoveredMenuCleanFn?.();
    this.hoveredMenuCleanFn = undefined;
  }

  onMouseOver(menu: Action, ev: MouseEvent) {
    if (this.isEnabled(menu)) {
      this.props.onMouseOver?.(menu, ev);
    }
  }
}
