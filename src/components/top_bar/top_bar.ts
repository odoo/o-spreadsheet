import { onMounted, onPatched, props, proxy, signal } from "@odoo/owl";
import { Action } from "../../actions/action";
import { setStyle } from "../../actions/menu_items_actions";
import { DEFAULT_FONT_SIZE } from "../../constants";
import { Component, useExternalListener } from "../../owl3_compatibility_layer";
import { formatNumberMenuItemSpec } from "../../registries/menus/number_format_menu_registry";
import { topbarMenuRegistry } from "../../registries/menus/topbar_menu_registry";
import { topbarComponentRegistry } from "../../registries/topbar_component_registry";
import { useStore } from "../../store_engine/store_hooks";
import { FormulaFingerprintStore } from "../../stores/formula_fingerprints_store";
import { Color, UID } from "../../types/misc";
import { PropsOf } from "../../types/props_of";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { ComposerFocusStore } from "../composer/composer_focus_store";
import { TopBarComposer } from "../composer/top_bar_composer/top_bar_composer";
import {
  getBoundingRectAsPOJO,
  getElBoundingRect,
  keyboardEventToShortcutString,
} from "../helpers/dom_helpers";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { MenuPopover, MenuState } from "../menu_popover/menu_popover";
import { NamedRangeSelector } from "../named_range_selector/named_range_selector";
import { useModel } from "../owl_plugins/model_plugin";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";
import { TopBarToolStore } from "./top_bar_tool_store";
import { topBarToolBarRegistry } from "./top_bar_tools_registry";

interface State {
  menuState: MenuState;
  invisibleToolsCategories: string[];
  toolsPopoverState: { isOpen: boolean };
}

// -----------------------------------------------------------------------------
// TopBar
// -----------------------------------------------------------------------------

