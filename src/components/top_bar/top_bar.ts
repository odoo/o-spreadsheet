import {
  Component,
  onWillStart,
  onWillUpdateProps,
  useExternalListener,
  useState,
} from "@odoo/owl";
import {
  BACKGROUND_HEADER_COLOR,
  BACKGROUND_HEADER_FILTER_COLOR,
  BG_HOVER_COLOR,
  ComponentsImportance,
  FILTERS_COLOR,
  ICONS_COLOR,
  SEPARATOR_COLOR,
  TOPBAR_TOOLBAR_HEIGHT,
} from "../../constants";
import { ComposerSelection } from "../../plugins/ui_stateful/edition";
import {
  formatNumberMenuItemSpec,
  setStyle,
  topbarComponentRegistry,
} from "../../registries/index";
import * as editMenuItems from "../../registries/menus/items/edit_menu_items";
import * as formatMenuItems from "../../registries/menus/items/format_menu_items";
import * as viewMenuItems from "../../registries/menus/items/view_menu_items";
import { topbarMenuRegistry } from "../../registries/menus/topbar_menu_registry";
import { createMenuItem, MenuItem, MenuItemSpec } from "../../registries/menu_items_registry";
import { Color, Pixel, SpreadsheetChildEnv } from "../../types/index";
import { ColorPicker } from "../color_picker/color_picker";
import { ColorPickerWidget } from "../color_picker/color_picker_widget";
import { TopBarComposer } from "../composer/top_bar_composer/top_bar_composer";
import { FontSizeEditor } from "../font_size_editor/font_size_editor";
import { css } from "../helpers/css";
import { Menu, MenuState } from "../menu/menu";
import { MenuItemButton } from "../menu_item_button/menu_item_button";
import { ComposerFocusType } from "../spreadsheet/spreadsheet";

interface State {
  menuState: MenuState;
  activeTool: string;
  fillColor: string;
  textColor: string;
}

interface Props {
  onClick: () => void;
  focusComposer: Omit<ComposerFocusType, "cellFocus">;
  onComposerContentFocused: (selection: ComposerSelection) => void;
  dropdownMaxHeight: Pixel;
}

// If we ever change these colors, make sure the filter tool stays green to match the icon in the grid
const ACTIVE_BG_COLOR = BACKGROUND_HEADER_FILTER_COLOR;
const ACTIVE_FONT_COLOR = FILTERS_COLOR;

const HOVERED_BG_COLOR = BG_HOVER_COLOR;
const HOVERED_FONT_COLOR = "#000";

