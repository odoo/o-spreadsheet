import {
  Component,
  onMounted,
  onWillStart,
  onWillUnmount,
  onWillUpdateProps,
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
import { Color, DOMCoordinates, Pixel, SpreadsheetChildEnv } from "../../types/index";
import { ComposerFocusStore } from "../composer/composer_focus_store";
import { TopBarComposer } from "../composer/top_bar_composer/top_bar_composer";
import { css } from "../helpers/css";
import { getBoundingRectAsPOJO } from "../helpers/dom_helpers";
import { Menu, MenuState } from "../menu/menu";
import { Popover, PopoverProps } from "../popover";
import { TopBarToolStore } from "./top_bar_tool_store";
import { topBarToolBarRegistry } from "./top_bar_tools_registry";

interface State {
  menuState: MenuState;
  toolsCategories: string[];
  invisibleToolsCategories: string[];
  toolsPopoverState: { isOpen: boolean; position: DOMCoordinates | null };
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

/**
 * find the first index bigger than the current width and retract it from  the registry entries
 */
export const topbarToolsWidthThresholds = [750, 710, 560, 480];

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

  state: State = useState({
    menuState: { isOpen: false, position: null, menuItems: [] },
    toolsCategories: topBarToolBarRegistry.getCategories(),
    invisibleToolsCategories: [],
    toolsPopoverState: { isOpen: false, position: null },
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

  toolbarRef = useRef("toolbarRef");
  toolbarToolsRef = useRef("barTools");

  moreToolsContainerRef = useRef("moreToolsContainer");
  moreToolsButtonRef = useRef("moreToolsButton");

  setup() {
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.fingerprints = useStore(FormulaFingerprintStore);
    this.topBarToolStore = useStore(TopBarToolStore);
    useExternalListener(window, "click", this.onExternalClick);
    onWillStart(() => this.updateCellState());
    onWillUpdateProps(() => this.updateCellState());
    const resizeObserver = new ResizeObserver(() => {
      this.state.toolsPopoverState.isOpen = false;
      this.setVisiblityToolsGroups();
    });
    onMounted(() => {
      resizeObserver.observe(this.toolbarRef.el!);
    });
    onWillUnmount(() => {
      resizeObserver.disconnect();
    });
  }

  setVisiblityToolsGroups() {
    const categories = topBarToolBarRegistry.getCategories();
    const hiddenCategories: string[] = [];

    const { x: toolsX } = this.toolbarToolsRef.el!.getBoundingClientRect();
    const { x, width } = this.toolbarRef.el!.getBoundingClientRect();

    // Compute the with of the button that will toggle the hidden tools
    this.moreToolsContainerRef.el?.classList.remove("d-none");
    const moreToolsWidth = this.moreToolsButtonRef.el?.getBoundingClientRect().width || 0;

    // the actual width in which we can place our tools so that they are visible.
    // Every tool container that surpasses this width will be hidden.
    const usableWidth = width - moreToolsWidth - (toolsX - x);

    const elements = document.querySelectorAll(".tool-container");

    let currentWidth = 0;
    for (let elId = 0; elId < elements.length; elId++) {
      const element = elements[elId];
      element.classList.remove("d-none");
      const elWidth = element.getBoundingClientRect().width;
      currentWidth += elWidth;
      if (currentWidth > usableWidth) {
        element.classList.add("d-none");
        hiddenCategories.push(categories[elId]);
      }
    }

    this.state.toolsCategories = categories;
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
    const { left, top, height } = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.state.menuState.isOpen = true;
    this.state.menuState.position = { x: left, y: top + height };
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
      positioning: "BottomLeft",
      verticalOffset: 0,
      class: "rounded",
      maxWidth: 300,
    };
  }

  showDivider(categoryIndex: number) {
    return (
      categoryIndex < this.state.toolsCategories.length - 1 ||
      this.state.invisibleToolsCategories.length > 0
    );
  }
}
