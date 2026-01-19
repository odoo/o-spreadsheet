import { DEFAULT_FONT_SIZE } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useExternalListener, useRef, useState } from "@odoo/owl";
import { Action } from "../../actions/action";
import { setStyle } from "../../actions/menu_items_actions";
import { formatNumberMenuItemSpec } from "../../registries/menus";
import { topbarMenuRegistry } from "../../registries/menus/topbar_menu_registry";
import { topbarComponentRegistry } from "../../registries/topbar_component_registry";
import { Store, useStore } from "../../store_engine";
import { FormulaFingerprintStore } from "../../stores/formula_fingerprints_store";
import { Color, Pixel, UID } from "../../types/index";
import { ComposerFocusStore } from "../composer/composer_focus_store";
import { TopBarComposer } from "../composer/top_bar_composer/top_bar_composer";
import { getBoundingRectAsPOJO } from "../helpers/dom_helpers";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { MenuNavigationStore } from "../menu/menu_navigation_store";
import { MenuPopover, MenuState } from "../menu_popover/menu_popover";
import { Popover, PopoverProps } from "../popover";
import { TopBarToolStore } from "./top_bar_tool_store";
import { topBarToolBarRegistry } from "./top_bar_tools_registry";

interface State {
  menuState: MenuState;
  invisibleToolsCategories: string[];
  toolsPopoverState: { isOpen: boolean };
}

interface Props {
  onClick: () => void;
  dropdownMaxHeight: Pixel;
}

// -----------------------------------------------------------------------------
// TopBar
// -----------------------------------------------------------------------------

