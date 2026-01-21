import { Component, onMounted, useExternalListener, useRef, useState } from "@odoo/owl";
import { Action, getMenuItemsAndSeparators } from "../../../actions/action";
import { topbarMenuRegistry } from "../../../registries/menus";
import { _t } from "../../../translation";
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
  private containerRef = useRef("container");

  state: State = useState({
    menuItems: this.rootItems,
    title: _t("Menu Bar"),
    parentState: undefined,
  });

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    onMounted(this.updateShadows);
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
      this.containerRef.el?.scrollTo({ top: 0 });
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
      menuItems: getMenuItemsAndSeparators(this.env, this.state.menuItems),
      onClose: this.props.onClose,
      onClickMenu: this.onClickMenu.bind(this),
    };
  }

  get style() {
    return cssPropertiesToCss({
      height: `${this.props.height}px`,
    });
  }

  updateShadows() {
    if (!this.containerRef.el) {
      return;
    }
    this.containerRef.el.classList.remove("scroll-top", "scroll-bottom");
    const maxScroll = this.containerRef.el.scrollHeight - this.containerRef.el.clientHeight || 0;
    if (this.containerRef.el.scrollTop < maxScroll - 1) {
      this.containerRef.el.classList.add("scroll-bottom");
    }
    if (this.containerRef.el.scrollTop > 0) {
      this.containerRef.el.classList.add("scroll-top");
    }
  }

  onClickBack() {
    if (!this.state.parentState) {
      this.props.onClose();
      return;
    }
    this.state.menuItems = this.state.parentState.menuItems;
    this.state.title = this.state.parentState.title;
    this.state.parentState = this.state.parentState.parentState;
    this.containerRef.el?.scrollTo({ top: 0 });
  }

  get backTitle() {
    return this.state.parentState ? _t("Go to previous menu") : _t("Close menu bar");
  }
}
