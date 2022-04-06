import { onWillStart, onWillUpdateProps, useState, xml } from "@odoo/owl";
import { BACKGROUND_HEADER_COLOR, DEFAULT_FONT_SIZE } from "../constants";
import { fontSizes } from "../fonts";
import { isEqual } from "../helpers/index";
import { setFormatter, setStyle, topbarComponentRegistry } from "../registries/index";
import { topbarMenuRegistry } from "../registries/menus/topbar_menu_registry";
import { FullMenuItem } from "../registries/menu_items_registry";
import { menuProvider } from "../stores/context_menu_store";
import { ConsumerComponent } from "../stores/providers";
import { _lt } from "../translation";
import { Align, BorderCommand, CommandResult, SpreadsheetChildEnv, Style } from "../types/index";
import { ColorPicker } from "./color_picker";
import { Composer } from "./composer/composer";
import { css } from "./helpers/css";
import * as icons from "./icons";
import { Menu } from "./menu";
import { ComposerFocusType } from "./spreadsheet";
import { GenericTerms, NumberFormatTerms, TopBarTerms } from "./translations_terms";

type Tool =
  | ""
  | "formatTool"
  | "alignTool"
  | "textColorTool"
  | "fillColorTool"
  | "borderTool"
  | "fontSizeTool";