export class TopBar extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBar";
  static props = {
    onClick: Function,
    dropdownMaxHeight: Number,
  };
  static components = {
    MenuPopover,
    TopBarComposer,
    Popover,
  };

  toolsCategories = topBarToolBarRegistry.getCategories();

  state: State = useState({
    menuState: { isOpen: false, anchorRect: null, menuItems: [] },
    invisibleToolsCategories: [],
    toolsPopoverState: { isOpen: false },
  });

  isSelectingMenu = false;
  openedEl: HTMLElement | null = null;
  menus: Action[] = [];
  private menuId = "topBarMenu";

  toolbarMenuRegistry = topBarToolBarRegistry;
  formatNumberMenuItemSpec = formatNumberMenuItemSpec;
  isntToolbarMenu = false;
  composerFocusStore!: Store<ComposerFocusStore>;
  fingerprints!: Store<FormulaFingerprintStore>;
  topBarToolStore!: Store<TopBarToolStore>;

  toolBarContainerRef = useRef("toolBarContainer");
  toolbarRef = useRef("toolBar");
  topBarTopRef = useRef("topBarTop");

  moreToolsContainerRef = useRef("moreToolsContainer");
  moreToolsButtonRef = useRef("moreToolsButton");

  spreadsheetRect = useSpreadsheetRect();

  private menuNavigationStore!: Store<MenuNavigationStore>;

  setup() {
    this.menuNavigationStore = useStore(MenuNavigationStore);
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.fingerprints = useStore(FormulaFingerprintStore);
    this.topBarToolStore = useStore(TopBarToolStore);

    useExternalListener(window, "click", this.onExternalClick);
    this.menus = topbarMenuRegistry.getMenuItems();

    useEffect(
      () => {
        this.state.toolsPopoverState.isOpen = false;
        this.setVisibilityToolsGroups();
      },
      () => [this.spreadsheetRect.width]
    );
  }

  setVisibilityToolsGroups() {
    if (this.env.model.getters.isReadonly()) {
      return;
    }
    const hiddenCategories: string[] = [];

    const { x: toolsX } = this.toolbarRef.el!.getBoundingClientRect();
    const { x } = this.toolBarContainerRef.el!.getBoundingClientRect();

    // Compute the with of the button that will toggle the hidden tools
    this.moreToolsContainerRef.el?.classList.remove("d-none");
    const moreToolsWidth = this.moreToolsButtonRef.el?.getBoundingClientRect().width || 0;

    // The actual width in which we can place our tools so that they are visible.
    // Every tool container passed that width will be hidden.
    // We remove 16px to the width to account for a scrollbar that might appear.
    // Otherwise, we could end up in a loop of computation
    const usableWidth = Math.round(this.spreadsheetRect.width) - moreToolsWidth - (toolsX - x) - 16;

    const toolElements = document.querySelectorAll(".tool-container");

    let currentWidth = 0;
    for (let index = 0; index < toolElements.length; index++) {
      const element = toolElements[index];
      element.classList.remove("d-none");
      const { width: toolWidth } = element.getBoundingClientRect();
      currentWidth += toolWidth;
      if (currentWidth > usableWidth) {
        element.classList.add("d-none");
        hiddenCategories.push(this.toolsCategories[index]);
      }
    }
    this.state.invisibleToolsCategories = hiddenCategories;
    if (!hiddenCategories.length) {
      this.moreToolsContainerRef.el?.classList.add("d-none");
    }
  }

  get topbarComponents() {
    return topbarComponentRegistry
      .getAllOrdered()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
  }

  get currentFontSize(): number {
    return this.env.model.getters.getCurrentStyle().fontSize || DEFAULT_FONT_SIZE;
  }

  onExternalClick(ev: MouseEvent) {
    // TODO : manage click events better. We need this piece of code
    // otherwise the event opening the menu would close it on the same frame.
    // And we cannot stop the event propagation because it's used in an
    // external listener of the MenuPopover component to close the context menu when
    // clicking on the top bar
    if (this.openedEl === ev.target) {
      return;
    }
    this.closeMenus();
  }

  onClick() {
    this.props.onClick();
    this.closeMenus();
  }

  onMenuMouseOver(menu: Action, ev: MouseEvent) {
    if (this.isSelectingMenu && this.isntToolbarMenu) {
      this.openMenu(menu, ev.currentTarget as HTMLElement);
    }
  }

  toggleContextMenu(menu: Action, ev: MouseEvent) {
    if (this.state.menuState.isOpen && this.isntToolbarMenu) {
      this.closeMenus();
    } else {
      this.openMenu(menu, ev.currentTarget as HTMLElement);
      this.isntToolbarMenu = true;
    }
  }

  private openMenu(menu: Action, target: HTMLElement | undefined) {
    if (!target) {
      return;
    }
    if (this.topBarToolStore.currentDropdown) {
      this.topBarToolStore.closeDropdowns();
    }
    if (!this.state.menuState.isOpen) {
      this.menuNavigationStore.registerMenu(this.menuId, 0, this.navigateMenu.bind(this));
    }
    this.state.toolsPopoverState.isOpen = false;
    this.state.menuState.isOpen = true;
    this.state.menuState.anchorRect = getBoundingRectAsPOJO(target);
    this.state.menuState.menuItems = menu
      .children(this.env)
      .sort((a, b) => a.sequence - b.sequence);
    this.state.menuState.parentMenu = menu;
    this.isSelectingMenu = true;
    this.openedEl = target;
    this.composerFocusStore.activeComposer.stopEdition();
  }

  closeMenus() {
    if (this.topBarToolStore.currentDropdown) {
      this.topBarToolStore.closeDropdowns();
    }
    this.state.toolsPopoverState.isOpen = false;
    this.state.menuState.isOpen = false;
    this.state.menuState.parentMenu = undefined;
    this.isSelectingMenu = false;
    this.openedEl = null;
  }

  getMenuName(menu: Action) {
    return menu.name(this.env);
  }

  setColor(target: string, color: Color) {
    setStyle(this.env, { [target]: color });
    this.onClick();
  }

  setFontSize(fontSize: number) {
    setStyle(this.env, { fontSize });
  }

  toggleMoreTools() {
    if (this.topBarToolStore.currentDropdown) {
      this.topBarToolStore.closeDropdowns();
    }
    this.state.toolsPopoverState.isOpen = !this.state.toolsPopoverState.isOpen;
  }

  get toolsPopoverProps(): PopoverProps {
    const rect = this.moreToolsButtonRef.el
      ? getBoundingRectAsPOJO(this.moreToolsButtonRef.el)
      : { x: 0, y: 0, width: 0, height: 0 };
    return {
      anchorRect: rect,
      positioning: "bottom-left",
      verticalOffset: 0,
      class: "rounded",
      maxWidth: 300,
    };
  }

  showDivider(categoryIndex: number) {
    return (
      categoryIndex < this.toolsCategories.length - 1 ||
      this.state.invisibleToolsCategories.length > 0
    );
  }

  private navigateMenu(key: string): "eventHandled" | "notHandled" {
    console.log("topBar navigate menu", key);
    const openedMenuIndex = this.menus.findIndex(
      (action) => action.id === this.state.menuState.parentMenu?.id || ""
    );
    if (openedMenuIndex === -1) {
      return "notHandled";
    }
    switch (key) {
      case "ArrowLeft": {
        const nextMenuIndex = (openedMenuIndex - 1 + this.menus.length) % this.menus.length;
        const nextMenu = this.menus[nextMenuIndex];
        this.openMenu(nextMenu, this.getMenuItemEl(nextMenu.id));
        return "eventHandled";
      }
      case "ArrowRight": {
        const nextMenuIndex = (openedMenuIndex + 1) % this.menus.length;
        const nextMenu = this.menus[nextMenuIndex];
        this.openMenu(nextMenu, this.getMenuItemEl(nextMenu.id));
        return "eventHandled";
      }
    }

    return "notHandled";
  }

  private getMenuItemEl(menuItemId: UID): HTMLElement | undefined {
    return (
      this.topBarTopRef.el?.querySelector<HTMLElement>(`[data-id="${menuItemId}"]`) || undefined
    );
  }
}