// -----------------------------------------------------------------------------
// TopBar
// -----------------------------------------------------------------------------
css/* scss */ `
  .o-spreadsheet-topbar {
    line-height: 1.2;
    font-size: 13px;
    font-weight: 500;

    .o-topbar-hoverable {
      cursor: pointer;
      .o-icon {
        color: ${ICONS_COLOR};
      }
      &:not(.o-disabled):not(.active):hover {
        background-color: ${HOVERED_BG_COLOR};
        color: ${HOVERED_FONT_COLOR};
        .o-icon {
          color: ${HOVERED_FONT_COLOR};
        }
      }
      &.active {
        background-color: ${ACTIVE_BG_COLOR};
        color: ${ACTIVE_FONT_COLOR};
        .o-icon {
          color: ${ACTIVE_FONT_COLOR};
        }
      }
    }

    .o-topbar-top {
      border-bottom: 1px solid ${SEPARATOR_COLOR};
      padding: 2px 10px;

      /* Menus */
      .o-topbar-topleft {
        .o-topbar-menu {
          padding: 4px 6px;
          margin: 0 2px;
        }
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
        display: flex;
        flex-shrink: 0;
        margin: 0px 6px 0px 16px;
        cursor: default;

        .o-divider {
          display: inline-block;
          border-right: 1px solid ${SEPARATOR_COLOR};
          width: 0;
          margin: 0 6px;
        }

        .o-dropdown {
          position: relative;
          display: flex;
          align-items: center;

          > span {
            height: 30px;
          }

          .o-dropdown-content {
            position: absolute;
            top: 100%;
            left: 0;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 2px;
            z-index: ${ComponentsImportance.Dropdown};
            box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
            background-color: white;

            .o-dropdown-line {
              display: flex;

              > span {
                padding: 4px;
              }
            }
          }
        }
      }
    }
  }
`;
export class TopBar extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBar";
  get dropdownStyle() {
    return `max-height:${this.props.dropdownMaxHeight}px`;
  }
  static components = {
    ColorPickerWidget,
    ColorPicker,
    Menu,
    TopBarComposer,
    FontSizeEditor,
    MenuItemButton,
  };

  state: State = useState({
    menuState: { isOpen: false, position: null, menuItems: [] },
    activeTool: "",
    fillColor: "#ffffff",
    textColor: "#000000",
  });
  isSelectingMenu = false;
  openedEl: HTMLElement | null = null;
  menus: MenuItem[] = [];
  editMenuItems = editMenuItems;
  formatMenuItems = formatMenuItems;
  viewMenuItems = viewMenuItems;
  formatNumberMenuItemSpec = formatNumberMenuItemSpec;
  isntToolbarMenu = false;

  setup() {
    useExternalListener(window, "click", this.onExternalClick);
    onWillStart(() => this.updateCellState());
    onWillUpdateProps(() => this.updateCellState());
  }

  get topbarComponents() {
    return topbarComponentRegistry
      .getAll()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
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

  onMenuMouseOver(menu: MenuItem, ev: MouseEvent) {
    if (this.isSelectingMenu && this.isntToolbarMenu) {
      this.openMenu(menu, ev);
    }
  }

  toggleDropdownTool(tool: string, ev: MouseEvent) {
    const isOpen = this.state.activeTool === tool;
    this.closeMenus();
    this.state.activeTool = isOpen ? "" : tool;
    this.openedEl = isOpen ? null : (ev.target as HTMLElement);
  }

  toggleContextMenu(menu: MenuItem, ev: MouseEvent) {
    if (this.state.menuState.isOpen && this.isntToolbarMenu) {
      this.closeMenus();
    } else {
      this.openMenu(menu, ev);
      this.isntToolbarMenu = true;
    }
  }

  toggleToolbarContextMenu(menuSpec: MenuItemSpec, ev: MouseEvent) {
    if (this.state.menuState.isOpen && !this.isntToolbarMenu) {
      this.closeMenus();
    } else {
      const menu = createMenuItem(menuSpec);
      this.openMenu(menu, ev);
      this.isntToolbarMenu = false;
    }
  }

  private openMenu(menu: MenuItem, ev: MouseEvent) {
    const { left, top, height } = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.state.activeTool = "";
    this.state.menuState.isOpen = true;
    this.state.menuState.position = { x: left, y: top + height };
    this.state.menuState.menuItems = menu.children(this.env);
    this.state.menuState.parentMenu = menu;
    this.isSelectingMenu = true;
    this.openedEl = ev.target as HTMLElement;
    this.env.model.dispatch("STOP_EDITION");
  }

  closeMenus() {
    this.state.activeTool = "";
    this.state.menuState.isOpen = false;
    this.state.menuState.parentMenu = undefined;
    this.isSelectingMenu = false;
    this.openedEl = null;
  }

  updateCellState() {
    const style = this.env.model.getters.getCurrentStyle();
    this.state.fillColor = style.fillColor || "#ffffff";
    this.state.textColor = style.textColor || "#000000";
    this.menus = topbarMenuRegistry.getMenuItems();
  }

  getMenuName(menu: MenuItem) {
    return menu.name(this.env);
  }

  setColor(target: string, color: Color) {
    setStyle(this.env, { [target]: color });
    this.onClick();
  }
}

TopBar.props = {
  onClick: Function,
  focusComposer: String,
  onComposerContentFocused: Function,
  dropdownMaxHeight: Number,
};
