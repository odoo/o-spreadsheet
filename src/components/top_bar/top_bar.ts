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
  SEPARATOR_COLOR,
  TOPBAR_TOOLBAR_HEIGHT,
} from "../../constants";
import { areZonesContinuous, isEqual, positionToZone } from "../../helpers/index";
import { interactiveAddFilter } from "../../helpers/ui/filter_interactive";
import { interactiveAddMerge } from "../../helpers/ui/merge_interactive";
import { ComposerSelection } from "../../plugins/ui_stateful/edition";
import { setFormatter, setStyle, topbarComponentRegistry } from "../../registries/index";
import { topbarMenuRegistry } from "../../registries/menus/topbar_menu_registry";
import { MenuItem } from "../../registries/menu_items_registry";
import {
  Align,
  BorderCommand,
  Color,
  Format,
  Pixel,
  SetDecimalStep,
  SpreadsheetChildEnv,
  Style,
  VerticalAlign,
  Wrapping,
} from "../../types/index";
import { ColorPickerWidget } from "../color_picker/color_picker_widget";
import { TopBarComposer } from "../composer/top_bar_composer/top_bar_composer";
import { FontSizeEditor } from "../font_size_editor/font_size_editor";
import { css } from "../helpers/css";
import { Menu, MenuState } from "../menu/menu";
import { ComposerFocusType } from "../spreadsheet/spreadsheet";
import { NumberFormatTerms } from "../translations_terms";

type Tool = "" | "formatTool" | "alignTool" | "textColorTool" | "fillColorTool" | "borderTool";

interface State {
  menuState: MenuState;
  activeTool: Tool;
}

const FORMATS = [
  { name: "automatic", text: NumberFormatTerms.Automatic },
  { name: "number", text: NumberFormatTerms.Number, description: "1,000.12", value: "#,##0.00" },
  { name: "percent", text: NumberFormatTerms.Percent, description: "10.12%", value: "0.00%" },
  {
    name: "currency",
    text: NumberFormatTerms.Currency,
    description: "$1,000.12",
    value: "[$$]#,##0.00",
  },
  {
    name: "currency_rounded",
    text: NumberFormatTerms.CurrencyRounded,
    description: "$1,000",
    value: "[$$]#,##0",
  },
  { name: "date", text: NumberFormatTerms.Date, description: "9/26/2008", value: "m/d/yyyy" },
  { name: "time", text: NumberFormatTerms.Time, description: "10:43:00 PM", value: "hh:mm:ss a" },
  {
    name: "datetime",
    text: NumberFormatTerms.DateTime,
    description: "9/26/2008 22:43:00",
    value: "m/d/yyyy hh:mm:ss",
  },
  {
    name: "duration",
    text: NumberFormatTerms.Duration,
    description: "27:51:38",
    value: "hhhh:mm:ss",
  },
];

const CUSTOM_FORMATS = [
  { name: "custom_currency", text: NumberFormatTerms.CustomCurrency, sidePanel: "CustomCurrency" },
];

interface Props {
  onClick: () => void;
  focusComposer: Omit<ComposerFocusType, "cellFocus">;
  onComposerContentFocused: (selection: ComposerSelection) => void;
  dropdownMaxHeight: Pixel;
}

const ICONS_COLOR = "#4A4F59";

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
        .o-tool {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 2px;
          padding: 0px 3px;
          border-radius: 2px;
          min-width: 20px;
        }

        .o-filter-tool {
          margin-right: 8px;
        }

        .o-border-dropdown {
          padding: 4px;
        }

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

          .o-dropdown-button {
            height: 30px;
          }

          .o-text-options > div {
            line-height: 26px;
            padding: 3px 12px;
            &:hover {
              background-color: rgba(0, 0, 0, 0.08);
            }
          }

          .o-dropdown-content {
            position: absolute;
            top: 100%;
            left: 0;
            overflow-y: auto;
            overflow-x: hidden;
            z-index: ${ComponentsImportance.Dropdown};
            box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
            background-color: white;

            .o-dropdown-line {
              display: flex;
              margin: 1px;

              .o-line-item {
                padding: 4px;
                width: 18px;
                height: 18px;
              }
            }

            &.o-format-tool {
              padding: 5px 0;
              width: 250px;
              font-size: 12px;
              > div {
                padding: 0 20px;
                white-space: nowrap;

                &.o-dropdown-active:before {
                  content: "✓";
                  font-weight: bold;
                  position: absolute;
                  left: 5px;
                }
              }
            }

            .o-dropdown-align-item {
              padding: 7px 10px;
            }
          }
        }
      }
    }
  }
