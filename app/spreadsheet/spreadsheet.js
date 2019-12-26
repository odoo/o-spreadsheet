import { Grid } from "./grid.js";
import { numberToLetters, toCartesian } from "./helpers.js";
import { parse, evaluate } from "./expression_parser.js";

const { Component } = owl;
const { xml, css } = owl.tags;

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
  <div class="o-spreadsheet" t-on-keydown="onKeydown" tabindex="-1">
    <ToolBar />
    <Grid state="state"/>
  </div>`;

const CSS = css /* scss */`
  .o-spreadsheet {
    display: grid;
    grid-template-rows: 40px auto;
  }`;

export class Spreadsheet extends Component {
  static template = TEMPLATE;
  static style = CSS;
  static components = { ToolBar, Grid };

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
    selectedCol: 0,
    selectedRow: 0,

    cells: this.props.data.cells,
  };


  constructor() {
    super(...arguments);
    useExternalListener(window, 'resize', this.render);
    this.computeState();
    this.processCells();
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
    const numberRegexp = /^-?\d+(,\d+)*(\.\d+(e\d+)?)?$/;
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

  onKeydown(ev) {
    const deltaMap = {
      ArrowDown: [0,1],
      ArrowLeft: [-1,0],
      ArrowRight: [1,0],
      ArrowUp: [0,-1]
    }
    const delta = deltaMap[ev.key];
    if (!delta) {
      return;
    }
    const [deltaX, deltaY] = delta;
    this.state.selectedCol = (this.state.selectedCol || 0) + deltaX;
    this.state.selectedRow = (this.state.selectedRow || 0) + deltaY;
    // todo: prevent selected zone to go off screen, and to go out of the
    //   bounds
    this.render();
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