interface State {
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
              width: 180px;
              padding: 7px 0;
              > div {
                padding-left: 25px;

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
export class TopBar extends ConsumerComponent<Props, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet-topbar o-two-columns" t-on-click="props.onClick">
      <div class="o-topbar-top">
        <!-- Menus -->
        <div class="o-topbar-topleft">
          <t t-foreach="menus" t-as="menu" t-key="menu_index">
            <div t-if="menu.children.length !== 0"
              class="o-topbar-menu"
              t-on-click="(ev) => this.toggleContextMenu(menu, ev)"
              t-on-mouseover="(ev) => this.onMenuMouseOver(menu, ev)"
              t-att-data-id="menu.id">
            <t t-esc="getMenuName(menu)"/>
          </div>
          </t>
        </div>
        <div class="o-topbar-topright">
          <div t-foreach="topbarComponents" t-as="comp" t-key="comp.id">
            <t t-component="comp.component"/>
          </div>
        </div>
      </div>
      <!-- Toolbar and Cell Content -->
      <div class="o-topbar-toolbar">
        <!-- Toolbar -->
        <div t-if="env.model.getters.isReadonly()" class="o-readonly-toolbar text-muted">
          <span>
            <i class="fa fa-eye" /> <t t-esc="env._t('${TopBarTerms.ReadonlyAccess}')" />
          </span>
        </div>
        <div t-else="" class="o-toolbar-tools">
          <div class="o-tool" title="${GenericTerms.Undo}" t-att-class="{'o-disabled': !undoTool}" t-on-click="undo" >${icons.UNDO_ICON}</div>
          <div class="o-tool" t-att-class="{'o-disabled': !redoTool}" title="${GenericTerms.Redo}"  t-on-click="redo">${icons.REDO_ICON}</div>
          <div class="o-tool" title="${TopBarTerms.PaintFormat}" t-att-class="{active:paintFormatTool}" t-on-click="paintFormat">${icons.PAINT_FORMAT_ICON}</div>
          <div class="o-tool" title="${TopBarTerms.ClearFormat}" t-on-click="clearFormatting">${icons.CLEAR_FORMAT_ICON}</div>
          <div class="o-divider"/>
          <div class="o-tool" title="${TopBarTerms.FormatPercent}" t-on-click="(ev) => this.toogleFormat('percent', ev)">%</div>
          <div class="o-tool" title="${TopBarTerms.DecreaseDecimal}" t-on-click="(ev) => this.setDecimal(-1, ev)">.0</div>
          <div class="o-tool" title="${TopBarTerms.IncreaseDecimal}" t-on-click="(ev) => this.setDecimal(+1, ev)">.00</div>
          <div class="o-tool o-dropdown" title="${TopBarTerms.MoreFormat}" t-on-click="(ev) => this.toggleDropdownTool('formatTool', ev)">
            <div class="o-text-icon">123${icons.TRIANGLE_DOWN_ICON}</div>
            <div class="o-dropdown-content o-text-options  o-format-tool "  t-if="state.activeTool === 'formatTool'" t-on-click="setFormat">
              <t t-foreach="formats" t-as="format" t-key="format.name">
                <div t-att-data-format="format.name" t-att-class="{active: currentFormat === format.name}"><t t-esc="format.text"/></div>
              </t>
              <t t-foreach="customFormats" t-as="customFormat" t-key="customFormat.name">
                <div t-att-data-custom="customFormat.name"><t t-esc="customFormat.text"/></div>
              </t>
            </div>
          </div>
          <div class="o-divider"/>
          <!-- <div class="o-tool" title="Font"><span>Roboto</span> ${icons.TRIANGLE_DOWN_ICON}</div> -->
          <div class="o-tool o-dropdown" title="${TopBarTerms.FontSize}" t-on-click="(ev) => this.toggleDropdownTool('fontSizeTool', ev)">
            <div class="o-text-icon"><t t-esc="style.fontSize || ${DEFAULT_FONT_SIZE}"/> ${icons.TRIANGLE_DOWN_ICON}</div>
            <div class="o-dropdown-content o-text-options "  t-if="state.activeTool === 'fontSizeTool'" t-on-click="setSize">
              <t t-foreach="fontSizes" t-as="font" t-key="font_index">
                <div t-esc="font.pt" t-att-data-size="font.pt"/>
              </t>
            </div>
          </div>
          <div class="o-divider"/>
          <div class="o-tool" title="${GenericTerms.Bold}" t-att-class="{active:style.bold}" t-on-click="(ev) => this.toogleStyle('bold', ev)">${icons.BOLD_ICON}</div>
          <div class="o-tool" title="${GenericTerms.Italic}" t-att-class="{active:style.italic}" t-on-click="(ev) => this.toogleStyle('italic', ev)">${icons.ITALIC_ICON}</div>
          <div class="o-tool" title="${GenericTerms.Strikethrough}"  t-att-class="{active:style.strikethrough}" t-on-click="(ev) => this.toogleStyle('strikethrough', ev)">${icons.STRIKE_ICON}</div>
          <div class="o-tool o-dropdown o-with-color">
            <span t-attf-style="border-color:{{textColor}}" title="${GenericTerms.TextColor}" t-on-click="(ev) => this.toggleDropdownTool('textColorTool', ev)">${icons.TEXT_COLOR_ICON}</span>
            <ColorPicker t-if="state.activeTool === 'textColorTool'" onColorPicked="(color) => this.setColor('textColor', color)" t-key="textColor"/>
          </div>
          <div class="o-divider"/>
          <div class="o-tool  o-dropdown o-with-color">
            <span t-attf-style="border-color:{{fillColor}}" title="${GenericTerms.FillColor}" t-on-click="(ev) => this.toggleDropdownTool('fillColorTool', ev)">${icons.FILL_COLOR_ICON}</span>
            <ColorPicker t-if="state.activeTool === 'fillColorTool'" onColorPicked="(color) => this.setColor('fillColor', color)" t-key="fillColor"/>
          </div>
          <div class="o-tool o-dropdown">
            <span title="${TopBarTerms.Borders}" t-on-click="(ev) => this.toggleDropdownTool('borderTool', ev)">${icons.BORDERS_ICON}</span>
            <div class="o-dropdown-content o-border" t-if="state.activeTool === 'borderTool'">
              <div class="o-dropdown-line">
                <span class="o-line-item" t-on-click="(ev) => this.setBorder('all', ev)">${icons.BORDERS_ICON}</span>
                <span class="o-line-item" t-on-click="(ev) => this.setBorder('hv', ev)">${icons.BORDER_HV}</span>
                <span class="o-line-item" t-on-click="(ev) => this.setBorder('h', ev)">${icons.BORDER_H}</span>
                <span class="o-line-item" t-on-click="(ev) => this.setBorder('v', ev)">${icons.BORDER_V}</span>
                <span class="o-line-item" t-on-click="(ev) => this.setBorder('external', ev)">${icons.BORDER_EXTERNAL}</span>
              </div>
              <div class="o-dropdown-line">
                <span class="o-line-item" t-on-click="(ev) => this.setBorder('left', ev)">${icons.BORDER_LEFT}</span>
                <span class="o-line-item" t-on-click="(ev) => this.setBorder('top', ev)">${icons.BORDER_TOP}</span>
                <span class="o-line-item" t-on-click="(ev) => this.setBorder('right', ev)">${icons.BORDER_RIGHT}</span>
                <span class="o-line-item" t-on-click="(ev) => this.setBorder('bottom', ev)">${icons.BORDER_BOTTOM}</span>
                <span class="o-line-item" t-on-click="(ev) => this.setBorder('clear', ev)">${icons.BORDER_CLEAR}</span>
              </div>
            </div>
          </div>
          <div class="o-tool o-merge-tool" title="${TopBarTerms.MergeCells}"  t-att-class="{active:inMerge, 'o-disabled': cannotMerge}" t-on-click="toggleMerge">${icons.MERGE_CELL_ICON}</div>
          <div class="o-divider"/>
          <div class="o-tool o-dropdown" title="${TopBarTerms.HorizontalAlign}" t-on-click="(ev) => this.toggleDropdownTool('alignTool', ev)">
            <span>
              <t t-if="style.align === 'right'">${icons.ALIGN_RIGHT_ICON}</t>
              <t t-elif="style.align === 'center'">${icons.ALIGN_CENTER_ICON}</t>
              <t t-else="">${icons.ALIGN_LEFT_ICON}</t>
              ${icons.TRIANGLE_DOWN_ICON}
            </span>
            <div t-if="state.activeTool === 'alignTool'" class="o-dropdown-content">
              <div class="o-dropdown-item" t-on-click="(ev) => this.toggleAlign('left', ev)">${icons.ALIGN_LEFT_ICON}</div>
              <div class="o-dropdown-item" t-on-click="(ev) => this.toggleAlign('center', ev)">${icons.ALIGN_CENTER_ICON}</div>
              <div class="o-dropdown-item" t-on-click="(ev) => this.toggleAlign('right', ev)">${icons.ALIGN_RIGHT_ICON}</div>
            </div>
          </div>
          <!-- <div class="o-tool" title="Vertical align"><span>${icons.ALIGN_MIDDLE_ICON}</span> ${icons.TRIANGLE_DOWN_ICON}</div> -->
          <!-- <div class="o-tool" title="Text Wrapping">${icons.TEXT_WRAPPING_ICON}</div> -->
        </div>
        <Composer inputStyle="composerStyle" focus="props.focusComposer" onComposerContentFocused="props.onComposerContentFocused"/>

      </div>
    </div>`;

  static components = { ColorPicker, Menu, Composer };
  formats = FORMATS;
  customFormats = CUSTOM_FORMATS;
  currentFormat = "general";
  fontSizes = fontSizes;

  style: Style = {};
  state: State = useState({
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
    super.setup();
    onWillStart(() => this.updateCellState());
    onWillUpdateProps(() => this.updateCellState());
  }

  get contextMenu() {
    return this.providers.notify(menuProvider);
  }

  get topbarComponents() {
    return topbarComponentRegistry
      .getAll()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
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
    const x = (ev.target as HTMLElement).offsetLeft;
    const y = (ev.target as HTMLElement).clientHeight + (ev.target as HTMLElement).offsetTop;
    const menuItems = topbarMenuRegistry
      .getChildren(menu, this.env)
      .filter((item) => !item.isVisible || item.isVisible(this.env));
    this.contextMenu.open(menuItems, { x, y });
    this.isSelectingMenu = true;
    this.openedEl = ev.target as HTMLElement;
  }

  closeMenus() {
    this.state.activeTool = "";
    this.contextMenu.close();
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
