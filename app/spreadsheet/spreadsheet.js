import { drawGrid, HEADER_WIDTH, HEADER_HEIGHT } from "./grid.js";
import { numberToLetters, toCartesian } from "./helpers.js";
import { parse, evaluate } from "./expression_parser.js";

const { Component } = owl;
const { xml, css } = owl.tags;
const { useRef } = owl.hooks;


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
const DEFAULT_CELL_WIDTH = 100;
const DEFAULT_CELL_HEIGHT = 26;

const TEMPLATE = xml /* xml */`
  <div class="o-spreadsheet">
    <ToolBar/>
    <div class="o-spreadsheet-sheet">
      <canvas t-ref="canvas"
        t-on-mousewheel="onMouseWheel" />
      <div class="o-scrollbar vertical" t-on-scroll="render" t-ref="vscrollbar">
        <div t-attf-style="width:1px;height:{{state.height}}px"/>
      </div>
      <div class="o-scrollbar horizontal" t-on-scroll="render" t-ref="hscrollbar">
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
        top: ${HEADER_HEIGHT}px;
        bottom: 15px;
      }
      .o-scrollbar.horizontal {
        bottom: 0;
        right: 15px;
        left: ${HEADER_WIDTH}px;
      }
    }
  }`;

export class Spreadsheet extends Component {
  static template = TEMPLATE;
  static style = CSS;
  static components = { ToolBar };

  state = {
    // width and height of the sheet zone (not just the visible part, and excluding
    // the row and col headers)
    width: null,
    height: null,

    // offset between the visible zone and the full zone (take into account
    // headers)
    offsetX: 0,
    offsetY: 0,
    // coordinates of the visible zone
    topRow: null,
    leftCol: null,
    rightCol: null,
    bottomRow: null,

    // each row is described by: { top: ..., bottom: ..., name: '5', size: ... }
    rows: [],
    // each col is described by: { left: ..., right: ..., name: 'B', size: ... }
    cols: [],


    // coordinate of the selected cell
    selectedCol: 2,
    selectedRow: 3,

    cells: this.props.data.cells,
  };

  vScrollbar = useRef('vscrollbar');
  hScrollbar = useRef('hscrollbar');
  canvas = useRef('canvas');
  context = null;

  constructor() {
    super(...arguments);
    useExternalListener(window, 'resize', this.render);
    this.computeState();
    this.processCells();
  }

  mounted() {
    // Get the device pixel ratio, falling back to 1.
    // const dpr = window.devicePixelRatio || 1;
    // // Get the size of the canvas in CSS pixels.
    // const rect = canvas.getBoundingClientRect();
    // // Give the canvas pixel dimensions of their CSS
    // // size * the device pixel ratio.
    // canvas.width = rect.width * dpr;
    // canvas.height = rect.height * dpr;
    const ctx = this.canvas.el.getContext('2d');
    // Scale all drawing operations by the dpr, so you
    // don't have to worry about the difference.
    // ctx.scale(this.dpr, this.dpr);
    this.context = ctx; // this.canvas.el.getContext('2d');
    this.drawGrid();
  }

  patched() {
    this.drawGrid();
  }

  /**
   * Process the data to precompute some derived informations:
   * - rows/cols dimensions
   * - total grid dimension
   */
  computeState() {
    const data = this.props.data;
    const state = this.state;

    let current = 0;
    for (let i = 0; i < data.rowNumber; i++) {
      const size = data.rows[i] ? data.rows[i].size : DEFAULT_CELL_HEIGHT;
      const row = {
        top: current,
        bottom: current + size,
        size: size,
        name: String(i + 1),
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
        name: numberToLetters(i),
      };
      state.cols.push(col);
      current = col.right;
    }
    state.width = state.cols[state.cols.length - 1].right + 10;
  }

  processCells() {
    const cells = this.state.cells;
    // xc = "excel coordinate"
    const numberRegexp =/^-?\d+(,\d+)*(\.\d+(e\d+)?)?$/;
    for (let xc in cells) {
      const cell = cells[xc];
      const [col, row] = toCartesian(xc);
      cell._col = col;
      cell._row = row;
      const content = cell.content;
      cell._type = content[0] === '=' ? 'formula' : content.match(numberRegexp) ? 'number' : 'text';
      if (cell._type === "formula") {
        cell._formula = parse(cell.content.slice(1)); // slice to remove the = sign
      }
    }
    this.evaluateCells();
  }

  evaluateCells() {
    const cells = this.state.cells;
    for (let xc in cells) {
      const cell = cells[xc];
      if (cell._type === "number") {
        cell._value = parseFloat(cell.content);
      }
      if (cell._type === "text") {
        cell._value = cell.content;
      }
      if (cell._type === "formula") {
        cell._value = evaluate(cell._formula, cells);
      }
    }
  }
  updateVisibleZone() {
    const { rows, cols } = this.state;

    const offsetY = this.vScrollbar.el ? this.vScrollbar.el.scrollTop : 0;
    const offsetX = this.hScrollbar.el ? this.hScrollbar.el.scrollLeft : 0;

    this.state.bottomRow = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].top <= offsetY) {
        this.state.topRow = i;
      }
      if (offsetY + this.props.height - 40 < rows[i].bottom) {
        this.state.bottomRow = i;
        break;
      }
    }
    this.state.rightCol = cols.length - 1;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].left <= offsetX) {
        this.state.leftCol = i;
      }
      if (offsetX + this.props.width < cols[i].right) {
        this.state.rightCol = i;
        break;
      }
    }
    this.state.offsetX = cols[this.state.leftCol].left - HEADER_WIDTH;
    this.state.offsetY = rows[this.state.topRow].top - HEADER_HEIGHT;
  }


  drawGrid() {
    // whenever the dimensions are changed, we need to reset the width/height
    // of the canvas manually, and reset its scaling.
    const dpr = window.devicePixelRatio || 1;
    const width = this.el.clientWidth;
    const height = this.el.clientHeight - 40;
    const canvas = this.canvas.el;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute('style', `width:${width}px;height:${height}px;`)
    this.context.scale(dpr, dpr);
    this.updateVisibleZone();
    drawGrid(this.context, this.state, width, height)
  }

  onMouseWheel(ev) {
    const vScrollbar = this.vScrollbar.el;
    vScrollbar.scrollTop = vScrollbar.scrollTop + ev.deltaY;
    const hScrollbar = this.hScrollbar.el;
    hScrollbar.scrollLeft = hScrollbar.scrollLeft + ev.deltaX;
  }
}

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

function useExternalListener(target, eventName, handler) {
  const boundHandler = handler.bind(Component.current);

  owl.hooks.onMounted(() => target.addEventListener(eventName, boundHandler));
  owl.hooks.onWillUnmount(() => target.removeEventListener(eventName, boundHandler));
}