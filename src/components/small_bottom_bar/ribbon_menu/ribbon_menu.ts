import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { Action } from "../../../actions/action";
import { topbarMenuRegistry } from "../../../registries/menus";
import { SpreadsheetChildEnv } from "../../../types";
import { cssPropertiesToCss } from "../../helpers";
import { Menu, MenuProps } from "../../menu/menu";

export const itemHeight = 40;

interface State {
  menuItems: Action[];
  title: string | undefined;
  parentState: State | undefined;
}

export interface RibbonMenuProps {
  onClose: () => void;
  height: number;
}

export class RibbonMenu extends Component<RibbonMenuProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-RibbonMenu";
  static props = {
    onClose: Function,
  };
  static components = { Menu };

  rootItems = topbarMenuRegistry.getMenuItems();
  private menuRef = useRef("menu");

  state: State = useState({
    menuItems: this.rootItems,
    title: _t("Menu Bar"),
    parentState: undefined,
  });

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  onExternalClick(ev: Event) {
    if (!this.menuRef.el?.contains(ev.target as HTMLElement)) {
      this.props.onClose();
    }
  }

  onClickMenu(menu: Action) {
    const children = menu.children(this.env);
    if (children.length) {
      this.state.parentState = { ...this.state };
      this.state.menuItems = children;
      this.state.title = menu.name(this.env);
    } else {
      this.state.menuItems = this.rootItems;
      this.state.title = undefined;
      this.state.parentState = undefined;
      menu.execute?.(this.env);
      this.props.onClose();
    }
  }

  get menuProps(): MenuProps {
    return {
      menuItems: this.state.menuItems,
      onClose: this.props.onClose,
      onClickMenu: this.onClickMenu.bind(this),
    };
  }

  get style() {
    return cssPropertiesToCss({
      height: `${this.props.height}px`,
    });
  }

  onClickBack() {
    if (!this.state.parentState) {
      this.props.onClose();
      return;
    }
    this.state.menuItems = this.state.parentState.menuItems;
    this.state.title = this.state.parentState.title;
    this.state.parentState = this.state.parentState.parentState;
  }

  get backTitle() {
    return this.state.parentState ? _t("Go to previous menu") : _t("Close menu bar");
  }
}
