import {
  Component,
  onWillStart,
  onWillUpdateProps,
  useExternalListener,
  useState,
} from "@odoo/owl";
import { ComponentsImportance, DEFAULT_FONT_SIZE } from "../../constants";
import { fontSizes } from "../../fonts";
import { isEqual } from "../../helpers/index";
import { interactiveAddMerge } from "../../helpers/ui/merge_interactive";
import { ComposerSelection } from "../../plugins/ui/edition";
import { setFormatter, setStyle, topbarComponentRegistry } from "../../registries/index";
import { getMenuChildren, getMenuName } from "../../registries/menus/helpers";
import { topbarMenuRegistry } from "../../registries/menus/topbar_menu_registry";
import { FullMenuItem } from "../../registries/menu_items_registry";
import {
  Align,
  BorderCommand,
  SetDecimalStep,
  SpreadsheetChildEnv,
  Style,
} from "../../types/index";
import { ColorPicker } from "../color_picker/color_picker";
import { Composer } from "../composer/composer/composer";
import { css } from "../helpers/css";
import { isChildEvent } from "../helpers/dom_helpers";
import { Menu, MenuState } from "../menu/menu";
import { ComposerFocusType } from "../spreadsheet/spreadsheet";
import { NumberFormatTerms } from "../translations_terms";

type Tool =
  | ""
  | "formatTool"
  | "alignTool"
  | "textColorTool"
  | "fillColorTool"
  | "borderTool"
  | "fontSizeTool";

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
}

