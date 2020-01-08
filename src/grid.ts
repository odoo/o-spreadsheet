import * as owl from "@odoo/owl";

import { HEADER_WIDTH, HEADER_HEIGHT } from "./grid_model.js";
import { Composer } from "./composer.js";
import { toXC } from "./helpers.js";

const { Component } = owl;
const { xml, css } = owl.tags;
const { useRef } = owl.hooks;

function dpr() {
  return window.devicePixelRatio || 1;
}

function thinLineWidth() {
  return 0.5 / dpr();
}

function drawHeader(ctx, model, width, height) {
  const { viewport, cols, rows, selection, offsetX, offsetY } = model;
  const { top, left, bottom, right } = viewport;

  ctx.fillStyle = "#f4f5f8";
  ctx.font = "400 12px Source Sans Pro";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = thinLineWidth();
  ctx.strokeStyle = "#666";

  // background
  ctx.fillRect(0, 0, width, HEADER_HEIGHT);
  ctx.fillRect(0, 0, HEADER_WIDTH, height);
  // selection background
  ctx.fillStyle = "#dddddd";
  const x1 = Math.max(HEADER_WIDTH, cols[selection.left].left - offsetX);
  const x2 = Math.max(HEADER_WIDTH, cols[selection.right].right - offsetX);
  const y1 = Math.max(HEADER_HEIGHT, rows[selection.top].top - offsetY);
  const y2 = Math.max(HEADER_HEIGHT, rows[selection.bottom].bottom - offsetY);
  ctx.fillRect(x1, 0, x2 - x1, HEADER_HEIGHT);
  ctx.fillRect(0, y1, HEADER_WIDTH, y2 - y1);

  // 2 main lines
  vLine(ctx, HEADER_WIDTH, height);
  hLine(ctx, HEADER_HEIGHT, width);

  ctx.fillStyle = "#111";
  // column text + separator
  for (let i = left; i <= right; i++) {
    const col = cols[i];
    ctx.fillText(col.name, (col.left + col.right) / 2 - offsetX, HEADER_HEIGHT / 2);
    vLine(ctx, col.right - offsetX, HEADER_HEIGHT);
  }

  // row text + separator
  for (let i = top; i <= bottom; i++) {
    const row = rows[i];
    ctx.fillText(row.name, HEADER_WIDTH / 2, (row.top + row.bottom) / 2 - offsetY);
    hLine(ctx, row.bottom - offsetY, HEADER_WIDTH);
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
  const { viewport, cols, rows } = model;
  const { top, left, bottom, right } = viewport;

  ctx.lineWidth = thinLineWidth();
  ctx.strokeStyle = "#AAA";
  // vertical lines
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

function drawCells(ctx, model) {
  const { offsetX, offsetY, rows, cols, viewport, cells } = model;
  const { right, left, top, bottom } = viewport;
  ctx.fillStyle = "#000";
  const styles = model.styles;

  for (let rowNumber = top; rowNumber <= bottom; rowNumber++) {
    let row = rows[rowNumber];
    for (let colNumber = left; colNumber <= right; colNumber++) {
      let cell = row.cells[colNumber];
      if (cell) {
        drawCell(cols[colNumber], row, cell);
      }
    }
  }

  function drawCell(col, row, cell) {
    const style = styles[cell.style] || {};
    const align = "align" in style ? style.align : cell.type === "text" ? "left" : "right";
    const italic = style.italic ? "italic " : "";
    const weight = style.bold ? "bold" : "500";
    ctx.font = `${italic}${weight} 12px arial`;
    ctx.save();

    // Compute clip zone
    if (align === "left") {
      let c = cell.col;
      while (c < right && !(toXC(c + 1, cell.row) in cells)) {
        c++;
      }
      const width = cols[c].right - col.left;
      ctx.rect(col.left - offsetX, row.top - offsetY, width, row.size);
    } else {
      let c = cell.col;
      while (c > left && !(toXC(c - 1, cell.row) in cells)) {
        c--;
      }
      const width = col.right - cols[c].left;
      ctx.rect(cols[c].left - offsetX, row.top - offsetY, width, row.size);
    }
    ctx.clip();

    let x;
    let y = (row.top + row.bottom) / 2 - offsetY + 3;
    if (align === "left") {
      x = col.left - offsetX + 3;
    } else if (align === "right") {
      x = col.right - offsetX - 3;
    } else {
      x = (col.left + col.right) / 2 - offsetX;
    }
    ctx.textAlign = align;
    ctx.fillText(cell.value, x, y);
    if (style.strikethrough) {
      const width = ctx.measureText(cell.value).width;
      if (align === "right") {
        x = x - width;
      }
      ctx.fillRect(x, y, width, 0.5);
    }
    ctx.restore();
  }
}

function overlap(r1, r2) {
  if (r1.bottom < r2.top || r2.bottom < r2.top) {
    return false;
  }
  if (r1.right < r2.left || r2.right < r1.left) {
    return false;
  }
  return true;
}

function drawMerges(ctx, model) {
  const { merges, cols, rows, offsetX, offsetY, viewport } = model;
  const hl = 0.8 * thinLineWidth();
  ctx.strokeStyle = "#777";
  ctx.fillStyle = "white";
  for (let id in merges) {
    let merge = merges[id];
    if (overlap(merge, viewport)) {
      drawMerge(merge);
    }
  }
  function drawMerge(merge) {
    let x1 = cols[merge.left].left - offsetX + hl;
    let x2 = cols[merge.right].right - offsetX - hl;
    let y1 = rows[merge.top].top - offsetY + hl;
    let y2 = rows[merge.bottom].bottom - offsetY - hl;
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
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
  const lw = thinLineWidth();
  ctx.lineWidth = 3 * lw;
  ctx.strokeStyle = "#3266ca";
  const x = Math.max(cols[left].left - offsetX, HEADER_WIDTH + lw);
  const width = cols[right].right - offsetX - x;
  const y = Math.max(rows[top].top - offsetY, HEADER_HEIGHT + lw);
  const height = rows[bottom].bottom - offsetY - y;
  if (width > 0 && height > 0) {
    ctx.strokeRect(x, y, width, height);
  }
}

function drawGrid(ctx, model, width, height) {
  console.log("drawing", model);
  ctx.clearRect(0, 0, width, height);

  drawSelectionBackground(ctx, model);
  drawBackgroundGrid(ctx, model, width, height);
  drawCells(ctx, model);
  drawMerges(ctx, model);
  drawSelectionOutline(ctx, model);
  drawHeader(ctx, model, width, height);
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

export class Grid extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Composer };

  vScrollbar = useRef("vscrollbar");
  hScrollbar = useRef("hscrollbar");
  canvas = useRef("canvas");
  context = null;
  hasFocus = false;
  model = this.props.model;
  clickedCol = 0;
  clickedRow = 0;

  mounted() {
    const canvas = this.canvas.el as any;
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
    this.hasFocus = this.el!.contains(document.activeElement);
  }
  patched() {
    this.updateVisibleZone();
    this.drawGrid();
    if (this.hasFocus && !this.el!.contains(document.activeElement)) {
      this.canvas.el!.focus();
    }
  }

  focus() {
    this.canvas.el!.focus();
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
    const width = this.el!.clientWidth;
    const height = this.el!.clientHeight;
    const offsetY = this.vScrollbar.el!.scrollTop;
    const offsetX = this.hScrollbar.el!.scrollLeft;
    this.model.updateVisibleZone(width, height, offsetX, offsetY);
  }
  drawGrid() {
    // whenever the dimensions are changed, we need to reset the width/height
    // of the canvas manually, and reset its scaling.
    const dpr = window.devicePixelRatio || 1;
    const width = this.el!.clientWidth;
    const height = this.el!.clientHeight;
    const canvas = this.canvas.el as any;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    this.context = canvas.getContext("2d");
    (<any>this.context).translate(0.5, 0.5);
    (<any>this.context).scale(dpr, dpr);
    drawGrid(this.context, this.model, width, height);
  }

  onMouseWheel(ev) {
    const vScrollbar = this.vScrollbar.el!;
    vScrollbar.scrollTop = vScrollbar.scrollTop + ev.deltaY;
    const hScrollbar = this.hScrollbar.el!;
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
        this.canvas.el!.removeEventListener("mousemove", onMouseMove);
        this.canvas.el!.removeEventListener("mouseup", onMouseUp);
      };
      this.canvas.el!.addEventListener("mousemove", onMouseMove);
      this.canvas.el!.addEventListener("mouseup", onMouseUp);
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
