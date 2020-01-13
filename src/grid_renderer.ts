import { HEADER_WIDTH, HEADER_HEIGHT, GridModel, Col, Row, Cell, Zone, Style } from "./grid_model";
import { toXC } from "./helpers";

// Global variables

let viewport: Zone;
let ctx: CanvasRenderingContext2D;
let offsetX: number;
let offsetY: number;
let model: GridModel;
let width: number;
let height: number;

function dpr() {
  return window.devicePixelRatio || 1;
}

function thinLineWidth() {
  return 0.5 / dpr();
}

function drawHeader() {
  const { cols, rows, selection } = model;
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

function drawBackgroundGrid() {
  const { cols, rows } = model;
  const { top, left, bottom, right } = viewport;

  ctx.lineWidth = thinLineWidth();
  ctx.strokeStyle = "#AAA";
  // vertical lines
  for (let i = left; i <= right; i++) {
    const col = cols[i];
    vLine(ctx, col.right - offsetX, height);
  }

  // horizontal lines
  for (let i = top; i <= bottom; i++) {
    const row = rows[i];
    hLine(ctx, row.bottom - offsetY, width);
  }
}

/**
 * Main entry point for drawing a box content (either a cell or a merge).
 * It draws the background, the text, and align it properly.
 *
 * Note that it does not clip the text to the box area.  Clipping (if necessary)
 * should be done by the caller.
 */
function drawBox(text: string, style: Style, type, left: Col, top: Row, right: Col, bottom: Row) {
  const align = style.align || (type === "text" ? "left" : "right");
  const italic = style.italic ? "italic " : "";
  const weight = style.bold ? "bold" : "500";
  ctx.font = `${italic}${weight} 12px arial`;
  if (style.fillColor) {
    ctx.fillStyle = style.fillColor;
    const lw = thinLineWidth();
    ctx.fillRect(left.left - offsetX + lw, top.top - offsetY + lw, right.right - left.left - 2*lw, bottom.bottom - top.top - 2*lw);
  }
  ctx.fillStyle = style.textColor || "#000";
  let x;
  let y = (top.top + bottom.bottom) / 2 - offsetY + 3;
  if (align === "left") {
    x = left.left - offsetX + 3;
  } else if (align === "right") {
    x = right.right - offsetX - 3;
  } else {
    x = (left.left + right.right) / 2 - offsetX;
  }
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  if (style.strikethrough) {
    const width = ctx.measureText(text).width;
    if (align === "right") {
      x = x - width;
    }
    ctx.fillRect(x, y - 3, width, 2.5 * thinLineWidth());
  }
}

function drawCells() {
  const { rows, cols, cells } = model;
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

  function drawCell(col: Col, row: Row, cell: Cell) {
    const style = cell.style ? styles[cell.style] : {};
    const align = style.align || (cell.type === "text" ? "left" : "right");
    ctx.save();

    if (cell.xc in model.mergeCellMap) {
      // this should be a topleft cell for a merge
      const merge = model.merges[model.mergeCellMap[cell.xc]];
      const left = cols[merge.left];
      const right = cols[merge.right];
      const top = rows[merge.top];
      const bottom = rows[merge.bottom];
      const width = right.right - left.left;
      const height = bottom.bottom - top.top;
      ctx.rect(left.left - offsetX, top.top - offsetY, width, height);
      ctx.clip();
      drawBox(cell.value, style, cell.type, left, top, right, bottom);
      ctx.restore();
      return;
    }
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

    drawBox(cell.value, style, cell.type, col, row, col, row);
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

function drawMerges() {
  const { merges, cols, rows } = model;
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

function drawSelectionBackground() {
  const { cols, rows, selection } = model;
  const { left, top, right, bottom } = selection;
  ctx.fillStyle = "#f3f7fe";
  const x = Math.max(cols[left].left - offsetX, HEADER_WIDTH);
  const width = cols[right].right - offsetX - x;
  const y = Math.max(rows[top].top - offsetY, HEADER_HEIGHT);
  const height = rows[bottom].bottom - offsetY - y;
  if (width > 0 && height > 0) {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillRect(x, y, width, height);
    ctx.globalCompositeOperation = "source-over";
  }
}

function drawSelectionOutline() {
  drawOutline(model.selection);
}

function drawOutline(zone: Zone, color: string = "#3266ca") {
  const { cols, rows } = model;
  const { left, top, right, bottom } = zone;
  const lw = thinLineWidth();
  ctx.lineWidth = 3 * lw;
  ctx.strokeStyle = color;
  const x = Math.max(cols[left].left - offsetX, HEADER_WIDTH + lw);
  const width = cols[right].right - offsetX - x;
  const y = Math.max(rows[top].top - offsetY, HEADER_HEIGHT + lw);
  const height = rows[bottom].bottom - offsetY - y;
  if (width > 0 && height > 0) {
    ctx.strokeRect(x, y, width, height);
  }
}

function drawHighlights() {
  for (let h of model.highlights) {
    drawOutline(h.zone, h.color!);
  }
}

export function drawGrid(context: CanvasRenderingContext2D, _model: GridModel, _width, _height) {
  (window as any).gridmodel = _model; // to debug. remove this someday
  viewport = _model.viewport;
  ctx = context;
  offsetX = _model.offsetX;
  offsetY = _model.offsetY;
  model = _model;
  width = _width;
  height = _height;

  ctx.clearRect(0, 0, width, height);

  drawBackgroundGrid();
  drawMerges();
  drawCells();
  drawSelectionBackground();
  drawSelectionOutline();
  drawHeader();
  drawHighlights();
}
