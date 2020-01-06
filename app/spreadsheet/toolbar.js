import { useExternalListener } from "./helpers.js";

const { Component, useState } = owl;
const { xml, css } = owl.tags;

const GRAY_COLOR = "#f5f5f5";

// -----------------------------------------------------------------------------
// Icons
// -----------------------------------------------------------------------------
const UNDO_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M11.5656391,4.43436088 L9,7 L16,7 L16,0 L13.0418424,2.95815758 C11.5936787,1.73635959 9.72260775,1 7.67955083,1 C4.22126258,1 1.25575599,3.10984908 0,6 L2,7 C2.93658775,4.60974406 5.12943697,3.08011229 7.67955083,3 C9.14881247,3.0528747 10.4994783,3.57862053 11.5656391,4.43436088 Z" transform="matrix(-1 0 0 1 17 5)"/></svg>`;
const REDO_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M11.5656391,4.43436088 L9,7 L16,7 L16,0 L13.0418424,2.95815758 C11.5936787,1.73635959 9.72260775,1 7.67955083,1 C4.22126258,1 1.25575599,3.10984908 0,6 L2,7 C2.93658775,4.60974406 5.12943697,3.08011229 7.67955083,3 C9.14881247,3.0528747 10.4994783,3.57862053 11.5656391,4.43436088 Z" transform="translate(1 5)"/></svg>`;
const PAINT_FORMAT_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M9,0 L1,0 C0.45,0 0,0.45 0,1 L0,4 C0,4.55 0.45,5 1,5 L9,5 C9.55,5 10,4.55 10,4 L10,3 L11,3 L11,6 L4,6 L4,14 L6,14 L6,8 L13,8 L13,2 L10,2 L10,1 C10,0.45 9.55,0 9,0 Z" transform="translate(3 2)"/></svg>`;
const CLEAR_FORMAT_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M0.27,1.55 L5.43,6.7 L3,12 L5.5,12 L7.14,8.42 L11.73,13 L13,11.73 L1.55,0.27 L0.27,1.55 L0.27,1.55 Z M3.82,0 L5.82,2 L7.58,2 L7.03,3.21 L8.74,4.92 L10.08,2 L14,2 L14,0 L3.82,0 L3.82,0 Z" transform="translate(2 3)"/></svg>`;
const TRIANGLE_DOWN_ICON = `<svg><polygon fill="#000000" fill-rule="evenodd" points="0 0 4 4 8 0" transform="translate(5 7)"/></svg>`;
const BOLD_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M9,3.5 C9,1.57 7.43,0 5.5,0 L1.77635684e-15,0 L1.77635684e-15,12 L6.25,12 C8.04,12 9.5,10.54 9.5,8.75 C9.5,7.45 8.73,6.34 7.63,5.82 C8.46,5.24 9,4.38 9,3.5 Z M5,2 C5.82999992,2 6.5,2.67 6.5,3.5 C6.5,4.33 5.82999992,5 5,5 L3,5 L3,2 L5,2 Z M3,10 L3,7 L5.5,7 C6.32999992,7 7,7.67 7,8.5 C7,9.33 6.32999992,10 5.5,10 L3,10 Z" transform="translate(4 3)"/></svg>`;
const ITALIC_ICON = `<svg><polygon fill="#000000" fill-rule="evenodd" points="4 0 4 2 6.58 2 2.92 10 0 10 0 12 8 12 8 10 5.42 10 9.08 2 12 2 12 0" transform="translate(3 3)"/></svg>`;
const STRIKE_ICON = `<svg><path fill="#010101" fill-rule="evenodd" d="M2.8875,3.06 C2.8875,2.6025 2.985,2.18625 3.18375,1.8075 C3.3825,1.42875 3.66,1.10625 4.02,0.84 C4.38,0.57375 4.80375,0.3675 5.29875,0.22125 C5.79375,0.075 6.33375,0 6.92625,0 C7.53375,0 8.085,0.0825 8.58,0.25125 C9.075,0.42 9.49875,0.6525 9.85125,0.95625 C10.20375,1.25625 10.47375,1.6125 10.665,2.02875 C10.85625,2.44125 10.95,2.895 10.95,3.38625 L8.6925,3.38625 C8.6925,3.1575 8.655,2.94375 8.58375,2.74875 C8.5125,2.55 8.4,2.38125 8.25,2.2425 C8.1,2.10375 7.9125,1.99125 7.6875,1.91625 C7.4625,1.8375 7.19625,1.8 6.88875,1.8 C6.5925,1.8 6.3375,1.83375 6.11625,1.8975 C5.89875,1.96125 5.71875,2.05125 5.57625,2.1675 C5.43375,2.28375 5.325,2.41875 5.25375,2.5725 C5.1825,2.72625 5.145,2.895 5.145,3.0675 C5.145,3.4275 5.32875,3.73125 5.69625,3.975 C5.71780203,3.98908066 5.73942012,4.00311728 5.76118357,4.01733315 C6.02342923,4.18863185 6.5,4.5 7,5 L4,5 C4,5 3.21375,4.37625 3.17625,4.30875 C2.985,3.9525 2.8875,3.53625 2.8875,3.06 Z M14,6 L0,6 L0,8 L7.21875,8 C7.35375,8.0525 7.51875,8.105 7.63125,8.15375 C7.90875,8.2775 8.12625,8.40875 8.28375,8.53625 C8.44125,8.6675 8.54625,8.81 8.6025,8.96 C8.65875,9.11375 8.685,9.28625 8.685,9.47375 C8.685,9.65 8.65125,9.815 8.58375,9.965 C8.51625,10.11875 8.41125,10.25 8.2725,10.35875 C8.13375,10.4675 7.95375,10.55375 7.74,10.6175 C7.5225,10.68125 7.27125,10.71125 6.97875,10.71125 C6.6525,10.71125 6.35625,10.6775 6.09,10.61375 C5.82375,10.55 5.59875,10.445 5.41125,10.3025 C5.22375,10.16 5.0775,9.9725 4.9725,9.74375 C4.8675,9.515 4.78125,9.17 4.78125,9 L2.55,9 C2.55,9.2525 2.61,9.6875 2.72625,10.025 C2.8425,10.3625 3.0075,10.66625 3.21375,10.9325 C3.42,11.19875 3.6675,11.4275 3.94875,11.6225 C4.23,11.8175 4.53375,11.9825 4.86375,12.11 C5.19375,12.24125 5.535,12.33875 5.89875,12.39875 C6.25875,12.4625 6.6225,12.4925 6.9825,12.4925 C7.5825,12.4925 8.13,12.425 8.6175,12.28625 C9.105,12.1475 9.525,11.94875 9.87,11.69375 C10.215,11.435 10.48125,11.12 10.6725,10.74125 C10.86375,10.3625 10.95375,9.935 10.95375,9.455 C10.95375,9.005 10.875,8.6 10.72125,8.24375 C10.68375,8.1575 10.6425,8.075 10.59375,7.9925 L14,8 L14,6 Z" transform="translate(2 3)"/></svg>`;

