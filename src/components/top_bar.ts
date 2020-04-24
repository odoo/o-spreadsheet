import * as owl from "@odoo/owl";

import { Style, SpreadsheetEnv } from "../types/index";
import { BACKGROUND_GRAY_COLOR } from "../constants";
import { fontSizes } from "../fonts";
import * as icons from "./icons";
import { isEqual } from "../helpers/index";
import { ColorPicker } from "./color_picker";
import { menuItemRegistry, FullActionMenuItem } from "../menu_items_registry";
const { Component, useState, hooks } = owl;
const { xml, css } = owl.tags;
const { useExternalListener } = hooks;

const FORMATS = [
  { name: "auto", text: "Automatic" },
  { name: "number", text: "Number (1,000.12)", value: "#,##0.00" },
  { name: "percent", text: "Percent (10.12%)", value: "0.00%" },
  { name: "date", text: "Date (9/26/2008)", value: "m/d/yyyy" },
];

owl.QWeb.registerTemplate(
  "spreadsheet_menu_child_template",
  `
  <t t-foreach="menu.children" t-as="child" t-key="child.id">
    <t t-if="child.isVisible(env)">
      <t t-if="child.children.length !== 0">
        <div class="o-menu-dropdown-item"><t t-esc="typeof child.name === 'string' ? child.name : child.name(env)"/>
          <div class="o-menu-dropdown-content o-menu-dropdown-submenu">
            <t t-call="spreadsheet_menu_child_template">
              <t t-set="menu" t-value="child"/>
            </t>
          </div>
        </div>
        <div t-if="child.separator and !child_last" class="o-separator"/>
      </t>
      <t t-elif="child.action">
        <div class="o-menu-dropdown-item" t-esc="typeof child.name === 'string' ? child.name : child.name(env)" t-on-click="doAction(child.action)"/>
        <div t-if="child.separator and !child_last" class="o-separator"/>
      </t>
    </t>
  </t>
`
);

const MENU_TEMPLATE = xml/* xml */ `
  <div class="o-topbar-menu o-menu-dropdown" t-if="menu.children.length !== 0" t-on-click.stop="toggleDropdownMenu(menu.id)" t-on-mouseover="onMouseOver(menu.id)" t-att-data-id="menu.id">
    <t t-esc="typeof menu.name === 'string' ? menu.name : menu.name(env)"/>
    <div class="o-menu-dropdown-content" t-if="state.menu === menu.id">
      <t t-call="spreadsheet_menu_child_template"/>
    </div>
  </div>
`;

