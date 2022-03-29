import {
  Component,
  onWillStart,
  onWillUpdateProps,
  useExternalListener,
  useState,
} from "@odoo/owl";
import { BACKGROUND_HEADER_COLOR, DEFAULT_FONT_SIZE } from "../../constants";
import { fontSizes } from "../../fonts";
import { isEqual } from "../../helpers/index";
import { setFormatter, setStyle, topbarComponentRegistry } from "../../registries/index";
import { topbarMenuRegistry } from "../../registries/menus/topbar_menu_registry";
import { FullMenuItem } from "../../registries/menu_items_registry";
import { _lt } from "../../translation";
import { Align, BorderCommand, CommandResult, SpreadsheetChildEnv, Style } from "../../types/index";
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
  { name: "general", text: `${NumberFormatTerms.General} (${NumberFormatTerms.NoSpecificFormat})` },
  { name: "number", text: `${NumberFormatTerms.Number} (1,000.12)`, value: "#,##0.00" },
  { name: "percent", text: `${NumberFormatTerms.Percent} (10.12%)`, value: "0.00%" },
  { name: "currency", text: `${NumberFormatTerms.Currency} ($1,000.12)`, value: "[$$]#,##0.00" },
  {
    name: "currency_rounded",
    text: `${NumberFormatTerms.CurrencyRounded} ($1,000)`,
    value: "[$$]#,##0",
  },
  { name: "date", text: `${NumberFormatTerms.Date} (9/26/2008)`, value: "m/d/yyyy" },
  { name: "time", text: `${NumberFormatTerms.Time} (10:43:00 PM)`, value: "hh:mm:ss a" },
  {
    name: "datetime",
    text: `${NumberFormatTerms.DateTime} (9/26/2008 22:43:00)`,
    value: "m/d/yyyy hh:mm:ss",
  },
  { name: "duration", text: `${NumberFormatTerms.Duration} (27:51:38)`, value: "hhhh:mm:ss" },
];

const CUSTOM_FORMATS = [
  { name: "custom_currency", text: NumberFormatTerms.CustomCurrency, sidePanel: "CustomCurrency" },
];

interface Props {
  onClick: () => void;
  focusComposer: Omit<ComposerFocusType, "cellFocus">;
  onComposerContentFocused: (selection: { start: number; end: number }) => void;
}

