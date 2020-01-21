import { GridModel, Col, Row, Cell, Zone, Style, Merge, Border, BorderDescr } from "../model/index";
import { toXC, overlap } from "../helpers";
import { fontSizeMap } from "../fonts";
import { HEADER_WIDTH, HEADER_HEIGHT } from "../constants";

// Global variables

let viewport: Zone;
let ctx: CanvasRenderingContext2D;
let offsetX: number;
let offsetY: number;
let model: GridModel;
let width: number;
let height: number;
let cols: Col[];
let rows: Row[];
let cells: { [key: string]: Cell };
let mergeCellMap: { [key: string]: number };
let borders: { [key: number]: Border };

function dpr() {
  return window.devicePixelRatio || 1;
}

function thinLineWidth() {
  return 0.4 * dpr();
}

function drawHeader() {
  const { selection } = model.state;
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
  for (let zone of selection.zones) {
    const x1 = Math.max(HEADER_WIDTH, cols[zone.left].left - offsetX);
    const x2 = Math.max(HEADER_WIDTH, cols[zone.right].right - offsetX);
    const y1 = Math.max(HEADER_HEIGHT, rows[zone.top].top - offsetY);
    const y2 = Math.max(HEADER_HEIGHT, rows[zone.bottom].bottom - offsetY);
    ctx.fillRect(x1, 0, x2 - x1, HEADER_HEIGHT);
    ctx.fillRect(0, y1, HEADER_WIDTH, y2 - y1);
  }
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
 * Main entry point for drawing a text box content (either a cell or a merge).
 * It draws everything related to the text.
 *
 * Note that it does not clip the text to the box area.  Clipping (if necessary)
 * should be done by the caller.
 */
function drawTextBox(
  text: string,
  style: Style,
  type,
  left: Col,
  top: Row,
  right: Col,
  bottom: Row
) {
  const align = style.align || (type === "text" ? "left" : "right");
  const italic = style.italic ? "italic " : "";
  const weight = style.bold ? "bold" : "500";
  const sizeInPt = style.fontSize || 10;
  const size = fontSizeMap[sizeInPt];
  ctx.font = `${italic}${weight} ${size}px arial`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = style.textColor || "#000";
  let x;
  let y = (top.top + bottom.bottom) / 2 - offsetY + 1;
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
    ctx.fillRect(x, y, width, 2.6 * thinLineWidth());
  }
}

function drawBorder(x1: number, y1: number, x2: number, y2: number, descr: BorderDescr) {
  const [style, color] = descr;
  ctx.strokeStyle = color;
  ctx.lineWidth = (style === "thin" ? 3 : 4.5) * thinLineWidth();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawBackgroundBox(
  style: Style,
  left: Col,
  top: Row,
  right: Col,
  bottom: Row,
  inset: number,
  border?: number,
  defaultBgCol?: string
) {
  const bgCol = style.fillColor || defaultBgCol;
  if (!border && !bgCol) {
    return;
  }
  const l = left.left - offsetX;
  const t = top.top - offsetY;
  const r = right.right - offsetX;
  const b = bottom.bottom - offsetY;

  if (bgCol) {
    ctx.fillStyle = bgCol;
    ctx.fillRect(l + inset, t + inset, r - l - 2 * inset, b - t - 3 * inset);
  }
  if (border) {
    const descr = borders[border];
    if (descr.left) {
      drawBorder(l, t, l, b, descr.left);
    }
    if (descr.top) {
      drawBorder(l, t, r, t, descr.top);
    }
    if (descr.right) {
      drawBorder(r, t, r, b, descr.right);
    }
    if (descr.bottom) {
      drawBorder(l, b, r, b, descr.bottom);
    }
  }
}

function hasContent(col: number, row: number): boolean {
  const xc = toXC(col, row);
  const cell = cells[xc];
  return (cell && cell.content) || ((xc in mergeCellMap) as any);
}

function drawCells() {
  const { right, left, top, bottom } = viewport;
  ctx.fillStyle = "#000";
  const styles = model.state.styles;

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

    if (cell.xc in model.state.mergeCellMap) {
      return;
    }
    ctx.save();
    // Compute clip zone
    if (align === "left") {
      let c = cell.col;
      while (c < right && !hasContent(c + 1, cell.row)) {
        c++;
      }
      const width = cols[c].right - col.left;
      ctx.rect(col.left - offsetX, row.top - offsetY, width, row.size);
    } else {
      let c = cell.col;
      while (c > left && !hasContent(c - 1, cell.row)) {
        c--;
      }
      const width = col.right - cols[c].left;
      ctx.rect(cols[c].left - offsetX, row.top - offsetY, width, row.size);
    }
    ctx.clip();

    ctx.globalCompositeOperation = "multiply";
    const lw = -0.3 * thinLineWidth();
    drawBackgroundBox(style, col, row, col, row, lw, cell.border);
    ctx.globalCompositeOperation = "source-over";
    drawTextBox(cell.value, style, cell.type, col, row, col, row);
    ctx.restore();
  }
}