export class TopBar extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBar";
  protected props = props({
    onClick: types.function([]),
    dropdownMaxHeight: types.Pixel(),
  });
  static components = {
    MenuPopover,
    TopBarComposer,
    Popover,
    NamedRangeSelector,
  };

  toolsCategories = topBarToolBarRegistry.getCategories();

  state: State = proxy({
    menuState: { isOpen: false, anchorRect: null, menuItems: [] },
    invisibleToolsCategories: [],
    toolsPopoverState: { isOpen: false },
  });

  isSelectingMenu = false;
  openedEl: HTMLElement | null = null;
  menus: Action[] = [];

  toolbarMenuRegistry = topBarToolBarRegistry;
  formatNumberMenuItemSpec = formatNumberMenuItemSpec;
  isntToolbarMenu = false;
  composerFocusStore!: Store<ComposerFocusStore>;
  fingerprints!: Store<FormulaFingerprintStore>;
  topBarToolStore!: Store<TopBarToolStore>;

  toolBarContainerRef = signal<HTMLElement | null>(null);
  toolbarRef = signal<HTMLElement | null>(null);
  namedRangesRef = signal<HTMLElement | null>(null);
  topBarTopRef = signal<HTMLElement | null>(null);

  moreToolsContainerRef = signal<HTMLElement | null>(null);
  moreToolsButtonRef = signal<HTMLElement | null>(null);

  spreadsheetRect = useSpreadsheetRect();

  private model = useModel();
  setup() {
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.fingerprints = useStore(FormulaFingerprintStore);
    this.topBarToolStore = useStore(TopBarToolStore);

    useExternalListener(window, "click", this.onExternalClick);
    useExternalListener(window, "keydown", this.onKeydown);
    this.menus = topbarMenuRegistry.getMenuItems();

    let lastWidth: number | undefined;
    const updateVisibility = () => {
      const currentWidth = this.spreadsheetRect.width;
      if (lastWidth !== currentWidth) {
        lastWidth = currentWidth;
        this.state.toolsPopoverState.isOpen = false;
        this.setVisibilityToolsGroups();
      }
    };
    onMounted(updateVisibility);
    onPatched(updateVisibility);
  }

  setVisibilityToolsGroups() {
    if (this.model().getters.isReadonly()) {
      return;
    }
    const hiddenCategories: string[] = [];

    const toolbarEl = this.toolbarRef();
    const containerEl = this.toolBarContainerRef();
    if (!toolbarEl || !containerEl) {
      return;
    }
    const { x: toolsX } = toolbarEl.getBoundingClientRect();
    const { x } = containerEl.getBoundingClientRect();

    // Compute the with of the button that will toggle the hidden tools
    this.moreToolsContainerRef()?.classList.remove("d-none");
    const moreToolsWidth = this.moreToolsButtonRef()?.getBoundingClientRect().width || 0;

    const namedRangeWidth = getElBoundingRect(this.namedRangesRef()).width;

    // The actual width in which we can place our tools so that they are visible.
    // Every tool container passed that width will be hidden.
    // We remove 16px to the width to account for a scrollbar that might appear.
    // Otherwise, we could end up in a loop of computation
    const usableWidth =
      Math.round(this.spreadsheetRect.width) - moreToolsWidth - (toolsX - x) - 16 - namedRangeWidth;

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
      this.moreToolsContainerRef()?.classList.add("d-none");
    }
  }

  get topbarComponents() {
    return topbarComponentRegistry
      .getAllOrdered()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
  }

  get currentFontSize(): number {
    return this.model().getters.getCurrentStyle().fontSize || DEFAULT_FONT_SIZE;
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

  onKeydown(ev: KeyboardEvent) {
    const keyDownString = keyboardEventToShortcutString(ev, "code");
    const menu = this.menus.find((m) => m.id === this.shortcutToMenuId[keyDownString]);
    if (menu) {
      ev.preventDefault();
      ev.stopPropagation();
      this.openMenu(menu, this.getMenuItemEl(menu.id));
      return;
    }
  }

  private shortcutToMenuId: Record<string, string> = {
    "Alt+Shift+KeyF": "file",
    "Alt+Shift+KeyE": "edit",
    "Alt+Shift+KeyV": "view",
    "Alt+Shift+KeyI": "insert",
    "Alt+Shift+KeyO": "format",
    "Alt+Shift+KeyD": "data",
  };

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

  private openMenu(menu: Action, target: HTMLElement | undefined, autoSelectFirstItem = false) {
    if (!target) {
      return;
    }
    if (this.topBarToolStore.currentDropdown) {
      this.topBarToolStore.closeDropdowns();
    }
    this.state.toolsPopoverState.isOpen = false;
    this.state.menuState.isOpen = true;
    this.state.menuState.anchorRect = getBoundingRectAsPOJO(target);
    this.state.menuState.menuItems = menu
      .children(this.model(), this.env)
      .sort((a, b) => a.sequence - b.sequence);
    this.state.menuState.parentMenu = menu;
    this.state.menuState.autoSelectFirstItem = autoSelectFirstItem;
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
    return menu.name(this.model(), this.env);
  }

  setColor(target: string, color: Color) {
    setStyle(this.model(), { [target]: color });
    this.onClick();
  }

  setFontSize(fontSize: number) {
    setStyle(this.model(), { fontSize });
  }

  toggleMoreTools() {
    if (this.topBarToolStore.currentDropdown) {
      this.topBarToolStore.closeDropdowns();
    }
    this.state.toolsPopoverState.isOpen = !this.state.toolsPopoverState.isOpen;
  }

  get toolsPopoverProps(): PropsOf<Popover> {
    const el = this.moreToolsButtonRef();
    const rect = el ? getBoundingRectAsPOJO(el) : { x: 0, y: 0, width: 0, height: 0 };
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

  onKeyboardNavigation(ev: KeyboardEvent) {
    const openedMenuIndex = this.menus.findIndex(
      (action) => action.id === this.state.menuState.parentMenu?.id || ""
    );
    if (openedMenuIndex === -1) {
      return;
    }
    switch (ev.key) {
      case "ArrowLeft": {
        const nextMenuIndex = (openedMenuIndex - 1 + this.menus.length) % this.menus.length;
        const nextMenu = this.menus[nextMenuIndex];
        this.openMenu(nextMenu, this.getMenuItemEl(nextMenu.id), true);
        break;
      }
      case "ArrowRight": {
        const nextMenuIndex = (openedMenuIndex + 1) % this.menus.length;
        const nextMenu = this.menus[nextMenuIndex];
        this.openMenu(nextMenu, this.getMenuItemEl(nextMenu.id), true);
        break;
      }
      case "Escape": {
        this.closeMenus();
        break;
      }
    }
  }

  private getMenuItemEl(menuItemId: UID): HTMLElement | undefined {
    return (
      this.topBarTopRef()?.querySelector<HTMLElement>(`[data-id="${menuItemId}"]`) || undefined
    );
  }
}
