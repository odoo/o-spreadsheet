import { drawGrid, ROW_HEADER_HEIGHT, COL_HEADER_WIDTH } from "./grid.js";

const { Component } = owl;
const { xml, css } = owl.tags;
const { useRef, useState } = owl.hooks;


const DEFAULT_CELL_HEIGHT = 26;
const DEFAULT_CELL_WIDTH = 100;

const GRAY_COLOR = '#f5f5f5';
// -----------------------------------------------------------------------------
// ToolBar
// -----------------------------------------------------------------------------
class ToolBar extends Component {
  static template = xml /* xml */`<div class="o-spreadsheet-toolbar">toolbar</div>`;
  static style = css /* css */`
    .o-spreadsheet-toolbar {
      background-color: ${GRAY_COLOR};
      border-bottom: 1px solid #ccc;
    }`;
}

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------
const TEMPLATE = xml /* xml */`
  <div class="o-spreadsheet"
      t-attf-style="width:{{props.width}}px;height:{{props.height}}px">
    <ToolBar/>
    <div class="o-spreadsheet-sheet">
      <canvas t-ref="canvas"
        t-on-mousewheel="onMouseWheel"
        t-attf-style="width:{{props.width}}px;height:{{props.height - 40}}px" />
      <div class="o-scrollbar vertical" t-on-scroll="update('row')" t-ref="vscrollbar">
        <div t-attf-style="width:1px;height:{{state.height}}px"/>
      </div>
      <div class="o-scrollbar horizontal" t-on-scroll="update('col')" t-ref="hscrollbar">
        <div t-attf-style="height:1px;width:{{state.width}}px"/>
      </div>
    </div>
  </div>`;

const CSS = css /* scss */`
  .o-spreadsheet {
    display: grid;
    grid-template-rows: 40px auto;
    .o-spreadsheet-sheet {
      position: relative;
      overflow: hidden;

      .o-scrollbar {
        position: absolute;
        overflow: auto;
      }
      .o-scrollbar.vertical {
        right: 0;
        top: ${ROW_HEADER_HEIGHT}px;
        bottom: 15px;
      }
      .o-scrollbar.horizontal {
        bottom: 0;
        right: 15px;
        left: ${COL_HEADER_WIDTH}px;
      }
    }
  }`;

export class Spreadsheet extends Component {
  static template = TEMPLATE;
  static style = CSS;
  static components = { ToolBar };

  data = {
    colNumber: 26,
    rowNumber: 100,
    cols: { 3: { size: 200 }, 5: { size: 130 } },
    // cols: {},
    rows: {},
    cells: {
      B3: { content: "43" },
      D4: { content: "=2*B3"}
    },
  };

  state = useState({
    // width and height of the sheet zone (not just the visible part, and excluding
    // the row and col headers)
    width: null,
    height: null,

    // each row is described by: { top: ..., bottom: ..., name: '5', size: ... }
    rows: [],
    // each col is described by: { left: ..., right: ..., name: 'B', size: ... }
    cols: [],

    // coordinate of the top left visible cell
    currentRow: 0,
    currentCol: 0,

    // coordinate of the selected cell
    selectedRow: 0,
    selectedCol: 0,
  });

  vScrollbar = useRef('vscrollbar');
  hScrollbar = useRef('hscrollbar');
  canvas = useRef('canvas');
  context = null;

  constructor() {
    super(...arguments);
    this.computeState();
  }

  mounted() {
    const canvas = this.canvas.el;
    // Get the device pixel ratio, falling back to 1.
    // const dpr = window.devicePixelRatio || 1;
    // // Get the size of the canvas in CSS pixels.
    // const rect = canvas.getBoundingClientRect();
    // // Give the canvas pixel dimensions of their CSS
    // // size * the device pixel ratio.
    // canvas.width = rect.width * dpr;
    // canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    // Scale all drawing operations by the dpr, so you
    // don't have to worry about the difference.
    // ctx.scale(this.dpr, this.dpr);
    this.context = ctx; // this.canvas.el.getContext('2d');
    this.drawGrid();
  }
  patched() {
    this.drawGrid();
  }

  drawGrid() {
    // whenever the dimensions are changed, we need to reset the width/height
    // of the canvas manually, and reset its scaling.
    const dpr = window.devicePixelRatio || 1;
    this.canvas.el.width = this.props.width * dpr;
    this.canvas.el.height = (this.props.height - 40) * dpr;
    this.context.scale(dpr, dpr);

    drawGrid(this.context, this.state, this.props.width, this.props.height - 40)
  }
  /**
   * Process the data to precompute some derived informations:
   * - rows/cols dimensions
   * - total grid dimension
   */
  computeState() {
    const data = this.data;
    const state = this.state;

    let current = 0;
    for (let i = 0; i < data.rowNumber; i++) {
      const size = data.rows[i] ? data.rows[i].size : DEFAULT_CELL_HEIGHT;
      const row = {
        top: current,
        bottom: current + size,
        size: size,
        name: String(i+1),
      };
      state.rows.push(row);
      current = row.bottom;
    }
    state.height = state.rows[state.rows.length - 1].bottom + 20; // 10 to have some space at the end

    current = 0;
    for (let i = 0; i < data.colNumber; i++) {
      const size = data.cols[i] ? data.cols[i].size : DEFAULT_CELL_WIDTH;
      const col = {
        left: current,
        right: current + size,
        size: size,
        name: numberToLetter(i),
      };
      state.cols.push(col);
      current = col.right;
    }
    state.width = state.cols[state.cols.length - 1].right + 10;
  }

  /**
   * Compute and update currentrow/currentcol depending on scrolling state
   *
   * @param {'row'|'col'} type
   */
  update(type) {
    if (type === 'row') {
      const y = this.vScrollbar.el.scrollTop;
      for (let i = 0; i < this.data.rowNumber; i++) {
        if (this.state.rows[i].bottom > y) {
          this.state.currentRow = i;
          break;
        }
      }
    } else {
      const x = this.hScrollbar.el.scrollLeft;
      for (let i = 0; i < this.data.colNumber; i++) {
        const col = this.state.cols[i];
        if (x < ((col.right + col.left) / 2)) {
          this.state.currentCol = i;
          break;
        }
      }
    }
  }
  onMouseWheel(ev) {
    const vScrollbar = this.vScrollbar.el;
    vScrollbar.scrollTop = vScrollbar.scrollTop + ev.deltaY;
    const hScrollbar = this.hScrollbar.el;
    hScrollbar.scrollLeft = hScrollbar.scrollLeft + ev.deltaX;
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 *  0 => 'A', 25 => 'Z', 26 => 'AA', 27 => 'AB', ...
 */
function numberToLetter(n) {
  if (n < 26) {
    return String.fromCharCode(65 + n);
  } else {
    return numberToLetter(Math.floor(n / 26) - 1) + numberToLetter(n % 26);
  }
}
