import {
  Component,
  onWillStart,
  onWillUpdateProps,
  useEffect,
  useExternalListener,
  useRef,
  useState,
} from "@odoo/owl";
import { Action } from "../../actions/action";
import { setStyle } from "../../actions/menu_items_actions";
import {
  ALERT_INFO_BORDER,
  BACKGROUND_HEADER_COLOR,
  BUTTON_ACTIVE_BG,
  BUTTON_ACTIVE_TEXT_COLOR,
  DEFAULT_FONT_SIZE,
  SEPARATOR_COLOR,
  TOPBAR_TOOLBAR_HEIGHT,
} from "../../constants";
import { formatNumberMenuItemSpec, topbarComponentRegistry } from "../../registries/index";
import { topbarMenuRegistry } from "../../registries/menus/topbar_menu_registry";
import { Store, useStore } from "../../store_engine";
import { FormulaFingerprintStore } from "../../stores/formula_fingerprints_store";
import { Color, Pixel, SpreadsheetChildEnv } from "../../types/index";
import { ComposerFocusStore } from "../composer/composer_focus_store";
import { TopBarComposer } from "../composer/top_bar_composer/top_bar_composer";
import { css } from "../helpers/css";
import { getBoundingRectAsPOJO } from "../helpers/dom_helpers";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { Menu, MenuState } from "../menu/menu";
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
css/* scss */ `
  .o-topbar-divider {
    border-right: 1px solid ${SEPARATOR_COLOR};
    width: 0;
    margin: 0 6px;
  }

  .o-toolbar-button {
    height: 30px;
  }

  .o-spreadsheet-topbar {
    line-height: 1.2;
    font-size: 13px;
    font-weight: 500;
    background-color: #fff;

    .o-topbar-top {
      border-bottom: 1px solid ${SEPARATOR_COLOR};
      padding: 2px 10px;

      /* Menus */
      .o-topbar-topleft {
        .o-topbar-menu {
          padding: 4px 6px;
          margin: 0 2px;

          &.active {
            background-color: ${BUTTON_ACTIVE_BG};
            color: ${BUTTON_ACTIVE_TEXT_COLOR};
          }
        }
      }
    }

    .irregularity-map {
      border-top: 1px solid ${SEPARATOR_COLOR};
      height: ${TOPBAR_TOOLBAR_HEIGHT}px;

      .alert-info {
        border-left: 3px solid ${ALERT_INFO_BORDER};
      }
    }

    .o-topbar-composer {
      flex-grow: 1;
    }

    /* Toolbar */
    .o-topbar-toolbar {
      height: ${TOPBAR_TOOLBAR_HEIGHT}px;

      .o-readonly-toolbar {
        background-color: ${BACKGROUND_HEADER_COLOR};
        padding-left: 18px;
        padding-right: 18px;
      }

      /* Toolbar */
      .o-toolbar-tools {
        cursor: default;
      }
    }
  }
`;

export class TopBar extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBar";
  static props = {
    onClick: Function,
    dropdownMaxHeight: Number,
  };
  static components = {
    Menu,
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

  toolbarMenuRegistry = topBarToolBarRegistry;
  formatNumberMenuItemSpec = formatNumberMenuItemSpec;
  isntToolbarMenu = false;
  composerFocusStore!: Store<ComposerFocusStore>;
  fingerprints!: Store<FormulaFingerprintStore>;
  topBarToolStore!: Store<TopBarToolStore>;

  toolBarContainerRef = useRef("toolBarContainer");
  toolbarRef = useRef("toolBar");

  moreToolsContainerRef = useRef("moreToolsContainer");
  moreToolsButtonRef = useRef("moreToolsButton");

  spreadsheetRect = useSpreadsheetRect();

  setup() {
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.fingerprints = useStore(FormulaFingerprintStore);
    this.topBarToolStore = useStore(TopBarToolStore);
    useExternalListener(window, "click", this.onExternalClick);
    onWillStart(() => this.updateCellState());
    onWillUpdateProps(() => this.updateCellState());

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
    // external listener of the Menu component to close the context menu when
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
      this.openMenu(menu, ev);
    }
  }

  toggleContextMenu(menu: Action, ev: MouseEvent) {
    if (this.state.menuState.isOpen && this.isntToolbarMenu) {
      this.closeMenus();
    } else {
      this.openMenu(menu, ev);
      this.isntToolbarMenu = true;
    }
  }

  private openMenu(menu: Action, ev: MouseEvent) {
    this.topBarToolStore.closeDropdowns();
    this.state.toolsPopoverState.isOpen = false;
    this.state.menuState.isOpen = true;
    this.state.menuState.anchorRect = getBoundingRectAsPOJO(ev.currentTarget as HTMLElement);
    this.state.menuState.menuItems = menu
      .children(this.env)
      .sort((a, b) => a.sequence - b.sequence);
    this.state.menuState.parentMenu = menu;
    this.isSelectingMenu = true;
    this.openedEl = ev.target as HTMLElement;
    this.composerFocusStore.activeComposer.stopEdition();
  }

  closeMenus() {
    this.topBarToolStore.closeDropdowns();
    this.state.toolsPopoverState.isOpen = false;
    this.state.menuState.isOpen = false;
    this.state.menuState.parentMenu = undefined;
    this.isSelectingMenu = false;
    this.openedEl = null;
  }

  updateCellState() {
    this.menus = topbarMenuRegistry.getMenuItems();
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
    this.topBarToolStore.closeDropdowns();
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
}
