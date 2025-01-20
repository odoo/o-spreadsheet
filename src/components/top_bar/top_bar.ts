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
import * as ACTION_DATA from "../../actions/data_actions";
import * as ACTION_EDIT from "../../actions/edit_actions";
import * as ACTION_FORMAT from "../../actions/format_actions";
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
import { topBarToolBarRegistry } from "../../registries/toolbar_menu_registry";
import { Store, useStore } from "../../store_engine";
import { FormulaFingerprintStore } from "../../stores/formula_fingerprints_store";
import { Color, DOMCoordinates, Pixel, SpreadsheetChildEnv } from "../../types/index";
import { ActionButton } from "../action_button/action_button";
import { BorderEditorWidget } from "../border_editor/border_editor_widget";
import { ColorPicker } from "../color_picker/color_picker";
import { ColorPickerWidget } from "../color_picker/color_picker_widget";
import { ComposerFocusStore } from "../composer/composer_focus_store";
import { TopBarComposer } from "../composer/top_bar_composer/top_bar_composer";
import { FontSizeEditor } from "../font_size_editor/font_size_editor";
import { css } from "../helpers/css";
import { Menu, MenuState } from "../menu/menu";
import { Popover, PopoverProps } from "../popover";
import { TableDropdownButton } from "../tables/table_dropdown_button/table_dropdown_button";
import { PaintFormatButton } from "./../paint_format_button/paint_format_button";
import { TopBarFillColorEditor, TopBarTextColorEditor } from "./color_editor/color_editor";
import { DropdownAction } from "./dropdown_action/dropdown_action";
import { TopBarFontSizeEditor } from "./font_size_editor/font_size_editor";
import { NumberFormatsTool } from "./number_formats_tool/number_formats_tool";
import { TopBarToolStore } from "./top_bar_tool_store";

interface State {
  menuState: MenuState;
  visibleToolsCategories: string[];
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
    padding-left: 6px;
    margin-right: 6px;
  }

  .o-toolbar-button {
    height: 30px;
    box-sizing: border-box !important;
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
        height: 23px;
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
        margin: 0px 6px 0px 16px;
        cursor: default;
      }
    }
  }
`;

export const topbarToolsWidthThresholds = [750, 710, 560, 480];
/**
 * find the firs index bigger than the current width and retract it from  the registry entries
 */

export class TopBar extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBar";
  static props = {
    onClick: Function,
    dropdownMaxHeight: Number,
  };
  static components = {
    ColorPickerWidget,
    ColorPicker,
    Menu,
    TopBarComposer,
    FontSizeEditor,
    ActionButton,
    PaintFormatButton,
    BorderEditorWidget,
    TableDropdownButton,
    Popover,
  };

  state: State = useState({
    menuState: { isOpen: false, position: null, menuItems: [] },
    visibleToolsCategories: topBarToolBarRegistry.getCategories(),
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
      resizeObserver.observe(this.toolbarEl);
    });
    onWillUnmount(() => {
      resizeObserver.disconnect();
    });
  }

  setVisiblityToolsGroups() {
    const { width } = this.toolbarEl.getBoundingClientRect();
    const i = topbarToolsWidthThresholds.findLastIndex((rule) => width < rule);
    const categories = topBarToolBarRegistry.getCategories();

    this.state.visibleToolsCategories = categories.slice(0, categories.length - i - 1);
    this.state.invisibleToolsCategories = categories.slice(categories.length - i - 1);
  }

  get toolbarEl(): Element {
    return this.toolbarRef.el!;
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
      ? this.moreToolsButtonRef.el.getBoundingClientRect()
      : { x: 0, y: 0, width: 0, height: 0 };
    const anchorRect = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
    return {
      anchorRect,
      positioning: "BottomLeft",
      verticalOffset: 0,
      class: "rounded",
      maxWidth: 300,
    };
  }

  showDivider(categoryIndex: number) {
    return (
      categoryIndex < this.state.visibleToolsCategories.length - 1 ||
      this.state.invisibleToolsCategories.length > 0
    );
  }
}

/** TODORAR put this abomination somewhere else? */

topBarToolBarRegistry
  .add("edit")
  .addChild("edit", {
    component: ActionButton,
    props: {
      action: ACTION_EDIT.undo,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 1,
  })
  .addChild("edit", {
    component: ActionButton,
    props: {
      action: ACTION_EDIT.redo,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("edit", {
    component: PaintFormatButton,
    props: {
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 3,
  })
  .addChild("edit", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.clearFormat,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 4,
  })

  .add("numberFormat")
  .addChild("numberFormat", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatPercent,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 1,
  })
  .addChild("numberFormat", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.decreaseDecimalPlaces,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("numberFormat", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.increaseDecimalPlaces,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 3,
  })
  .addChild("numberFormat", {
    component: NumberFormatsTool,
    props: {
      class: "o-menu-item-button o-hoverable-button o-toolbar-button",
    },
    sequence: 4,
  })
  .add("fontSize")
  .addChild("fontSize", {
    component: TopBarFontSizeEditor,
    props: {
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 3,
  })
  .add("textStyle")
  .addChild("textStyle", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatBold,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 1,
  })
  .addChild("textStyle", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatItalic,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("textStyle", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatStrikethrough,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 3,
  })
  .addChild("textStyle", {
    component: TopBarTextColorEditor,
    props: {
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
      style: "textColor",
      icon: "o-spreadsheet-Icon.TEXT_COLOR",
    },
    sequence: 4,
  })
  .add("cellStyle")
  .addChild("cellStyle", {
    component: TopBarFillColorEditor,
    props: {
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
      style: "fillColor",
      icon: "o-spreadsheet-Icon.FILL_COLOR",
    },
    sequence: 1,
  })
  .addChild("cellStyle", {
    component: BorderEditorWidget,
    props: {
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("cellStyle", {
    component: ActionButton,
    props: {
      action: ACTION_EDIT.mergeCells,
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 3,
  })
  .add("alignment")
  .addChild("alignment", {
    component: DropdownAction,
    props: {
      parentAction: ACTION_FORMAT.formatAlignmentHorizontal,
      childActions: [
        ACTION_FORMAT.formatAlignmentLeft,
        ACTION_FORMAT.formatAlignmentCenter,
        ACTION_FORMAT.formatAlignmentRight,
      ],
      class: "o-hoverable-button o-toolbar-button",
      childClass: "o-hoverable-button",
    },
    sequence: 1,
  })
  .addChild("alignment", {
    component: DropdownAction,
    props: {
      parentAction: ACTION_FORMAT.formatAlignmentVertical,
      childActions: [
        ACTION_FORMAT.formatAlignmentTop,
        ACTION_FORMAT.formatAlignmentMiddle,
        ACTION_FORMAT.formatAlignmentBottom,
      ],
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
      childClass: "o-hoverable-button",
    },
    sequence: 2,
  })
  .addChild("alignment", {
    component: DropdownAction,
    props: {
      parentAction: ACTION_FORMAT.formatWrapping,
      childActions: [
        ACTION_FORMAT.formatWrappingOverflow,
        ACTION_FORMAT.formatWrappingWrap,
        ACTION_FORMAT.formatWrappingClip,
      ],
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
      childClass: "o-hoverable-button",
    },
    sequence: 3,
  })
  .add("misc")
  .addChild("misc", {
    component: TableDropdownButton,
    props: { class: "toolbar-button" },
    sequence: 1,
  })
  .addChild("misc", {
    component: ActionButton,
    props: {
      action: ACTION_DATA.createRemoveFilterTool,
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 2,
  });