// -----------------------------------------------------------------------------
// TopBar
// -----------------------------------------------------------------------------
css/* scss */ `
  .o-spreadsheet-topbar {
    .o-topbar-top {
      /* Menus */
      .o-topbar-topleft {
        .o-topbar-menu:hover,
        .o-topbar-menu-active {
          background-color: #f1f3f4;
        }
      }
    }
    /* Toolbar + Cell Content */
    .o-topbar-toolbar {
      .o-composer-container {
        margin-top: -1px;
      }

      /* Toolbar */
      .o-toolbar-tools {
        .o-tool.active,
        .o-tool:not(.o-disabled):hover {
          background-color: #f1f3f4;
        }

        .o-with-color > span {
          border-bottom: 4px solid;
          height: 16px;
          margin-top: 2px;
        }

        .o-with-color {
          .o-line-item:hover {
            outline: 1px solid gray;
          }
        }

        .o-dropdown {
          .o-text-options > div {
            &:hover {
              background-color: rgba(0, 0, 0, 0.08);
            }
          }

          .o-dropdown-content {
            z-index: ${ComponentsImportance.Dropdown};
            .o-dropdown-item:hover {
              background-color: rgba(0, 0, 0, 0.08);
            }

            .o-dropdown-line {
              .o-line-item {
                &:hover {
                  background-color: rgba(0, 0, 0, 0.08);
                }
              }
            }

            &.o-format-tool {
              width: 250px;
              > div {
                &.active:before {
                  content: "✓";
                  font-weight: bold;
                  position: absolute;
                  left: 5px;
                }
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
  DEFAULT_FONT_SIZE = DEFAULT_FONT_SIZE;

  static components = { ColorPicker, Menu, Composer };
  commonFormats = FORMATS;
  customFormats = CUSTOM_FORMATS;
  currentFormatName = "automatic";
  fontSizes = fontSizes;

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
  fillColor: string = "#ffffff";
  textColor: string = "#000000";
  menus: FullMenuItem[] = [];
  composerStyle = `
    line-height: 34px;
    padding-left: 8px;
    height: 34px;
    background-color: white;
  `;

  setup() {
    useExternalListener(window as any, "click", this.onClick);
    onWillStart(() => this.updateCellState());
    onWillUpdateProps(() => this.updateCellState());
  }

  get topbarComponents() {
    return topbarComponentRegistry
      .getAll()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
  }

  onClick(ev: MouseEvent) {
    if (this.openedEl && isChildEvent(this.openedEl, ev)) {
      return;
    }
    this.closeMenus();
  }

  toogleStyle(style: string) {
    setStyle(this.env, { [style]: !this.style[style] });
  }

  toogleFormat(formatName: string) {
    const formatter = FORMATS.find((f) => f.name === formatName);
    const value = (formatter && formatter.value) || "";
    setFormatter(this.env, value);
  }

  toggleAlign(align: Align) {
    setStyle(this.env, { ["align"]: align });
  }

  onMenuMouseOver(menu: FullMenuItem, ev: MouseEvent) {
    if (this.isSelectingMenu) {
      this.toggleContextMenu(menu, ev);
    }
  }

  toggleDropdownTool(tool: Tool, ev: MouseEvent) {
    const isOpen = this.state.activeTool === tool;
    this.closeMenus();
    this.state.activeTool = isOpen ? "" : tool;
    this.openedEl = isOpen ? null : (ev.target as HTMLElement);
  }

  toggleContextMenu(menu: FullMenuItem, ev: MouseEvent) {
    this.closeMenus();
    const { left, top, height } = (ev.target as HTMLElement).getBoundingClientRect();
    this.state.menuState.isOpen = true;
    this.state.menuState.position = { x: left, y: top + height };
    this.state.menuState.menuItems = getMenuChildren(menu, this.env).filter(
      (item) => !item.isVisible || item.isVisible(this.env)
    );
    this.state.menuState.parentMenu = menu;
    this.isSelectingMenu = true;
    this.openedEl = ev.target as HTMLElement;
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
    const { top, left, right, bottom } = zones[0];
    this.cannotMerge = zones.length > 1 || (top === bottom && left === right);
    this.inMerge = false;
    if (!this.cannotMerge) {
      const { col, row } = this.env.model.getters.getPosition();
      const zone = this.env.model.getters.expandZone(this.env.model.getters.getActiveSheetId(), {
        left: col,
        right: col,
        top: row,
        bottom: row,
      });
      this.inMerge = isEqual(zones[0], zone);
    }
    this.undoTool = this.env.model.getters.canUndo();
    this.redoTool = this.env.model.getters.canRedo();
    this.paintFormatTool = this.env.model.getters.isPaintingFormat();
    const cell = this.env.model.getters.getActiveCell();
    if (cell && cell.format) {
      const currentFormat = this.commonFormats.find((f) => f.value === cell.format);
      this.currentFormatName = currentFormat ? currentFormat.name : "";
    } else {
      this.currentFormatName = "automatic";
    }
    this.style = { ...this.env.model.getters.getCurrentStyle() };
    this.style.align = this.style.align || cell?.defaultAlign;
    this.fillColor = this.style.fillColor || "#ffffff";
    this.textColor = this.style.textColor || "#000000";

    this.menus = topbarMenuRegistry
      .getAll()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
  }

  getMenuName(menu: FullMenuItem) {
    return getMenuName(menu, this.env);
  }

  toggleMerge() {
    const zones = this.env.model.getters.getSelectedZones();
    const target = [zones[zones.length - 1]];
    const sheetId = this.env.model.getters.getActiveSheetId();
    if (this.inMerge) {
      this.env.model.dispatch("REMOVE_MERGE", { sheetId, target });
    } else {
      interactiveAddMerge(this.env, sheetId, target);
    }
  }

  setColor(target: string, color: string) {
    setStyle(this.env, { [target]: color });
  }

  setBorder(command: BorderCommand) {
    this.env.model.dispatch("SET_FORMATTING", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      target: this.env.model.getters.getSelectedZones(),
      border: command,
    });
  }

  setFormat(ev: MouseEvent) {
    const format = (ev.target as HTMLElement).dataset.format;
    if (format) {
      this.toogleFormat(format);
      return;
    }
    const custom = (ev.target as HTMLElement).dataset.custom;
    if (custom) {
      this.openCustomFormatSidePanel(custom);
    }
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

  setSize(ev: MouseEvent) {
    const fontSize = parseFloat((ev.target as HTMLElement).dataset.size!);
    setStyle(this.env, { fontSize });
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
}