// -----------------------------------------------------------------------------
// TopBar
// -----------------------------------------------------------------------------
css/* scss */ `
  .o-spreadsheet-topbar {
    background-color: white;
    line-height: 1.2;
    display: flex;
    flex-direction: column;
    font-size: 13px;
    line-height: 1.2;
    user-select: none;

    .o-topbar-top {
      border-bottom: 1px solid #e0e2e4;
      display: flex;
      padding: 2px 10px;
      justify-content: space-between;

      /* Menus */
      .o-topbar-topleft {
        display: flex;
        .o-topbar-menu {
          padding: 4px 6px;
          margin: 0 2px;
          cursor: pointer;
        }

        .o-topbar-menu:hover {
          background-color: #f1f3f4;
          border-radius: 2px;
        }
      }

      .o-topbar-topright {
        display: flex;
        justify-content: flex-end;
      }
    }
    /* Toolbar + Cell Content */
    .o-topbar-toolbar {
      border-bottom: 1px solid #e0e2e4;
      display: flex;

      .o-readonly-toolbar {
        display: flex;
        align-items: center;
        background-color: ${BACKGROUND_HEADER_COLOR};
        padding-left: 18px;
        padding-right: 18px;
      }
      .o-composer-container {
        height: 34px;
        border: 1px solid #e0e2e4;
        margin-top: -1px;
        margin-bottom: -1px;
      }

      /* Toolbar */
      .o-toolbar-tools {
        display: flex;
        flex-shrink: 0;
        margin-left: 16px;
        color: #333;
        cursor: default;

        .o-tool {
          display: flex;
          align-items: center;
          margin: 2px;
          padding: 0 3px;
          border-radius: 2px;
          cursor: pointer;
          min-width: fit-content;
        }

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

        .o-border {
          .o-line-item {
            padding: 4px;
            margin: 1px;
          }
        }

        .o-divider {
          display: inline-block;
          border-right: 1px solid #e0e2e4;
          width: 0;
          margin: 0 6px;
        }

        .o-disabled {
          opacity: 0.6;
        }

        .o-dropdown {
          position: relative;

          .o-text-icon {
            height: 100%;
            line-height: 30px;
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
            top: calc(100% + 5px);
            left: 0;
            z-index: 10;
            box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
            background-color: white;

            .o-dropdown-item {
              padding: 7px 10px;
            }

            .o-dropdown-item:hover {
              background-color: rgba(0, 0, 0, 0.08);
            }

            .o-dropdown-line {
              display: flex;
              padding: 3px 6px;

              .o-line-item {
                width: 16px;
                height: 16px;
                margin: 1px 3px;

                &:hover {
                  background-color: rgba(0, 0, 0, 0.08);
                }
              }
            }

            &.o-format-tool {
              padding: 7px 0;
              > div {
                padding-left: 25px;
                white-space: nowrap;

                &.active:before {
                  content: "✓";
                  font-weight: bold;
                  position: absolute;
                  left: 10px;
                }
              }
            }
          }
        }
      }

      /* Cell Content */
      .o-toolbar-cell-content {
        font-size: 12px;
        font-weight: 500;
        padding: 0 12px;
        margin: 0;
        line-height: 34px;
        white-space: nowrap;
        user-select: text;
      }
    }
  }
`;
export class TopBar extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.TopBar";
  DEFAULT_FONT_SIZE = DEFAULT_FONT_SIZE;

  static components = { ColorPicker, Menu, Composer };
  formats = FORMATS;
  customFormats = CUSTOM_FORMATS;
  currentFormat = "general";
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
  fillColor: string = "white";
  textColor: string = "black";
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
    this.state.menuState.menuItems = topbarMenuRegistry
      .getChildren(menu, this.env)
      .filter((item) => !item.isVisible || item.isVisible(this.env));
    this.isSelectingMenu = true;
    this.openedEl = ev.target as HTMLElement;
  }

  closeMenus() {
    this.state.activeTool = "";
    this.state.menuState.isOpen = false;
    this.isSelectingMenu = false;
    this.openedEl = null;
  }

  updateCellState() {
    const zones = this.env.model.getters.getSelectedZones();
    const { top, left, right, bottom } = zones[0];
    this.cannotMerge = zones.length > 1 || (top === bottom && left === right);
    this.inMerge = false;
    if (!this.cannotMerge) {
      const [col, row] = this.env.model.getters.getPosition();
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
      const format = this.formats.find((f) => f.value === cell.format);
      this.currentFormat = format ? format.name : "";
    } else {
      this.currentFormat = "general";
    }
    this.style = { ...this.env.model.getters.getCurrentStyle() };
    this.style.align = this.style.align || cell?.defaultAlign;
    this.fillColor = this.style.fillColor || "white";
    this.textColor = this.style.textColor || "black";

    this.menus = topbarMenuRegistry
      .getAll()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
  }

  getMenuName(menu: FullMenuItem) {
    return topbarMenuRegistry.getName(menu, this.env);
  }

  toggleMerge() {
    const zones = this.env.model.getters.getSelectedZones();
    const target = [zones[zones.length - 1]];
    const sheetId = this.env.model.getters.getActiveSheetId();
    if (this.inMerge) {
      this.env.model.dispatch("REMOVE_MERGE", { sheetId, target });
    } else {
      const result = this.env.model.dispatch("ADD_MERGE", { sheetId, target });
      if (!result.isSuccessful) {
        if (result.isCancelledBecause(CommandResult.MergeIsDestructive)) {
          this.env.askConfirmation(
            _lt("Merging these cells will only preserve the top-leftmost value. Merge anyway?"),
            () => {
              this.env.model.dispatch("ADD_MERGE", { sheetId, target, force: true });
            }
          );
        }
      }
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

  setDecimal(step: number) {
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
