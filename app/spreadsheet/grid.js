import { HEADER_WIDTH, HEADER_HEIGHT } from "./grid_state.js";
import { Composer } from "./composer.js";

const { Component } = owl;
const { xml, css } = owl.tags;
const { useRef } = owl.hooks;

function drawHeaderCells(ctx, state) {
  const {
    topRow,
    leftCol,
    rightCol,
    bottomRow,
    cols,
    rows,
    selectedCol,
    selectedRow
  } = state;

  ctx.fillStyle = "#f4f5f8";
  ctx.font = "400 12px Source Sans Pro";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // top left empty case
  ctx.fillRect(0, 0, HEADER_WIDTH, HEADER_HEIGHT);

  // column headers
  const offsetX = state.offsetX;
  for (let i = leftCol; i <= rightCol; i++) {
    const col = cols[i];
    ctx.fillStyle = i === selectedCol ? "#e7edf9" : "#f4f5f8";
    ctx.fillRect(col.left - offsetX, 0, col.right - offsetX, HEADER_HEIGHT);
    ctx.fillStyle = "#111";
    ctx.fillText(
      col.name,
      (col.left + col.right) / 2 - offsetX,
      HEADER_HEIGHT / 2
    );
  }

  // row headers
  const offsetY = state.offsetY;
  for (let i = topRow; i <= bottomRow; i++) {
    const row = rows[i];
    ctx.fillStyle = i === selectedRow ? "#e7edf9" : "#f4f5f8";
    ctx.fillRect(0, row.top - offsetY, HEADER_WIDTH, row.bottom - offsetY);
    ctx.fillStyle = "#585757";
    ctx.fillText(
      row.name,
      HEADER_WIDTH / 2,
      (row.top + row.bottom) / 2 - offsetY
    );
  }
}

function vLine(ctx, x, height) {
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
}

function hLine(ctx, y, width) {
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
}

function drawBackgroundGrid(ctx, state, width, height) {
  const { leftCol, rightCol, topRow, bottomRow, cols, rows } = state;

  // header lines
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = "#555";
  vLine(ctx, HEADER_WIDTH, height);
  hLine(ctx, HEADER_HEIGHT, width);

  // vertical lines
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 0.33;
  const offsetX = state.offsetX;
  for (let i = leftCol; i <= rightCol; i++) {
    const col = cols[i];
    vLine(ctx, col.right - offsetX, height);
  }

  // horizontal lines
  const offsetY = state.offsetY;
  for (let i = topRow; i <= bottomRow; i++) {
    const row = rows[i];
    hLine(ctx, row.bottom - offsetY, width);
  }
}

function isCellVisible(col, row, state) {
  const { leftCol, topRow, rightCol, bottomRow } = state;
  return col >= leftCol && col <= rightCol && row >= topRow && row <= bottomRow;
}

function drawCells(ctx, state) {
  const { offsetX, offsetY, rows, cols } = state;
  ctx.font = "500 12px arial";
  ctx.fillStyle = "#000";
  const styles = state.styles;

  for (let xc in state.cells) {
    // to do: skip many rows
    let cell = state.cells[xc];
    if (isCellVisible(cell._col, cell._row, state)) {
      let col = cols[cell._col];
      let row = rows[cell._row];
      const align = styles[cell._style].align;
      let x;
      let y = (row.top + row.bottom) / 2 - offsetY;
      if (align === "left") {
        x = col.left - offsetX + 4;
      } else if (align === "right") {
        x = col.right - offsetX - 4;
      } else {
        x = (col.left + col.right) / 2 - offsetX;
      }
      ctx.textAlign = align;
      ctx.fillText(cell._value, x, y);
    }
  }
}

function drawSelectedCell(ctx, state) {
  const { cols, rows, selectedCol, selectedRow } = state;
  if (!isCellVisible(selectedCol, selectedRow, state)) {
    return;
  }
  const offsetX = state.offsetX;
  const offsetY = state.offsetY;
  const row = rows[selectedRow];
  const col = cols[selectedCol];
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#4b89ff";
  ctx.strokeRect(col.left - offsetX, row.top - offsetY, col.size, row.size);
}