function drawMerges() {
  const { merges, styles } = model.state;
  ctx.fillStyle = styles[0].fillColor || "white";
  for (let id in merges) {
    let merge = merges[id];
    if (overlap(merge, viewport)) {
      drawMerge(merge);
    }
  }

  function drawMerge(merge: Merge) {
    const refCell = cells[merge.topLeft];
    const style = styles[refCell ? refCell.style || 0 : 0];
    const border = refCell && refCell.border;
    const left = cols[merge.left];
    const right = cols[merge.right];
    const top = rows[merge.top];
    const bottom = rows[merge.bottom];
    const lw = 0.3 * thinLineWidth();
    drawBackgroundBox(style, left, top, right, bottom, lw, border, styles[0].fillColor);
    if (refCell) {
      drawTextBox(refCell.value, style, refCell.type, left, top, right, bottom);
    }
  }
}

function drawSelectionBackground() {
  const { selection } = model.state;
  for (const zone of selection.zones) {
    const { left, top, right, bottom } = zone;
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
}

function drawSelectionOutline() {
  for (const zone of model.state.selection.zones) {
    drawOutline(zone, "#3266ca", 0.5 * thinLineWidth());
  }
}

function drawOutline(zone: Zone, color: string = "#3266ca", lw = thinLineWidth()) {
  const { left, top, right, bottom } = zone;
  // const lw = thinLineWidth();
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
  for (let h of model.state.highlights) {
    drawOutline(h.zone, h.color!);
  }
}

function drawActiveZone() {
  let zone: Zone;
  if (model.state.activeXc in mergeCellMap) {
    zone = model.state.merges[mergeCellMap[model.state.activeXc]];
  } else {
    zone = {
      top: model.state.activeRow,
      bottom: model.state.activeRow,
      left: model.state.activeCol,
      right: model.state.activeCol
    };
  }
  drawOutline(zone, "#3266ca");
}

function drawClipBoard() {
  const { clipboard } = model.state;
  if (clipboard.status !== "visible") {
    return;
  }
  ctx.setLineDash([10, 5]);
  for (const zone of clipboard.zones) {
    drawOutline(zone, "#3266ca", 1.2 * thinLineWidth());
  }
}

export function drawGrid(context: CanvasRenderingContext2D, _model: GridModel, _width, _height) {
  (window as any).gridmodel = _model; // to debug. remove this someday
  viewport = _model.state.viewport;
  ctx = context;
  offsetX = _model.state.offsetX;
  offsetY = _model.state.offsetY;
  model = _model;
  width = _width;
  height = _height;
  rows = _model.state.rows;
  cols = _model.state.cols;
  cells = _model.state.cells;
  mergeCellMap = _model.state.mergeCellMap;
  borders = _model.state.borders;

  ctx.fillStyle = _model.state.styles[0].fillColor || "white";
  ctx.fillRect(0, 0, width, height);

  drawBackgroundGrid();
  drawMerges();
  drawCells();
  drawSelectionBackground();
  drawSelectionOutline();
  drawHeader();
  drawHighlights();
  drawClipBoard();

  drawActiveZone();
}
