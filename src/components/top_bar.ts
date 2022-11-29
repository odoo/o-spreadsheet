import * as owl from "@odoo/owl";
import { DEFAULT_FONT_SIZE } from "../constants";
import { fontSizes } from "../fonts";
import { isEqual } from "../helpers/index";
import { setFormatter, setStyle, topbarComponentRegistry } from "../registries/index";
import { topbarMenuRegistry } from "../registries/menus/topbar_menu_registry";
import { FullMenuItem } from "../registries/menu_items_registry";
import { Align, BorderCommand, SpreadsheetEnv, Style } from "../types/index";
import { ColorPicker } from "./color_picker";
import { isChildEvent } from "./helpers/dom_helpers";
import * as icons from "./icons";
import { Menu, MenuState } from "./menu";

const { useState, hooks } = owl;
const Component = owl.Component;
const { xml, css } = owl.tags;
const { useExternalListener, useRef } = hooks;

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
  { name: "auto", text: "Automatic" },
  { name: "number", text: "Number (1,000.12)", value: "#,##0.00" },
  { name: "percent", text: "Percent (10.12%)", value: "0.00%" },
  { name: "date", text: "Date (9/26/2008)", value: "m/d/yyyy" },
  { name: "time", text: "Time (10:43:00 PM)", value: "hh:mm:ss a" },
  { name: "datetime", text: "Date time (9/26/2008 22:43:00)", value: "m/d/yyyy hh:mm:ss" },
  { name: "duration", text: "Duration (27:51:38)", value: "hhhh:mm:ss" },
];

