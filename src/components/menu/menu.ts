import { props, signal } from "@odoo/owl";
import { Action, isMenuItemEnabled, isRootMenu, MenuItemOrSeparator } from "../../actions/action";
import { Component, useLayoutEffect } from "../../owl3_compatibility_layer";
import { Pixel } from "../../types/misc";
import { Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../helpers/css";
import { useModel } from "../owl_plugins/model_plugin";
import { types } from "../props_validation";

//------------------------------------------------------------------------------
// Context Menu Component
//------------------------------------------------------------------------------

export type MenuItemRects = { [menuItemId: string]: Rect };

export interface MenuState {
  isOpen: boolean;
  parentMenu?: Action;
  scrollOffset?: Pixel;
  menuItems: Action[];
  isHoveringChild?: boolean;
}

export class Menu extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Menu";
  static components = {};

  protected props = props({
    menuItems: types.ArrayOf<MenuItemOrSeparator>(),
    onClose: types.function([]),
    "onClickMenu?": types.function<[menu: Action, ev: PointerEvent]>([
      types.Action(),
      types.instanceOf(PointerEvent),
    ]),
    "onMouseEnter?": types.function<[menu: Action, ev: PointerEvent]>([
      types.Action(),
      types.instanceOf(PointerEvent),
    ]),
    "onMouseLeave?": types.function<[menu: Action, ev: PointerEvent]>([
      types.Action(),
      types.instanceOf(PointerEvent),
    ]),
    "width?": types.number(),
    "hoveredMenuId?": types.string(),
    "isHoveredMenuFocused?": types.boolean(),
    "onScroll?": types.function<[ev: CustomEvent]>([types.instanceOf(CustomEvent)]),
    "onKeyDown?": types.function<[ev: KeyboardEvent]>([types.instanceOf(KeyboardEvent)]),
    "disableKeyboardNavigation?": types.boolean(),
  });
  private model = useModel();

  private menuRef = signal<HTMLElement | null>(null);

  setup(): void {
    useLayoutEffect(() => {
      const menuEl = this.menuRef();
      if (
        this.props.hoveredMenuId &&
        this.props.isHoveredMenuFocused &&
        menuEl &&
        !this.props.disableKeyboardNavigation
      ) {
        const selector = `[data-name='${this.props.hoveredMenuId}']`;
        const menuItemElement = menuEl.querySelector(selector) as HTMLElement;
        menuItemElement?.focus();
      }
    });
  }

  get childrenHaveIcon(): boolean {
    return this.props.menuItems.some(
      (menuItem) => menuItem !== "separator" && !!this.getIconName(menuItem)
    );
  }

  getIconName(menu: Action) {
    if (menu.icon(this.model(), this.env)) {
      return menu.icon(this.model(), this.env);
    }
    if (menu.isActive?.(this.model(), this.env)) {
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
    return menu.name(this.model(), this.env);
  }

  isRoot(menu: Action) {
    return isRootMenu(menu);
  }

  isEnabled(menu: Action) {
    return isMenuItemEnabled(this.model(), this.env, menu);
  }

  get menuStyle() {
    return this.props.width ? cssPropertiesToCss({ width: this.props.width + "px" }) : "";
  }

  onClickMenu(menu: Action, ev: PointerEvent) {
    if (!this.isEnabled(menu)) {
      return;
    }
    this.props.onClickMenu?.(menu, ev);
  }
}