// -----------------------------------------------------------------------------
// TopBar
// -----------------------------------------------------------------------------
export class TopBar extends Component<any, SpreadsheetEnv> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet-topbar">
      <!-- Menus -->
      <div class="o-topbar-menus">
        <t t-foreach="menus" t-as="menu" t-key="menu_index">
          <t t-call="${MENU_TEMPLATE}"/>
        </t>
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
          <div class="o-tool o-dropdown" title="Format">
            <div class="o-text-icon" t-on-click.stop="toggleDropdownTool('formatTool')">Format ${icons.TRIANGLE_DOWN_ICON}</div>
            <div class="o-dropdown-content o-text-options  o-format-tool "  t-if="state.tools.formatTool" t-on-click="setFormat">
              <t t-foreach="formats" t-as="format" t-key="format.name">
                <div t-att-data-format="format.name" t-att-class="{active: currentFormat === format.name}"><t t-esc="format.text"/></div>
              </t>
            </div>
          </div>
          <div class="o-divider"/>
          <div class="o-tool" title="Font"><span>Arial</span> ${icons.TRIANGLE_DOWN_ICON}</div>
          <div class="o-tool o-dropdown" title="Font Size">
            <div class="o-text-icon" t-on-click.stop="toggleDropdownTool('fontSizeTool')"><t t-esc="style.fontSize || 10"/> ${icons.TRIANGLE_DOWN_ICON}</div>
            <div class="o-dropdown-content o-text-options "  t-if="state.tools.fontSizeTool" t-on-click="setSize">
              <t t-foreach="fontSizes" t-as="font" t-key="font_index">
                <div t-esc="font.pt" t-att-data-size="font.pt"/>
              </t>
            </div>
          </div>
          <div class="o-divider"/>
          <div class="o-tool" title="Bold" t-att-class="{active:style.bold}" t-on-click="toggleTool('bold')">${icons.BOLD_ICON}</div>
          <div class="o-tool" title="Italic" t-att-class="{active:style.italic}" t-on-click="toggleTool('italic')">${icons.ITALIC_ICON}</div>
          <div class="o-tool" title="Strikethrough"  t-att-class="{active:style.strikethrough}" t-on-click="toggleTool('strikethrough')">${icons.STRIKE_ICON}</div>
          <div class="o-tool o-dropdown o-with-color">
            <span t-attf-style="border-color:{{textColor}}" title="Text Color" t-on-click.stop="toggleDropdownTool('textColorTool')">${icons.TEXT_COLOR_ICON}</span>
            <ColorPicker t-if="state.tools.textColorTool" t-on-color-picked="setColor('textColor')" t-key="textColor"/>
          </div>
          <div class="o-divider"/>
          <div class="o-tool  o-dropdown o-with-color">
            <span t-attf-style="border-color:{{fillColor}}" title="Fill Color" t-on-click.stop="toggleDropdownTool('fillColorTool')">${icons.FILL_COLOR_ICON}</span>
            <ColorPicker t-if="state.tools.fillColorTool" t-on-color-picked="setColor('fillColor')" t-key="fillColor"/>
          </div>
          <div class="o-tool o-dropdown">
            <span title="Borders" t-on-click.stop="toggleDropdownTool('borderTool')">${icons.BORDERS_ICON}</span>
            <div class="o-dropdown-content o-border" t-if="state.tools.borderTool">
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
          <div class="o-tool o-dropdown" title="Horizontal align">
            <span t-on-click.stop="toggleDropdownTool('alignTool')">
              <t t-if="style.align === 'right'">${icons.ALIGN_RIGHT_ICON}</t>
              <t t-else="">${icons.ALIGN_LEFT_ICON}</t>
              ${icons.TRIANGLE_DOWN_ICON}
            </span>
            <div t-if="state.tools.alignTool" class="o-dropdown-content">
              <div class="o-dropdown-item" t-on-click="useTool('align', 'left')">${icons.ALIGN_LEFT_ICON}</div>
              <div class="o-dropdown-item" t-on-click="useTool('align', 'center')">${icons.ALIGN_CENTER_ICON}</div>
              <div class="o-dropdown-item" t-on-click="useTool('align', 'right')">${icons.ALIGN_RIGHT_ICON}</div>
            </div>
          </div>
          <div class="o-tool" title="Vertical align"><span>${icons.ALIGN_MIDDLE_ICON}</span> ${icons.TRIANGLE_DOWN_ICON}</div>
          <div class="o-tool" title="Text Wrapping">${icons.TEXT_WRAPPING_ICON}</div>
          <div class="o-divider"/>
          <div class="o-tool" title="Conditional Formatting" t-on-click="setConditionalFormatting"><span>${icons.CONDITIONAL_FORMATTING}</span></div>
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
      background-color: ${BACKGROUND_GRAY_COLOR};
      display: flex;
      flex-direction: column;
      font-family: "Lato", "Source Sans Pro", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;

      /* Menus */
      .o-topbar-menus {
        border-bottom: 1px solid #e0e2e4;
        display: flex;
        padding: 3px;

        .o-topbar-menu {
          padding: 4px 6px;
          margin: 0 2px;
        }

        .o-topbar-menu:hover {
          background-color: lightgrey;
          border-radius: 2px;
          cursor: hand;
        }

        .o-menu-dropdown {
          position: relative;

          .o-menu-dropdown-content {
            position: absolute;
            top: 100%;
            left: 0;
            z-index: 10;
            box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
            background-color: #f6f6f6;
            min-width: 200px;

            &.o-menu-dropdown-submenu {
              visibility: hidden;
              top: 0%;
              left: 100%;
            }

            .o-menu-dropdown-item {
              position: relative;
              padding: 7px 20px;
            }

            .o-menu-dropdown-item:hover {
              background-color: rgba(0, 0, 0, 0.08);
              .o-menu-dropdown-submenu {
                visibility: visible;
              }
            }

            .o-separator {
              border-bottom: 1px solid #e0e2e4;
              margin: 7px 15px;
            }
          }
        }
      }

      /* Toolbar + Cell Content */
      .o-topbar-toolbar {
        border-bottom: 1px solid #e0e2e4;
        display: flex;

        /* Toolbar */
        .o-toolbar-tools {
          display: flex;

          margin-left: 20px;
          color: #333;
          cursor: default;
          display: flex;

          .o-tool {
            display: flex;
            align-items: center;
            margin: 2px;
            padding: 0 3px;
            border-radius: 2px;
          }

          .o-tool.active,
          .o-tool:not(.o-disabled):hover {
            background-color: rgba(0, 0, 0, 0.08);
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
            margin: 0 3px 0;
          }

          .o-disabled {
            opacity: 0.6;
            cursor: not-allowed;
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
              padding: 3 12px;
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
              background-color: #f6f6f6;

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
          font-family: monospace, arial, sans, sans-serif;
          font-size: 12px;
          font-weight: 500;
          padding: 0 12px;
          margin: 0;
          line-height: 34px;
        }
      }
    }
  `;
  static components = { ColorPicker };
  formats = FORMATS;
  currentFormat = "auto";
  fontSizes = fontSizes;
  dispatch = this.env.dispatch;
  getters = this.env.getters;

  style: Style = {};
  state = useState({
    menu: false as boolean | string,
    tools: {
      formatTool: false,
      alignTool: false,
      textColorTool: false,
      fillColorTool: false,
      borderTool: false,
      fontSizeTool: false,
    },
  });
  isSelectingMenu = false;
  inMerge = false;
  cannotMerge = false;
  undoTool = false;
  redoTool = false;
  paintFormatTool = false;
  fillColor: string = "white";
  textColor: string = "black";
  menus: FullActionMenuItem[] = [];

  constructor() {
    super(...arguments);
    useExternalListener(window as any, "click", this.closeMenus);
  }

  async willStart() {
    this.updateCellState();
  }
  async willUpdateProps() {
    this.updateCellState();
  }

  setConditionalFormatting() {
    this.env.openSidePanel("ConditionalFormatting");
  }

  toggleTool(tool: string) {
    const value = !this.style[tool];
    this.useTool(tool, value);
  }
  useTool(tool, value) {
    const style = { [tool]: value };
    this.dispatch("SET_FORMATTING", {
      sheet: this.getters.getActiveSheet(),
      target: this.getters.getSelectedZones(),
      style,
    });
  }

  onMouseOver(menu: string) {
    if (this.isSelectingMenu) {
      this.state.menu = menu;
    }
  }

  toggleDropdownTool(tool: string) {
    const isOpen = this.state.tools[tool];
    this.closeMenus();
    this.state.tools[tool] = !isOpen;
  }

  toggleDropdownMenu(menu: string) {
    const isOpen = this.state.menu === menu;
    this.closeMenus();
    this.state.menu = !isOpen && menu;
    this.isSelectingMenu = !isOpen;
  }

  closeMenus() {
    this.state.tools.formatTool = false;
    this.state.tools.alignTool = false;
    this.state.tools.fillColorTool = false;
    this.state.tools.textColorTool = false;
    this.state.tools.borderTool = false;
    this.state.tools.fontSizeTool = false;
    this.state.menu = false;
    this.isSelectingMenu = false;
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
    this.menus = menuItemRegistry.getAll();
    this.menus.sort((a, b) => a.sequence - b.sequence);
    for (let menu of this.menus) {
      this.sortMenus(menu);
    }
  }

  sortMenus(menu: FullActionMenuItem) {
    menu.children.sort((a, b) => a.sequence - b.sequence);
    for (let child of menu.children) {
      this.sortMenus(child);
    }
  }

  toggleMerge() {
    const zones = this.getters.getSelectedZones();
    const zone = zones[zones.length - 1];
    const sheet = this.getters.getActiveSheet();
    if (this.inMerge) {
      this.dispatch("REMOVE_MERGE", { sheet, zone });
    } else {
      if (this.getters.isMergeDestructive(zone)) {
        this.trigger("ask-confirmation", {
          content: "Merging these cells will only preserve the top-leftmost value. Merge anyway?",
          confirm: () => this.dispatch("ADD_MERGE", { sheet, zone }),
        });
      } else {
        this.dispatch("ADD_MERGE", { sheet, zone });
      }
    }
  }
  setColor(target: string, ev: CustomEvent) {
    const color = ev.detail.color;
    const style = { [target]: color };
    this.dispatch("SET_FORMATTING", {
      sheet: this.getters.getActiveSheet(),
      target: this.getters.getSelectedZones(),
      style,
    });
    this.closeMenus();
  }
  setBorder(command) {
    this.dispatch("SET_FORMATTING", {
      sheet: this.getters.getActiveSheet(),
      target: this.getters.getSelectedZones(),
      border: command,
    });
  }
  setFormat(ev: MouseEvent) {
    const format = (ev.target as HTMLElement).dataset.format;
    if (format) {
      const formatter = FORMATS.find((f) => f.name === format);
      const value = (formatter && formatter.value) || "";
      this.dispatch("SET_FORMATTER", {
        sheet: this.getters.getActiveSheet(),
        target: this.getters.getSelectedZones(),
        formatter: value,
      });
    }
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
  setSize(ev) {
    const fontSize = parseFloat(ev.target.dataset.size);
    this.dispatch("SET_FORMATTING", {
      sheet: this.getters.getActiveSheet(),
      target: this.getters.getSelectedZones(),
      style: { fontSize },
    });
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
