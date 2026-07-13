import { onMounted, proxy, signal, useProps } from "@odoo/owl";
import { Action, getMenuItemsAndSeparators } from "../../../actions/action";
import { Component, useExternalListener } from "../../../owl3_compatibility_layer";
import { topbarMenuRegistry } from "../../../registries/menus/topbar_menu_registry";
import { _t } from "../../../translation";
import { PropsOf } from "../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Menu } from "../../menu/menu";
import { types } from "../../props_validation";

export const itemHeight = 40;

interface State {
  menuItems: Action[];
  title: string | undefined;
  parentState: State | undefined;
}

export class RibbonMenu extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-RibbonMenu";
  static components = { Menu };

  protected props = useProps({
    onClose: types.function(),
  });

  rootItems = topbarMenuRegistry.getMenuItems();
  private menuRef = signal<HTMLElement | null>(null);
  private containerRef = signal<HTMLElement | null>(null);

  state: State = proxy({
    menuItems: this.rootItems,
    title: _t("Menu Bar"),
    parentState: undefined,
  });

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
    onMounted(this.updateShadows);
  }

  onExternalClick(ev: Event) {
    if (!this.menuRef()?.contains(ev.target as HTMLElement)) {
      this.props.onClose();
    }
  }

  onClickMenu(menu: Action) {
    const children = menu.children(this.env);
    if (children.length) {
      this.state.parentState = { ...this.state };
      this.state.menuItems = children;
      this.state.title = menu.name(this.env);
      this.containerRef()?.scrollTo({ top: 0 });
    } else {
      this.state.menuItems = this.rootItems;
      this.state.title = undefined;
      this.state.parentState = undefined;
      menu.execute?.(this.env);
      this.props.onClose();
    }
  }

  get menuProps(): PropsOf<Menu> {
    return {
      menuItems: getMenuItemsAndSeparators(this.env, this.state.menuItems),
      onClose: this.props.onClose,
      onClickMenu: this.onClickMenu.bind(this),
    };
  }

  updateShadows() {
    const el = this.containerRef();
    if (!el) {
      return;
    }
    el.classList.remove("scroll-top", "scroll-bottom");
    const maxScroll = el.scrollHeight - el.clientHeight || 0;
    if (el.scrollTop < maxScroll - 1) {
      el.classList.add("scroll-bottom");
    }
    if (el.scrollTop > 0) {
      el.classList.add("scroll-top");
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
    this.containerRef()?.scrollTo({ top: 0 });
  }

  get backTitle() {
    return this.state.parentState ? _t("Go to previous menu") : _t("Close menu bar");
  }
}
