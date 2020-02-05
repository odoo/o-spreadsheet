import * as owl from "@odoo/owl";

import { GridModel, Style } from "../model/index";
import { BACKGROUND_GRAY_COLOR } from "../constants";
import * as icons from "./icons";
import { isEqual } from "../helpers";
const { Component, useState, hooks } = owl;
const { xml, css } = owl.tags;
const { useExternalListener } = hooks;

const COLORS = [
  [
    "#ffffff",
    "#000100",
    "#e7e5e6",
    "#445569",
    "#5b9cd6",
    "#ed7d31",
    "#a5a5a5",
    "#ffc001",
    "#4371c6",
    "#71ae47"
  ],
  [
    "#f2f2f2",
    "#7f7f7f",
    "#d0cecf",
    "#d5dce4",
    "#deeaf6",
    "#fce5d5",
    "#ededed",
    "#fff2cd",
    "#d9e2f3",
    "#e3efd9"
  ],
  [
    "#d8d8d8",
    "#595959",
    "#afabac",
    "#adb8ca",
    "#bdd7ee",
    "#f7ccac",
    "#dbdbdb",
    "#ffe59a",
    "#b3c6e7",
    "#c5e0b3"
  ],
  [
    "#bfbfbf",
    "#3f3f3f",
    "#756f6f",
    "#8596b0",
    "#9cc2e6",
    "#f4b184",
    "#c9c9c9",
    "#fed964",
    "#8eaada",
    "#a7d08c"
  ],
  [
    "#a5a5a5",
    "#262626",
    "#3a3839",
    "#333f4f",
    "#2e75b5",
    "#c45a10",
    "#7b7b7b",
    "#bf8e01",
    "#2f5596",
    "#538136"
  ],
  [
    "#7f7f7f",
    "#0c0c0c",
    "#171516",
    "#222a35",
    "#1f4e7a",
    "#843c0a",
    "#525252",
    "#7e6000",
    "#203864",
    "#365624"
  ],
  [
    "#c00000",
    "#fe0000",
    "#fdc101",
    "#ffff01",
    "#93d051",
    "#00b04e",
    "#01b0f1",
    "#0170c1",
    "#012060",
    "#7030a0"
  ]
];

const COLOR_PICKER = xml/* xml */ `
  <div class="o-dropdown-line" t-foreach="COLORS" t-as="colors" t-key="colors">
    <t t-foreach="colors" t-as="color" t-key="color">
      <div class="o-line-item" t-att-data-color="color" t-attf-style="background-color:{{color}};"></div>
    </t>
  </div>`;