// -----------------------------------------------------------------------------
// TopBar
// -----------------------------------------------------------------------------
export class TopBar extends Component<any, SpreadsheetEnv> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet-topbar">
      <div class="o-topbar-top">
        <!-- Menus -->
        <div class="o-topbar-topleft">
          <t t-foreach="menus" t-as="menu" t-key="menu_index">
            <div t-if="menu.children.length !== 0"
              class="o-topbar-menu"
              t-on-click="toggleContextMenu(menu)"
              t-on-mouseover="onMenuMouseOver(menu)"
              t-att-data-id="menu.id">
            <t t-esc="getMenuName(menu)"/>
          </div>
          </t>
          <Menu t-if="state.menuState.isOpen"
                position="state.menuState.position"
                menuItems="state.menuState.menuItems"
                t-ref="menuRef"
                t-on-close="state.menuState.isOpen=false"/>
        </div>
        <div class="o-topbar-topright">
          <div t-foreach="topbarComponents" t-as="comp" t-key="comp_index">
            <t t-component="comp.component"/>
          </div>
        </div>
      </div>
      <!-- Toolbar and Cell Content -->
      <div class="o-topbar-toolbar">
        <!-- Toolbar -->
        <div class="o-toolbar-tools">
          <div class="o-tool" title="Undo" t-att-class="{'o-disabled': !undoTool}" t-on-click="undo" >${icons.UNDO_ICON}</div>
          <div class="o-tool" t-att-class="{'o-disabled': !redoTool}" title="Redo"  t-on-click="redo">${icons.REDO_ICON}</div>
          <div class="o-tool" title="Paint Format" t-att-class="{active:paintFormatTool}" t-on-click="paintFormat">${icons.PAINT_FORMAT_ICON}</div>
          <div class="o-tool" title="Clear Format" t-on-click="clearFormatting()">${icons.CLEAR_FORMAT_ICON}</div>
          <div class="o-divider"/>
          <div class="o-tool" title="Format as percent" t-on-click="toogleFormat('percent')">%</div>
          <div class="o-tool" title="Decrease decimal places" t-on-click="setDecimal(-1)">.0</div>
          <div class="o-tool" title="Increase decimal places" t-on-click="setDecimal(+1)">.00</div>
          <div class="o-tool o-dropdown" title="More formats" t-on-click="toggleDropdownTool('formatTool')">
            <div class="o-text-icon">123${icons.TRIANGLE_DOWN_ICON}</div>
            <div class="o-dropdown-content o-text-options  o-format-tool "  t-if="state.activeTool === 'formatTool'" t-on-click="setFormat">
              <t t-foreach="formats" t-as="format" t-key="format.name">
                <div t-att-data-format="format.name" t-att-class="{active: currentFormat === format.name}"><t t-esc="format.text"/></div>
              </t>
            </div>
          </div>
          <div class="o-divider"/>
          <!-- <div class="o-tool" title="Font"><span>Roboto</span> ${icons.TRIANGLE_DOWN_ICON}</div> -->
          <div class="o-tool o-dropdown" title="Font Size" t-on-click="toggleDropdownTool('fontSizeTool')">
            <div class="o-text-icon"><t t-esc="style.fontSize || ${DEFAULT_FONT_SIZE}"/> ${icons.TRIANGLE_DOWN_ICON}</div>
            <div class="o-dropdown-content o-text-options "  t-if="state.activeTool === 'fontSizeTool'" t-on-click="setSize">
              <t t-foreach="fontSizes" t-as="font" t-key="font_index">
                <div t-esc="font.pt" t-att-data-size="font.pt"/>
              </t>
            </div>
          </div>
          <div class="o-divider"/>
          <div class="o-tool" title="Bold" t-att-class="{active:style.bold}" t-on-click="toogleStyle('bold')">${icons.BOLD_ICON}</div>
          <div class="o-tool" title="Italic" t-att-class="{active:style.italic}" t-on-click="toogleStyle('italic')">${icons.ITALIC_ICON}</div>
          <div class="o-tool" title="Strikethrough"  t-att-class="{active:style.strikethrough}" t-on-click="toogleStyle('strikethrough')">${icons.STRIKE_ICON}</div>
          <div class="o-tool o-dropdown o-with-color">
            <span t-attf-style="border-color:{{textColor}}" title="Text Color" t-on-click="toggleDropdownTool('textColorTool')">${icons.TEXT_COLOR_ICON}</span>
            <ColorPicker t-if="state.activeTool === 'textColorTool'" t-on-color-picked="setColor('textColor')" t-key="textColor"/>
          </div>
          <div class="o-divider"/>
          <div class="o-tool  o-dropdown o-with-color">
            <span t-attf-style="border-color:{{fillColor}}" title="Fill Color" t-on-click="toggleDropdownTool('fillColorTool')">${icons.FILL_COLOR_ICON}</span>
            <ColorPicker t-if="state.activeTool === 'fillColorTool'" t-on-color-picked="setColor('fillColor')" t-key="fillColor"/>
          </div>
          <div class="o-tool o-dropdown">
            <span title="Borders" t-on-click="toggleDropdownTool('borderTool')">${icons.BORDERS_ICON}</span>
            <div class="o-dropdown-content o-border" t-if="state.activeTool === 'borderTool'">
              <div class="o-dropdown-line">
                <span class="o-line-item" t-on-click="setBorder('all')">${icons.BORDERS_ICON}</span>
                <span class="o-line-item" t-on-click="setBorder('hv')">${icons.BORDER_HV}</span>
                <span class="o-line-item" t-on-click="setBorder('h')">${icons.BORDER_H}</span>
                <span class="o-line-item" t-on-click="setBorder('v')">${icons.BORDER_V}</span>
                <span class="o-line-item" t-on-click="setBorder('external')">${icons.BORDER_EXTERNAL}</span>
              </div>
              <div class="o-dropdown-line">
                <span class="o-line-item" t-on-click="setBorder('left')">${icons.BORDER_LEFT}</span>
                <span class="o-line-item" t-on-click="setBorder('top')">${icons.BORDER_TOP}</span>
                <span class="o-line-item" t-on-click="setBorder('right')">${icons.BORDER_RIGHT}</span>
                <span class="o-line-item" t-on-click="setBorder('bottom')">${icons.BORDER_BOTTOM}</span>
                <span class="o-line-item" t-on-click="setBorder('clear')">${icons.BORDER_CLEAR}</span>
              </div>
            </div>
          </div>
          <div class="o-tool" title="Merge Cells"  t-att-class="{active:inMerge, 'o-disabled': cannotMerge}" t-on-click="toggleMerge">${icons.MERGE_CELL_ICON}</div>
          <div class="o-divider"/>
          <div class="o-tool o-dropdown" title="Horizontal align" t-on-click="toggleDropdownTool('alignTool')">
            <span>
              <t t-if="style.align === 'right'">${icons.ALIGN_RIGHT_ICON}</t>
              <t t-elif="style.align === 'center'">${icons.ALIGN_CENTER_ICON}</t>
              <t t-else="">${icons.ALIGN_LEFT_ICON}</t>
              ${icons.TRIANGLE_DOWN_ICON}
            </span>
            <div t-if="state.activeTool === 'alignTool'" class="o-dropdown-content">
              <div class="o-dropdown-item" t-on-click="toggleAlign('left')">${icons.ALIGN_LEFT_ICON}</div>
              <div class="o-dropdown-item" t-on-click="toggleAlign('center')">${icons.ALIGN_CENTER_ICON}</div>
              <div class="o-dropdown-item" t-on-click="toggleAlign('right')">${icons.ALIGN_RIGHT_ICON}</div>
            </div>
          </div>
          <!-- <div class="o-tool" title="Vertical align"><span>${icons.ALIGN_MIDDLE_ICON}</span> ${icons.TRIANGLE_DOWN_ICON}</div> -->
          <!-- <div class="o-tool" title="Text Wrapping">${icons.TEXT_WRAPPING_ICON}</div> -->
          <div class="o-divider"/>
        </div>

        <!-- Cell content -->
        <div class="o-toolbar-cell-content">
          <t t-set="cell" t-value="getters.getActiveCell()"/>
          <t t-esc="cell and cell.content"/>
        </div>

      </div>
    </div>`;
  static style = css/* scss */ `
    .o-spreadsheet-topbar {
      background-color: white;
      display: flex;
      flex-direction: column;
      font-size: 13px;
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

        /* Toolbar */
        .o-toolbar-tools {
          display: flex;
          flex-shrink: 0;
          margin-left: 20px;
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
              > svg {
                margin-bottom: -5px;
              }
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
  static components = { ColorPicker, Menu };
  formats = FORMATS;
  currentFormat = "auto";
  fontSizes = fontSizes;
  dispatch = this.env.dispatch;
  getters = this.env.getters;

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
  private menuRef = useRef("menuRef");

  constructor() {
    super(...arguments);
    useExternalListener(window as any, "click", this.onClick);
  }

  get topbarComponents() {
    return topbarComponentRegistry
      .getAll()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
  }

  async willStart() {
    this.updateCellState();
  }
  async willUpdateProps() {
    this.updateCellState();
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

  toogleFormat(format: string) {
    const formatter = FORMATS.find((f) => f.name === format);
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
    this.state.menuState.isOpen = true;
    const width = this.el!.clientWidth;
    const height = this.el!.parentElement!.clientHeight;
    this.state.menuState.position = { x, y, width, height };
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
    if (this.menuRef.comp) {
      (<Menu>this.menuRef.comp).closeSubMenus();
    }
  }

  updateCellState() {
    this.style = this.getters.getCurrentStyle();
    this.fillColor = this.style.fillColor || "white";
    this.textColor = this.style.textColor || "black";
    const zones = this.getters.getSelectedZones();
    const { top, left, right, bottom } = zones[0];
    this.cannotMerge = zones.length > 1 || (top === bottom && left === right);
    this.inMerge = false;
    if (!this.cannotMerge) {
      const [col, row] = this.getters.getPosition();
      const zone = this.getters.expandZone({ left: col, right: col, top: row, bottom: row });
      this.inMerge = isEqual(zones[0], zone);
    }
    this.undoTool = this.getters.canUndo();
    this.redoTool = this.getters.canRedo();
    this.paintFormatTool = this.getters.isPaintingFormat();
    const cell = this.getters.getActiveCell();
    if (cell && cell.format) {
      const format = this.formats.find((f) => f.value === cell.format);
      this.currentFormat = format ? format.name : "";
    } else {
      this.currentFormat = "auto";
    }
    this.menus = topbarMenuRegistry
      .getAll()
      .filter((item) => !item.isVisible || item.isVisible(this.env));
  }

  getMenuName(menu: FullMenuItem) {
    return topbarMenuRegistry.getName(menu, this.env);
  }

  toggleMerge() {
    const zones = this.getters.getSelectedZones();
    const zone = zones[zones.length - 1];
    const sheet = this.getters.getActiveSheet();
    if (this.inMerge) {
      this.dispatch("REMOVE_MERGE", { sheet, zone });
    } else {
      this.dispatch("ADD_MERGE", { sheet, zone, interactive: true });
    }
  }

  setColor(target: string, ev: CustomEvent) {
    setStyle(this.env, { [target]: ev.detail.color });
  }

  setBorder(command: BorderCommand) {
    this.dispatch("SET_FORMATTING", {
      sheet: this.getters.getActiveSheet(),
      target: this.getters.getSelectedZones(),
      border: command,
    });
  }

  setFormat(ev: MouseEvent) {
    const format = (ev.target as HTMLElement).dataset.format;
    if (format) {
      this.toogleFormat(format);
    }
  }

  setDecimal(step: number) {
    this.dispatch("SET_DECIMAL", {
      sheet: this.getters.getActiveSheet(),
      target: this.getters.getSelectedZones(),
      step: step,
    });
  }

  paintFormat() {
    this.dispatch("ACTIVATE_PAINT_FORMAT", {
      target: this.getters.getSelectedZones(),
    });
  }

  clearFormatting() {
    this.dispatch("CLEAR_FORMATTING", {
      sheet: this.getters.getActiveSheet(),
      target: this.getters.getSelectedZones(),
    });
  }

  setSize(ev: MouseEvent) {
    const fontSize = parseFloat((ev.target as HTMLElement).dataset.size!);
    setStyle(this.env, { fontSize });
  }

  doAction(action: (env: SpreadsheetEnv) => void) {
    action(this.env);
    this.closeMenus();
  }

  undo() {
    this.dispatch("UNDO");
  }

  redo() {
    this.dispatch("REDO");
  }
}