const TEXT_COLOR_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M7,0 L5,0 L0.5,12 L2.5,12 L3.62,9 L8.37,9 L9.49,12 L11.49,12 L7,0 L7,0 Z M4.38,7 L6,2.67 L7.62,7 L4.38,7 L4.38,7 Z" transform="translate(3 1)"/></svg>`;
const FILL_COLOR_ICON = `<svg><g fill="none" fill-rule="evenodd"><path fill="#000000" d="M14.5,8.87 C14.5,8.87 13,10.49 13,11.49 C13,12.32 13.67,12.99 14.5,12.99 C15.33,12.99 16,12.32 16,11.49 C16,10.5 14.5,8.87 14.5,8.87 L14.5,8.87 Z M12.71,6.79 L5.91,0 L4.85,1.06 L6.44,2.65 L2.29,6.79 C1.9,7.18 1.9,7.81 2.29,8.2 L6.79,12.7 C6.99,12.9 7.24,13 7.5,13 C7.76,13 8.01,12.9 8.21,12.71 L12.71,8.21 C13.1,7.82 13.1,7.18 12.71,6.79 L12.71,6.79 Z M4.21,7 L7.5,3.71 L10.79,7 L4.21,7 L4.21,7 Z"/></g></svg>`;
const MERGE_CELL_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M3,6 L1,6 L1,2 L8,2 L8,4 L3,4 L3,6 Z M10,4 L10,2 L17,2 L17,6 L15,6 L15,4 L10,4 Z M10,14 L15,14 L15,12 L17,12 L17,16 L10,16 L10,14 Z M1,12 L3,12 L3,14 L8,14 L8,16 L1,16 L1,12 Z M1,8 L5,8 L5,6 L8,9 L5,12 L5,10 L1,10 L1,8 Z M10,9 L13,6 L13,8 L17,8 L17,10 L13,10 L13,12 L10,9 Z"/></svg>`;
const ALIGN_LEFT_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M0,14 L10,14 L10,12 L0,12 L0,14 Z M10,4 L0,4 L0,6 L10,6 L10,4 Z M0,0 L0,2 L14,2 L14,0 L0,0 Z M0,10 L14,10 L14,8 L0,8 L0,10 Z" transform="translate(2 2)"/></svg>`;
// const ALIGN_CENTER_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M2,12 L2,14 L12,14 L12,12 L2,12 Z M2,4 L2,6 L12,6 L12,4 L2,4 Z M0,10 L14,10 L14,8 L0,8 L0,10 Z M0,0 L0,2 L14,2 L14,0 L0,0 Z" transform="translate(2 2)"/></svg>`;
const ALIGN_RIGHT_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M4,14 L14,14 L14,12 L4,12 L4,14 Z M0,10 L14,10 L14,8 L0,8 L0,10 Z M0,0 L0,2 L14,2 L14,0 L0,0 Z M4,6 L14,6 L14,4 L4,4 L4,6 Z" transform="translate(2 2)"/></svg>`;
// const ALIGN_TOP_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M0,0 L0,2 L12,2 L12,0 L0,0 L0,0 Z M2.5,7 L5,7 L5,14 L7,14 L7,7 L9.5,7 L6,3.5 L2.5,7 L2.5,7 Z" transform="translate(3 2)"/></svg>`;
const ALIGN_MIDDLE_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M9.5,3 L7,3 L7,0 L5,0 L5,3 L2.5,3 L6,6.5 L9.5,3 L9.5,3 Z M0,8 L0,10 L12,10 L12,8 L0,8 L0,8 Z M2.5,15 L5,15 L5,18 L7,18 L7,15 L9.5,15 L6,11.5 L2.5,15 L2.5,15 Z" transform="translate(3)"/></svg>`;
// const ALIGN_BOTTOM_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M9.5,7 L7,7 L7,0 L5,0 L5,7 L2.5,7 L6,10.5 L9.5,7 L9.5,7 Z M0,12 L0,14 L12,14 L12,12 L0,12 L0,12 Z" transform="translate(3 2)"/></svg>`;
const TEXT_WRAPPING_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M14,0 L0,0 L0,2 L14,2 L14,0 Z M0,12 L4,12 L4,10 L0,10 L0,12 Z M11.5,5 L0,5 L0,7 L11.75,7 C12.58,7 13.25,7.67 13.25,8.5 C13.25,9.33 12.58,10 11.75,10 L9,10 L9,8 L6,11 L9,14 L9,12 L11.5,12 C13.43,12 15,10.43 15,8.5 C15,6.57 13.43,5 11.5,5 Z" transform="translate(2 3)"/></svg>`;
const BORDERS_ICON = `<svg><path fill="#000000" fill-rule="evenodd" d="M0,0 L0,14 L14,14 L14,0 L0,0 L0,0 Z M6,12 L2,12 L2,8 L6,8 L6,12 L6,12 Z M6,6 L2,6 L2,2 L6,2 L6,6 L6,6 Z M12,12 L8,12 L8,8 L12,8 L12,12 L12,12 Z M12,6 L8,6 L8,2 L12,2 L12,6 L12,6 Z" transform="translate(2 2)"/></svg>`;

