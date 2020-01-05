import { HEADER_WIDTH, HEADER_HEIGHT } from "./grid_model.js";
import { Composer } from "./composer.js";

const { Component } = owl;
const { xml, css } = owl.tags;
const { useRef } = owl.hooks;

function drawHeaderCells(ctx, model) {
  const { current, cols, rows, selection } = model;
  const { top, left, bottom, right } = current;

  ctx.fillStyle = "#f4f5f8";
  ctx.font = "400 12px Source Sans Pro";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // top left empty case
  ctx.fillRect(0, 0, HEADER_WIDTH, HEADER_HEIGHT);

  // column headers
  const offsetX = model.offsetX;
  for (let i = left; i <= right; i++) {
    const col = cols[i];
    ctx.fillStyle = i >= selection.left && i <= selection.right ? "#e7edf9" : "#f4f5f8";
    ctx.fillRect(col.left - offsetX, 0, col.right - offsetX, HEADER_HEIGHT);
    ctx.fillStyle = "#111";
    ctx.fillText(col.name, (col.left + col.right) / 2 - offsetX, HEADER_HEIGHT / 2);
  }

  // row headers
  const offsetY = model.offsetY;
  for (let i = top; i <= bottom; i++) {
    const row = rows[i];
    ctx.fillStyle = i >= selection.top && i <= selection.bottom ? "#e7edf9" : "#f4f5f8";
    ctx.fillRect(0, row.top - offsetY, HEADER_WIDTH, row.bottom - offsetY);
    ctx.fillStyle = "#585757";
    ctx.fillText(row.name, HEADER_WIDTH / 2, (row.top + row.bottom) / 2 - offsetY);
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

function drawBackgroundGrid(ctx, model, width, height) {
  const { current, cols, rows } = model;
  const { top, left, bottom, right } = current;

  // header lines
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = "#555";
  vLine(ctx, HEADER_WIDTH, height);
  hLine(ctx, HEADER_HEIGHT, width);

  // vertical lines
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 0.33;
  const offsetX = model.offsetX;
  for (let i = left; i <= right; i++) {
    const col = cols[i];
    vLine(ctx, col.right - offsetX, height);
  }

  // horizontal lines
  const offsetY = model.offsetY;
  for (let i = top; i <= bottom; i++) {
    const row = rows[i];
    hLine(ctx, row.bottom - offsetY, width);
  }
}

function isCellVisible(col, row, model) {
  const { top, left, bottom, right } = model.current;
  return col >= left && col <= right && row >= top && row <= bottom;
}

function drawCells(ctx, model) {
  const { offsetX, offsetY, rows, cols } = model;
  ctx.fillStyle = "#000";
  const styles = model.styles;

  for (let xc in model.cells) {
    // to do: skip many rows
    let cell = model.cells[xc];
    if (isCellVisible(cell._col, cell._row, model)) {
      let col = cols[cell._col];
      let row = rows[cell._row];
      const style = styles[cell.style] || {};
      const align = "align" in style ? style.align : cell._type === "text" ? "left" : "right";
      const italic = style.italic ? "italic " : "";
      const weight = style.bold ? "bold" : "500";
      ctx.font = `${italic}${weight} 12px arial`;
      ctx.save();
      ctx.rect(col.left - offsetX, row.top - offsetY, col.size, row.size);
      ctx.clip();

      let x;
      let y = (row.top + row.bottom) / 2 - offsetY;
      if (align === "left") {
        x = col.left - offsetX + 3;
      } else if (align === "right") {
        x = col.right - offsetX - 3;
      } else {
        x = (col.left + col.right) / 2 - offsetX;
      }
      ctx.textAlign = align;
      ctx.fillText(cell._value, x, y);
      if (style.strikethrough) {
        const width = ctx.measureText(cell._value).width;
        if (align === "right") {
          x = x - width;
        }
        ctx.fillRect(x, y, width, 0.5);
      }
      ctx.restore();
    }
  }
}

function drawSelectionBackground(ctx, model) {
  const { cols, rows, selection } = model;
  const { left, top, right, bottom } = selection;
  const offsetX = model.offsetX;
  const offsetY = model.offsetY;
  ctx.fillStyle = "#f2f6fe";
  const x = Math.max(cols[left].left - offsetX, HEADER_WIDTH);
  const width = cols[right].right - offsetX - x;
  const y = Math.max(rows[top].top - offsetY, HEADER_HEIGHT);
  const height = rows[bottom].bottom - offsetY - y;
  if (width > 0 && height > 0) {
    ctx.fillRect(x, y, width, height);
  }
}

function drawSelectionOutline(ctx, model) {
  const { cols, rows, selection } = model;
  const { left, top, right, bottom } = selection;
  const offsetX = model.offsetX;
  const offsetY = model.offsetY;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#4b89ff";
  const x = Math.max(cols[left].left - offsetX, HEADER_WIDTH);
  const width = cols[right].right - offsetX - x;
  const y = Math.max(rows[top].top - offsetY, HEADER_HEIGHT);
  const height = rows[bottom].bottom - offsetY - y;
  if (width > 0 && height > 0) {
    ctx.strokeRect(x, y, width, height);
  }
}

function drawGrid(ctx, model, width, height) {
  console.log("drawing", model);
  ctx.clearRect(0, 0, width, height);

  drawHeaderCells(ctx, model);
  drawSelectionBackground(ctx, model);
  drawBackgroundGrid(ctx, model, width, height);
  drawSelectionOutline(ctx, model);
  drawCells(ctx, model);
}

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet-sheet">
    <t t-if="model.isEditing">
      <Composer model="model" />
    </t>
    <canvas t-ref="canvas"
      t-on-mousedown="onMouseDown"
      t-on-dblclick="onDoubleClick"
      t-on-keydown="onKeydown" tabindex="-1"
      t-on-mousewheel="onMouseWheel" />
    <div class="o-scrollbar vertical" t-on-scroll="onScroll" t-ref="vscrollbar">
      <div t-attf-style="width:1px;height:{{model.height}}px"/>
    </div>
    <div class="o-scrollbar horizontal" t-on-scroll="onScroll" t-ref="hscrollbar">
      <div t-attf-style="height:1px;width:{{model.width}}px"/>
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
  model = this.props.model;

  mounted() {
    const canvas = this.canvas.el;
    this.focus();
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

  focus() {
    this.canvas.el.focus();
  }

  onScroll() {
    const model = this.model;
    const { offsetX, offsetY } = model;
    this.updateVisibleZone();
    if (offsetX !== model.offsetX || offsetY !== model.offsetY) {
      this.render();
    }
  }

  updateVisibleZone() {
    const width = this.el.clientWidth;
    const height = this.el.clientHeight;
    const offsetY = this.vScrollbar.el.scrollTop;
    const offsetX = this.hScrollbar.el.scrollLeft;
    this.model.updateVisibleZone(width, height, offsetX, offsetY);
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
    drawGrid(this.context, this.model, width, height);
  }

  onMouseWheel(ev) {
    const vScrollbar = this.vScrollbar.el;
    vScrollbar.scrollTop = vScrollbar.scrollTop + ev.deltaY;
    const hScrollbar = this.hScrollbar.el;
    hScrollbar.scrollLeft = hScrollbar.scrollLeft + ev.deltaX;
  }

  getColRowFromXY(x, y) {
    if (x <= HEADER_WIDTH || y <= HEADER_HEIGHT) {
      return [];
    }
    let col, row;
    const model = this.model;
    const { cols, rows, offsetX, offsetY } = model;
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
    return [col, row];
  }
  onMouseDown(ev) {
    // 32 for toolbar height. could not find a better way to get actual y offset
    const [col, row] = this.getColRowFromXY(ev.clientX, ev.clientY - 32);
    this.clickedCol = col;
    this.clickedRow = row;
    if (col !== undefined && row !== undefined) {
      this.model.selectCell(col, row);
      let prevCol = col;
      let prevRow = row;
      const onMouseMove = ev => {
        const [col, row] = this.getColRowFromXY(ev.clientX, ev.clientY - 32);
        if (col === undefined || row === undefined) {
          return;
        }
        if (col !== prevCol || row !== prevRow) {
          prevCol = col;
          prevRow = row;
          this.model.updateSelection(col, row);
        }
      };
      const onMouseUp = () => {
        this.canvas.el.removeEventListener("mousemove", onMouseMove);
        this.canvas.el.removeEventListener("mouseup", onMouseUp);
      };
      this.canvas.el.addEventListener("mousemove", onMouseMove);
      this.canvas.el.addEventListener("mouseup", onMouseUp);
    }
  }

  onDoubleClick(ev) {
    const [col, row] = this.getColRowFromXY(ev.clientX, ev.clientY - 32);
    if (this.clickedCol === col && this.clickedRow === row) {
      this.model.startEditing();
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
      this.model.moveSelection(...delta, ev.shiftKey);
      return;
    }
    if (ev.key === "Tab") {
      ev.preventDefault();
      const deltaX = ev.shiftKey ? -1 : 1;
      this.model.moveSelection(deltaX, 0);
      return;
    }
    if (ev.key === "Enter") {
      this.model.startEditing();
      return;
    }
    if (ev.key === "Delete") {
      this.model.deleteSelection();
    }
    if (ev.key === "c" && ev.ctrlKey) {
      this.model.copySelection();
      return;
    }
    if (ev.key === "v" && ev.ctrlKey) {
      this.model.pasteSelection();
      return;
    }

    if (ev.key.length === 1) {
      this.model.startEditing(ev.key);
    }
  }
}