`;
export class TopBar extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBar";
  static components = { ColorPickerWidget, Menu, TopBarComposer, FontSizeEditor };
  commonFormats = FORMATS;
  customFormats = CUSTOM_FORMATS;
  currentFormatName = "automatic";

  get dropdownStyle() {
    return `max-height:${this.props.dropdownMaxHeight}px`;
  }

  style: Style = {};
  state: State = useState({
    menuState: { isOpen: false, position: null, menuItems: [] },
    activeTool: "",
  });
  isSelectingMenu = false;
  openedEl: HTMLElement | null = null;
  inMerge = false;
  cannotMerge = false;
  undoTool = false;
  redoTool = false;
  paintFormatTool = false;
  fillColor: Color = "#ffffff";
  textColor: Color = "#000000";
  menus: MenuItem[] = [];

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

  toggleStyle(style: string) {
    setStyle(this.env, { [style]: !this.style[style] });
  }

  toggleFormat(formatName: string) {
    const formatter = FORMATS.find((f) => f.name === formatName);
    const value = (formatter && formatter.value) || "";
    setFormatter(this.env, value);
  }

  toggleHorizontalAlign(align: Align) {
    setStyle(this.env, { align });
    this.onClick();
  }

  toggleVerticalAlign(verticalAlign: VerticalAlign) {
    setStyle(this.env, { verticalAlign });
    this.onClick();
  }

  toggleTextWrapping(wrapping: Wrapping) {
    setStyle(this.env, { wrapping });
    this.onClick();
  }

  onMenuMouseOver(menu: MenuItem, ev: MouseEvent) {
    if (this.isSelectingMenu) {
      this.openMenu(menu, ev);
    }
  }

  toggleDropdownTool(tool: Tool, ev: MouseEvent) {
    const isOpen = this.state.activeTool === tool;
    this.closeMenus();
    this.state.activeTool = isOpen ? "" : tool;
    this.openedEl = isOpen ? null : (ev.target as HTMLElement);
  }

  toggleContextMenu(menu: MenuItem, ev: MouseEvent) {
    if (this.state.menuState.isOpen) {
      this.closeMenus();
    } else {
      this.openMenu(menu, ev);
    }
  }

  private openMenu(menu: MenuItem, ev: MouseEvent) {
    const { left, top, height } = (ev.target as HTMLElement).getBoundingClientRect();
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
    const zones = this.env.model.getters.getSelectedZones();
    const { col, row, sheetId } = this.env.model.getters.getActivePosition();
    this.inMerge = false;
    const { top, left, right, bottom } = this.env.model.getters.getSelectedZone();
    const { xSplit, ySplit } = this.env.model.getters.getPaneDivisions(sheetId);
    this.cannotMerge =
      zones.length > 1 ||
      (top === bottom && left === right) ||
      (left < xSplit && xSplit <= right) ||
      (top < ySplit && ySplit <= bottom);
    if (!this.cannotMerge) {
      const zone = this.env.model.getters.expandZone(sheetId, positionToZone({ col, row }));
      this.inMerge = isEqual(zones[0], zone);
    }
    this.undoTool = this.env.model.getters.canUndo();
    this.redoTool = this.env.model.getters.canRedo();
    this.paintFormatTool = this.env.model.getters.isPaintingFormat();
    const cell = this.env.model.getters.getActiveCell();
    if (cell.format) {
      const currentFormat = this.commonFormats.find((f) => f.value === cell.format);
      this.currentFormatName = currentFormat ? currentFormat.name : "";
    } else {
      this.currentFormatName = "automatic";
    }
    this.style = { ...this.env.model.getters.getCurrentStyle() };
    this.style.align = this.style.align || cell.defaultAlign;
    this.fillColor = this.style.fillColor || "#ffffff";
    this.textColor = this.style.textColor || "#000000";

    this.menus = topbarMenuRegistry.getMenuItems();
  }

  getMenuName(menu: MenuItem) {
    return menu.name(this.env);
  }

  toggleMerge() {
    if (this.cannotMerge) {
      return;
    }
    const zones = this.env.model.getters.getSelectedZones();
    const target = [zones[zones.length - 1]];
    const sheetId = this.env.model.getters.getActiveSheetId();
    if (this.inMerge) {
      this.env.model.dispatch("REMOVE_MERGE", { sheetId, target });
    } else {
      interactiveAddMerge(this.env, sheetId, target);
    }
  }

  setColor(target: string, color: Color) {
    setStyle(this.env, { [target]: color });
    this.onClick();
  }

  setBorder(command: BorderCommand) {
    this.env.model.dispatch("SET_FORMATTING", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      target: this.env.model.getters.getSelectedZones(),
      border: command,
    });
    this.onClick();
  }

  setFormat(format: Format, custom: boolean) {
    if (!custom) {
      this.toggleFormat(format);
    } else {
      this.openCustomFormatSidePanel(format);
    }
    this.onClick();
  }

  openCustomFormatSidePanel(custom: string) {
    const customFormatter = CUSTOM_FORMATS.find((c) => c.name === custom);
    const sidePanel = (customFormatter && customFormatter.sidePanel) || "";
    this.env.openSidePanel(sidePanel);
  }

  setDecimal(step: SetDecimalStep) {
    this.env.model.dispatch("SET_DECIMAL", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      target: this.env.model.getters.getSelectedZones(),
      step: step,
    });
  }

  paintFormat() {
    this.env.model.dispatch("ACTIVATE_PAINT_FORMAT", {
      target: this.env.model.getters.getSelectedZones(),
    });
  }

  clearFormatting() {
    this.env.model.dispatch("CLEAR_FORMATTING", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      target: this.env.model.getters.getSelectedZones(),
    });
  }

  doAction(action: (env: SpreadsheetChildEnv) => void) {
    action(this.env);
    this.closeMenus();
  }

  undo() {
    this.env.model.dispatch("REQUEST_UNDO");
  }

  redo() {
    this.env.model.dispatch("REQUEST_REDO");
  }

  get selectionContainsFilter() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const selectedZones = this.env.model.getters.getSelectedZones();
    return this.env.model.getters.doesZonesContainFilter(sheetId, selectedZones);
  }

  get cannotCreateFilter() {
    return !areZonesContinuous(...this.env.model.getters.getSelectedZones());
  }

  createFilter() {
    if (this.cannotCreateFilter) {
      return;
    }
    this.env.model.selection.selectTableAroundSelection();
    const sheetId = this.env.model.getters.getActiveSheetId();
    const selection = this.env.model.getters.getSelectedZones();
    interactiveAddFilter(this.env, sheetId, selection);
  }

  removeFilter() {
    this.env.model.dispatch("REMOVE_FILTER_TABLE", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      target: this.env.model.getters.getSelectedZones(),
    });
  }
}

TopBar.props = {
  onClick: Function,
  focusComposer: String,
  onComposerContentFocused: Function,
  dropdownMaxHeight: Number,
};