// -----------------------------------------------------------------------------
// ToolBar
// -----------------------------------------------------------------------------
export class ToolBar extends Component {
  static template = xml/* xml */ `
    <div class="o-spreadsheet-toolbar">
      <div class="o-tools">
        <div class="o-tool o-disabled" title="Undo">${UNDO_ICON}</div>
        <div class="o-tool o-disabled" title="Redo">${REDO_ICON}</div>
        <div class="o-tool" title="Paint Format">${PAINT_FORMAT_ICON}</div>
        <div class="o-tool" title="Clear Format">${CLEAR_FORMAT_ICON}</div>
        <div class="o-divider"/>
        <div class="o-tool" title="Format">Format ${TRIANGLE_DOWN_ICON}</div>
        <div class="o-divider"/>
        <div class="o-tool" title="Font"><span>Arial</span> ${TRIANGLE_DOWN_ICON}</div>
        <div class="o-tool" title="Font Size"><span>10</span> ${TRIANGLE_DOWN_ICON}</div>
        <div class="o-divider"/>
        <div class="o-tool" title="Bold" t-att-class="{active:style.bold}" t-on-click="toggleTool('bold')">${BOLD_ICON}</div>
        <div class="o-tool" title="Italic" t-att-class="{active:style.italic}" t-on-click="toggleTool('italic')">${ITALIC_ICON}</div>
        <div class="o-tool" title="Strikethrough"  t-att-class="{active:style.strikethrough}" t-on-click="toggleTool('strikethrough')">${STRIKE_ICON}</div>
        <div class="o-tool" title="Text Color"><span>${TEXT_COLOR_ICON}</span> ${TRIANGLE_DOWN_ICON}</div>
        <div class="o-divider"/>
        <div class="o-tool" title="Fill Color">${FILL_COLOR_ICON}</div>
        <div class="o-tool" title="Borders">${BORDERS_ICON}</div>
        <div class="o-tool o-disabled" title="Merge Cells">${MERGE_CELL_ICON}</div>
        <div class="o-divider"/>
        <div class="o-tool o-dropdown" title="Horizontal align">
          <span t-on-click.stop="state.alignTool=!state.alignTool">
            <t t-if="style.align === 'right'">${ALIGN_RIGHT_ICON}</t>
            <t t-else="">${ALIGN_LEFT_ICON}</t>
            ${TRIANGLE_DOWN_ICON}
          </span>
          <div t-if="state.alignTool" class="o-dropdown-content">
            <div class="o-dropdown-item" t-on-click="useTool('align', 'left')">${ALIGN_LEFT_ICON}</div>
            <div class="o-dropdown-item" t-on-click="useTool('align', 'right')">${ALIGN_RIGHT_ICON}</div>
          </div>
        </div>
        <div class="o-tool" title="Vertical align"><span>${ALIGN_MIDDLE_ICON}</span> ${TRIANGLE_DOWN_ICON}</div>
        <div class="o-tool" title="Text Wrapping">${TEXT_WRAPPING_ICON}</div>
        <div class="o-divider"/>
      </div>
      <div class="o-cell-content">
         <t t-esc="model.selectedCell and model.selectedCell.content"/>
      </div>
    </div>`;
  static style = css/* scss */ `
    .o-spreadsheet-toolbar {
      background-color: ${GRAY_COLOR};
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
        }

        .o-tool.active,
        .o-tool:not(.o-disabled):hover {
          background-color: rgba(0, 0, 0, 0.08);
        }

        .o-tool svg {
          height: 18px;
          width: 18px;
          opacity: 0.6;
        }
      }
      .o-cell-content {
        font-family: monospace, arial, sans, sans-serif;
        font-size: 12px;
        font-weight: 500;
        padding: 0 12px;
        margin: 0;
        line-height: 31px;
      }
    }
  `;

  model = this.props.model;
  style = {};
  state = useState({
    alignTool: false
  });

  constructor() {
    super(...arguments);
    useExternalListener(window, "click", this.closeMenus);
  }

  willStart() {
    this.style = this.model.getStyle();
  }
  willUpdateProps() {
    this.style = this.model.getStyle();
  }

  toggleTool(tool) {
    const value = !this.style[tool];
    this.useTool(tool, value);
  }
  useTool(tool, value) {
    this.model.setStyle({ [tool]: value });
  }

  closeMenus() {
    this.state.alignTool = false;
  }
}