function drawGrid(ctx, state, width, height) {
  console.log("drawing", state);
  ctx.clearRect(0, 0, width, height);

  drawHeaderCells(ctx, state);
  drawBackgroundGrid(ctx, state, width, height);
  drawCells(ctx, state);
  drawSelectedCell(ctx, state);
}

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet-sheet">
    <t t-if="props.state.isEditing">
      <Composer state="props.state" />
    </t>
    <canvas t-ref="canvas"
      t-on-click="onClick"
      t-on-keydown="onKeydown" tabindex="-1"
      t-on-mousewheel="onMouseWheel" />
    <div class="o-scrollbar vertical" t-on-scroll="onScroll" t-ref="vscrollbar">
      <div t-attf-style="width:1px;height:{{props.state.height}}px"/>
    </div>
    <div class="o-scrollbar horizontal" t-on-scroll="onScroll" t-ref="hscrollbar">
      <div t-attf-style="height:1px;width:{{props.state.width}}px"/>
    </div>
  </div>`;

const CSS = css/* scss */ `
  .o-spreadsheet-sheet {
    position: relative;
    overflow: hidden;

    .o-composer {
      position: absolute;
      border: none;
    }
    .o-composer:focus {
      outline: none;
    }
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
`;

export class Grid extends Component {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Composer };

  vScrollbar = useRef("vscrollbar");
  hScrollbar = useRef("hscrollbar");
  canvas = useRef("canvas");
  context = null;
  hasFocus = false;

  mounted() {
    const canvas = this.canvas.el;
    canvas.focus();
    const ctx = canvas.getContext("2d");
    // Scale all drawing operations by the dpr, so you
    // don't have to worry about the difference.
    // ctx.scale(this.dpr, this.dpr);
    this.context = ctx;
    this.updateVisibleZone();
    this.drawGrid();
  }

  willPatch() {
    this.hasFocus = this.el.contains(document.activeElement);
  }
  patched() {
    this.updateVisibleZone();
    this.drawGrid();
    if (this.hasFocus && !this.el.contains(document.activeElement)) {
      this.canvas.el.focus();
    }
  }

  onScroll() {
    const state = this.props.state;
    const { offsetX, offsetY } = state;
    this.updateVisibleZone();
    if (offsetX !== state.offsetX || offsetY !== state.offsetY) {
      this.render();
    }
  }

  updateVisibleZone() {
    const width = this.el.clientWidth;
    const height = this.el.clientHeight;
    const offsetY = this.vScrollbar.el.scrollTop;
    const offsetX = this.hScrollbar.el.scrollLeft;
    this.props.state.updateVisibleZone(width, height, offsetX, offsetY);
  }
  drawGrid() {
    // whenever the dimensions are changed, we need to reset the width/height
    // of the canvas manually, and reset its scaling.
    const dpr = window.devicePixelRatio || 1;
    const width = this.el.clientWidth;
    const height = this.el.clientHeight;
    const canvas = this.canvas.el;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    this.context.scale(dpr, dpr);
    drawGrid(this.context, this.props.state, width, height);
  }

  onMouseWheel(ev) {
    const vScrollbar = this.vScrollbar.el;
    vScrollbar.scrollTop = vScrollbar.scrollTop + ev.deltaY;
    const hScrollbar = this.hScrollbar.el;
    hScrollbar.scrollLeft = hScrollbar.scrollLeft + ev.deltaX;
  }

  onClick(ev) {
    const x = ev.clientX;
    // 32 for toolbar height. could not find a better way to get actual y offset
    const y = ev.clientY - 32;
    if (x <= HEADER_WIDTH || y <= HEADER_HEIGHT) {
      return;
    }
    let col, row;
    const state = this.props.state;
    const { cols, rows, offsetX, offsetY } = state;
    for (let i = 0; i < cols.length; i++) {
      let c = cols[i];
      if (c.left - offsetX <= x && x <= c.right - offsetX) {
        col = i;
        break;
      }
    }
    for (let i = 0; i < rows.length; i++) {
      let r = rows[i];
      if (r.top - offsetY <= y && y <= r.bottom - offsetY) {
        row = i;
        break;
      }
    }
    if (col !== undefined && row !== undefined) {
      this.props.state.selectCell(col, row);
    }
  }

  onKeydown(ev) {
    const deltaMap = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1]
    };
    const delta = deltaMap[ev.key];
    if (delta) {
      this.props.state.moveSelection(...delta);
      return;
    }
    if (ev.key === "Tab") {
      ev.preventDefault();
      const deltaX = ev.shiftKey ? -1 : 1;
      this.props.state.moveSelection(deltaX, 0);
      return;
    }
    if (ev.key === "Enter") {
      this.props.state.startEditing();
      return;
    }
    if (ev.key.length === 1) {
      this.props.state.startEditing(ev.key);
    }
  }
}