// -----------------------------------------------------------------------------
// TopBar
// -----------------------------------------------------------------------------
export class TopBar extends Component<any, any> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet-topbar">
      <div class="o-tools">
        <div class="o-tool" title="Undo" t-att-class="{'o-disabled': !undoTool}" t-on-click="model.undo()" >${icons.UNDO_ICON}</div>
        <div class="o-tool" t-att-class="{'o-disabled': !redoTool}" title="Redo"  t-on-click="model.redo()">${icons.REDO_ICON}</div>
        <div class="o-tool" title="Paint Format" t-att-class="{active:paintFormatTool}" t-on-click="paintFormat">${icons.PAINT_FORMAT_ICON}</div>
        <div class="o-tool" title="Clear Format" t-on-click="model.clearFormat()">${icons.CLEAR_FORMAT_ICON}</div>
        <div class="o-divider"/>
        <div class="o-tool" title="Format">Format ${icons.TRIANGLE_DOWN_ICON}</div>
        <div class="o-divider"/>
        <div class="o-tool" title="Font"><span>Arial</span> ${icons.TRIANGLE_DOWN_ICON}</div>
        <div class="o-tool" title="Font Size"><span>10</span> ${icons.TRIANGLE_DOWN_ICON}</div>
        <div class="o-divider"/>
        <div class="o-tool" title="Bold" t-att-class="{active:style.bold}" t-on-click="toggleTool('bold')">${icons.BOLD_ICON}</div>
        <div class="o-tool" title="Italic" t-att-class="{active:style.italic}" t-on-click="toggleTool('italic')">${icons.ITALIC_ICON}</div>
        <div class="o-tool" title="Strikethrough"  t-att-class="{active:style.strikethrough}" t-on-click="toggleTool('strikethrough')">${icons.STRIKE_ICON}</div>
        <div class="o-tool o-dropdown o-with-color">
          <span t-attf-style="border-color:{{textColor}}" title="Text Color" t-on-click.stop="openMenu('textColorTool')">${icons.TEXT_COLOR_ICON}</span>
          <div class="o-dropdown-content" t-if="state.textColorTool" t-on-click="setColor('textColor')">
            <t t-call="${COLOR_PICKER}"/>
          </div>
        </div>
        <div class="o-divider"/>
        <div class="o-tool  o-dropdown o-with-color">
          <span t-attf-style="border-color:{{fillColor}}" title="Fill Color" t-on-click.stop="openMenu('fillColorTool')">${icons.FILL_COLOR_ICON}</span>
          <div class="o-dropdown-content" t-if="state.fillColorTool" t-on-click="setColor('fillColor')">
            <t t-call="${COLOR_PICKER}"/>
          </div>
        </div>
        <div class="o-tool o-dropdown">
          <span title="Borders" t-on-click.stop="openMenu('borderTool')">${icons.BORDERS_ICON}</span>
          <div class="o-dropdown-content o-border" t-if="state.borderTool">
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
          <span t-on-click.stop="openMenu('alignTool')">
            <t t-if="style.align === 'right'">${icons.ALIGN_RIGHT_ICON}</t>
            <t t-else="">${icons.ALIGN_LEFT_ICON}</t>
            ${icons.TRIANGLE_DOWN_ICON}
          </span>
          <div t-if="state.alignTool" class="o-dropdown-content">
            <div class="o-dropdown-item" t-on-click="useTool('align', 'left')">${icons.ALIGN_LEFT_ICON}</div>
            <div class="o-dropdown-item" t-on-click="useTool('align', 'right')">${icons.ALIGN_RIGHT_ICON}</div>
          </div>
        </div>
        <div class="o-tool" title="Vertical align"><span>${icons.ALIGN_MIDDLE_ICON}</span> ${icons.TRIANGLE_DOWN_ICON}</div>
        <div class="o-tool" title="Text Wrapping">${icons.TEXT_WRAPPING_ICON}</div>
        <div class="o-divider"/>
      </div>
      <div class="o-cell-content">
         <t t-esc="model.selectedCell and model.selectedCell.content"/>
      </div>
    </div>`;
  static style = css/* scss */ `
    .o-spreadsheet-topbar {
      background-color: ${BACKGROUND_GRAY_COLOR};
      border-bottom: 1px solid #ccc;
      display: flex;

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
        }
      }

      .o-tools {
        margin-left: 20px;
        color: #333;
        font-size: 13px;
        font-family: "Lato", "Source Sans Pro", Roboto, Helvetica, Arial, sans-serif;
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
      }
      .o-cell-content {
        font-family: monospace, arial, sans, sans-serif;
        font-size: 12px;
        font-weight: 500;
        padding: 0 12px;
        margin: 0;
        line-height: 35px;
      }
    }
  `;
  COLORS = COLORS;
  model: GridModel = this.props.model;
  style: Style = {};
  state = useState({
    alignTool: false,
    textColorTool: false,
    fillColorTool: false,
    borderTool: false
  });
  inMerge = false;
  cannotMerge = false;
  undoTool = false;
  redoTool = false;
  paintFormatTool = false;
  fillColor: string = "white";
  textColor: string = "black";

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

  toggleTool(tool) {
    const value = !this.style[tool];
    this.useTool(tool, value);
  }
  useTool(tool, value) {
    this.model.setStyle({ [tool]: value });
  }

  openMenu(tool) {
    this.closeMenus();
    this.state[tool] = true;
  }
  closeMenus() {
    this.state.alignTool = false;
    this.state.fillColorTool = false;
    this.state.textColorTool = false;
    this.state.borderTool = false;
  }

  updateCellState() {
    const state = this.model.state;
    this.style = this.model.style;
    this.fillColor = this.style.fillColor || "white";
    this.textColor = this.style.textColor || "black";
    const selection = state.selection;
    const { top, left, right, bottom } = selection.zones[0];
    this.cannotMerge = selection.zones.length > 1 || (top === bottom && left === right);
    this.inMerge = false;
    if (!this.cannotMerge) {
      const mergeId = state.mergeCellMap[state.activeXc];
      this.inMerge = mergeId ? isEqual(selection.zones[0], state.merges[mergeId]) : false;
    }
    this.undoTool = state.undoStack.length > 0;
    this.redoTool = state.redoStack.length > 0;
    this.paintFormatTool = state.isCopyingFormat;
  }

  toggleMerge() {
    if (this.inMerge) {
      this.model.unmerge();
    } else {
      if (this.model.isMergeDestructive) {
        this.trigger("ask-confirmation", {
          content: "Merging these cells will only preserve the top-leftmost value. Merge anyway?",
          confirm: () => this.model.merge()
        });
      } else {
        this.model.merge();
      }
    }
  }
  setColor(target, ev) {
    const color = ev.target.dataset.color;
    if (color) {
      this.model.setStyle({ [target]: color });
      this.closeMenus();
    }
  }
  setBorder(command) {
    this.model.setBorder(command);
  }
  paintFormat() {
    this.model.copy({ onlyFormat: true });
  }
}
