import { BasePlugin, LAYERS } from "../base_plugin";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  HEADER_HEIGHT,
  HEADER_WIDTH
} from "../constants";
import { fontSizeMap } from "../fonts";
import { overlap, toXC } from "../helpers/index";
import { Box, Grid, GridCommand, Rect, UI, Zone, Viewport } from "../types/index";

let dpr = window.devicePixelRatio || 1;
let thinLineWidth = 0.4 * dpr;

function computeAlign(type: string): "right" | "center" | "left" {
  switch (type) {
    case "number":
      return "right";
    case "boolean":
      return "center";
    default:
      return "left";
  }
}

export class LayoutPlugin extends BasePlugin {
  static layers = [LAYERS.Grid];
  static getters = ["getViewport", "getUI", "getCol", "getRow"];

  // actual size of the visible grid, in pixel
  private clientWidth: number = DEFAULT_CELL_WIDTH + HEADER_WIDTH;
  private clientHeight: number = DEFAULT_CELL_HEIGHT + HEADER_HEIGHT;
  private viewport: Zone = { top: 0, left: 0, bottom: 0, right: 0 };

  // offset between the visible zone and the full zone (take into account
  // headers)
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scrollTop: number = 0;
  private scrollLeft: number = 0;

  ui: UI | null = null;

  handle(cmd: GridCommand) {
    this.ui = null;
    switch (cmd.type) {
      case "MOVE_POSITION":
        this.updateScrollPosition();
        break;
    }
  }

  getUI(force?: boolean): UI {
    if (!this.ui || force) {
      this.ui = this.computeDerivedState();
    }
    return this.ui;
  }

  /**
   * Return the index of a column given an offset x.
   * It returns -1 if no column is found.
   */
  getCol(x: number): number {
    if (x <= HEADER_WIDTH) {
      return -1;
    }
    const cols = this.workbook.cols;
    const { left, right } = this.viewport;
    for (let i = left; i <= right; i++) {
      let c = cols[i];
      if (c.left - this.offsetX <= x && x <= c.right - this.offsetX) {
        return i;
      }
    }
    return -1;
  }

  getRow(y: number): number {
    if (y <= HEADER_HEIGHT) {
      return -1;
    }
    const rows = this.workbook.rows;
    const { top, bottom } = this.viewport;
    for (let i = top; i <= bottom; i++) {
      let r = rows[i];
      if (r.top - this.offsetY <= y && y <= r.bottom - this.offsetY) {
        return i;
      }
    }
    return -1;
  }

  /**
   *  keep current cell in the viewport, if possible
   */
  updateScrollPosition() {
    const { cols, rows } = this.workbook;
    const viewport = this.viewport;
    const [col, row] = this.getters.getPosition();

    while (col >= viewport.right && col !== cols.length - 1) {
      this.updateScroll(this.scrollTop, cols[viewport.left].right);
    }
    while (col < viewport.left) {
      this.updateScroll(this.scrollTop, cols[viewport.left - 1].left);
    }
    while (row >= viewport.bottom && row !== rows.length - 1) {
      this.updateScroll(rows[viewport.top].bottom, this.scrollLeft);
    }
    while (row < viewport.top) {
      this.updateScroll(rows[viewport.top - 1].top, this.scrollLeft);
    }
  }

  updateScroll(scrollTop: number, scrollLeft: number): boolean {
    scrollTop = Math.round(scrollTop);
    scrollLeft = Math.round(scrollLeft);
    if (this.scrollTop === scrollTop && this.scrollLeft === scrollLeft) {
      return false;
    }
    this.scrollTop = scrollTop;
    this.scrollLeft = scrollLeft;
    const { offsetX, offsetY } = this;
    this.updateVisibleZone();
    return offsetX !== this.offsetX || offsetY !== this.offsetY;
  }

  /**
   * Here:
   * - width is the clientWidth, the actual width of the visible zone
   * - height is the clientHeight, the actual height of the visible zone
   */
  updateVisibleZone(width?: number, height?: number) {
    const { rows, cols } = this.workbook;
    const viewport = this.viewport;
    this.clientWidth = width || this.clientWidth;
    this.clientHeight = height || this.clientHeight;

    viewport.bottom = rows.length - 1;
    let effectiveTop = this.scrollTop;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].top <= effectiveTop) {
        if (rows[i].bottom > effectiveTop) {
          effectiveTop = rows[i].top;
        }
        viewport.top = i;
      }
      if (effectiveTop + this.clientHeight < rows[i].bottom + HEADER_HEIGHT) {
        viewport.bottom = i;
        break;
      }
    }
    viewport.right = cols.length - 1;
    let effectiveLeft = this.scrollLeft;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].left <= effectiveLeft) {
        if (cols[i].right > effectiveLeft) {
          effectiveLeft = cols[i].left;
        }
        viewport.left = i;
      }
      if (effectiveLeft + this.clientWidth < cols[i].right + HEADER_WIDTH) {
        viewport.right = i;
        break;
      }
    }
    this.offsetX = cols[viewport.left].left - HEADER_WIDTH;
    this.offsetY = rows[viewport.top].top - HEADER_HEIGHT;
  }

  getViewport(width: number, height: number, offsetX: number, offsetY: number): Grid {
    return {
      width,
      height,
      offsetX,
      offsetY,
      boxes: this.getGridBoxes(),
      activeCols: this.getters.getActiveCols(),
      activeRows: this.getters.getActiveRows(),
      selection: this.getters.getSelectedZones()
    };
  }

  private hasContent(col: number, row: number): boolean {
    const { cells, mergeCellMap } = this.workbook;
    const xc = toXC(col, row);
    const cell = cells[xc];
    return (cell && cell.content) || ((xc in mergeCellMap) as any);
  }

  private getGridBoxes(): Box[] {
    const result: Box[] = [];
    const { cols, rows, mergeCellMap, merges, cells } = this.workbook;
    const { offsetX, offsetY } = this;
    const { right, left, top, bottom } = this.viewport;
    // process all visible cells
    for (let rowNumber = top; rowNumber <= bottom; rowNumber++) {
      let row = rows[rowNumber];
      for (let colNumber = left; colNumber <= right; colNumber++) {
        let cell = row.cells[colNumber];
        if (cell && !(cell.xc in mergeCellMap)) {
          let col = cols[colNumber];
          const text = this.getters.getCellText(cell);
          const textWidth = this.getters.getCellWidth(cell);
          let style = this.getters.getCellStyle(cell);
          const conditionalStyle = this.getters.getConditionalStyle(cell.xc);
          if (conditionalStyle) {
            style = Object.assign({}, style, conditionalStyle);
          }
          const align = text ? (style && style.align) || computeAlign(typeof cell.value) : null;
          let clipRect: Rect | null = null;
          if (text && textWidth > cols[cell.col].size) {
            if (align === "left") {
              let c = cell.col;
              while (c < right && !this.hasContent(c + 1, cell.row)) {
                c++;
              }
              const width = cols[c].right - col.left;
              if (width < textWidth) {
                clipRect = [col.left - offsetX, row.top - offsetY, width, row.size];
              }
            } else {
              let c = cell.col;
              while (c > left && !this.hasContent(c - 1, cell.row)) {
                c--;
              }
              const width = col.right - cols[c].left;
              if (width < textWidth) {
                clipRect = [cols[c].left - offsetX, row.top - offsetY, width, row.size];
              }
            }
          }

          result.push({
            x: col.left - offsetX,
            y: row.top - offsetY,
            width: col.size,
            height: row.size,
            text,
            textWidth,
            border: this.getters.getCellBorder(cell),
            style,
            align,
            clipRect,
            isError: cell.error
          });
        }
      }
    }

    // process all visible merges
    for (let id in merges) {
      let merge = merges[id];
      if (overlap(merge, this.viewport)) {
        const refCell = cells[merge.topLeft];
        const width = cols[merge.right].right - cols[merge.left].left;
        let text, textWidth, style, align, border;
        if (refCell) {
          text = refCell ? this.getters.getCellText(refCell) : "";
          textWidth = this.getters.getCellWidth(refCell);
          style = this.getters.getCellStyle(refCell);
          align = text ? (style && style.align) || computeAlign(typeof refCell.value) : null;
          border = this.getters.getCellBorder(refCell);
        }
        style = style || {};
        if (!style.fillColor) {
          style = Object.create(style);
          style.fillColor = "#fff";
        }

        const x = cols[merge.left].left - offsetX;
        const y = rows[merge.top].top - offsetY;
        const height = rows[merge.bottom].bottom - rows[merge.top].top;
        result.push({
          x: x,
          y: y,
          width,
          height,
          text,
          textWidth,
          border,
          style,
          align,
          clipRect: [x, y, width, height],
          isError: refCell ? refCell.error : false
        });
      }
    }
    return result;
  }

  computeDerivedState(): UI {
    const { cols, rows } = this.workbook;
    const viewport = this.viewport;
    const [col, row] = this.getters.getPosition();
    const [width, height] = this.getters.getGridSize();
    return {
      rows: this.workbook.rows,
      cols: this.workbook.cols,
      merges: this.workbook.merges,
      mergeCellMap: this.workbook.mergeCellMap,
      width: width,
      height: height,
      clientWidth: this.clientWidth,
      clientHeight: this.clientHeight,
      offsetX: cols[viewport.left].left - HEADER_WIDTH,
      offsetY: rows[viewport.top].top - HEADER_HEIGHT,
      scrollTop: this.scrollTop,
      scrollLeft: this.scrollLeft,
      clipboard: this.getters.getClipboardZones(),
      viewport: viewport,
      activeCol: col,
      activeRow: row,
      activeXc: toXC(col, row),
      highlights: this.getters.getHighlights(),
      editionMode: this.getters.getEditionMode(),
      selectedCell: this.getters.getActiveCell(),
      aggregate: this.getters.getAggregate(),
      canUndo: this.getters.canUndo(),
      canRedo: this.getters.canRedo(),
      sheets: this.workbook.sheets.map(s => s.name),
      activeSheet: this.workbook.activeSheet.name
    };
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------
  drawGrid(canvas: HTMLCanvasElement, viewport: Viewport, layer: number) {
    const { width, height, offsetX, offsetY } = viewport;
    this.updateVisibleZone(viewport.width, viewport.height);
    // whenever the dimensions are changed, we need to reset the width/height
    // of the canvas manually, and reset its scaling.
    const dpr = window.devicePixelRatio || 1;
    const context = canvas.getContext("2d", { alpha: false })!;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    context.translate(-0.5, -0.5);
    context.scale(dpr, dpr);

    const grid = this.getViewport(width, height, offsetX, offsetY);
    drawGrid(context, this.getUI(), grid);
  }
}

export function drawGrid(ctx: CanvasRenderingContext2D, state: UI, viewport: Grid) {
  // 1. initial setup, clear canvas, collect info
  dpr = window.devicePixelRatio || 1;
  thinLineWidth = 0.4 * dpr;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  // 2. draw grid content
  drawBackgroundGrid(ctx, state, viewport);
  drawBackgrounds(ctx, viewport.boxes);
  drawBorders(ctx, viewport.boxes);
  drawTexts(ctx, viewport.boxes);

  // 3. draw additional chrome: selection, clipboard, headers, ...
  drawHighlights(ctx, state);
  drawClipBoard(ctx, state);
  drawSelection(ctx, state, viewport);
  drawHeader(ctx, state, viewport);
  drawActiveZone(ctx, state);
}

function drawBackgroundGrid(ctx: CanvasRenderingContext2D, state: UI, viewport: Grid) {
  const { viewport: _viewport, rows, cols, offsetX, offsetY } = state;
  const { width, height } = viewport;
  const { top, left, bottom, right } = _viewport;

  ctx.lineWidth = 0.4 * thinLineWidth;
  ctx.strokeStyle = "#222";
  ctx.beginPath();

  // vertical lines
  const lineHeight = Math.min(height, rows[bottom].bottom - offsetY);
  for (let i = left; i <= right; i++) {
    const x = cols[i].right - offsetX;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, lineHeight);
  }

  // horizontal lines
  const lineWidth = Math.min(width, cols[right].right - offsetX);
  for (let i = top; i <= bottom; i++) {
    const y = rows[i].bottom - offsetY;
    ctx.moveTo(0, y);
    ctx.lineTo(lineWidth, y);
  }
  ctx.stroke();
}

function drawBackgrounds(ctx: CanvasRenderingContext2D, boxes: Box[]) {
  ctx.lineWidth = 0.3 * thinLineWidth;
  const inset = 0.1 * thinLineWidth;
  ctx.strokeStyle = "#111";
  for (let box of boxes) {
    // fill color
    let style = box.style;
    if (style && style.fillColor) {
      ctx.fillStyle = style.fillColor;
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x + inset, box.y + inset, box.width - 2 * inset, box.height - 2 * inset);
    }
    if (box.isError) {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.moveTo(box.x + box.width - 5, box.y);
      ctx.lineTo(box.x + box.width, box.y);
      ctx.lineTo(box.x + box.width, box.y + 5);
      ctx.fill();
    }
  }
}

function drawBorders(ctx: CanvasRenderingContext2D, boxes: Box[]) {
  for (let box of boxes) {
    // fill color
    let border = box.border;
    if (border) {
      const { x, y, width, height } = box;
      if (border.left) {
        drawBorder(border.left, x, y, x, y + height);
      }
      if (border.top) {
        drawBorder(border.top, x, y, x + width, y);
      }
      if (border.right) {
        drawBorder(border.right, x + width, y, x + width, y + height);
      }
      if (border.bottom) {
        drawBorder(border.bottom, x, y + height, x + width, y + height);
      }
    }
  }
  function drawBorder([style, color], x1, y1, x2, y2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = (style === "thin" ? 2 : 3) * thinLineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawTexts(ctx: CanvasRenderingContext2D, boxes: Box[]) {
  ctx.textBaseline = "middle";
  let currentFont;
  for (let box of boxes) {
    if (box.text) {
      const style = box.style || {};
      const align = box.align!;
      const italic = style.italic ? "italic " : "";
      const weight = style.bold ? "bold" : DEFAULT_FONT_WEIGHT;
      const sizeInPt = style.fontSize || DEFAULT_FONT_SIZE;
      const size = fontSizeMap[sizeInPt];
      const font = `${italic}${weight} ${size}px ${DEFAULT_FONT}`;
      if (font !== currentFont) {
        currentFont = font;
        ctx.font = font;
      }
      ctx.fillStyle = style.textColor || "#000";
      let x: number;
      let y = box.y + box.height / 2 + 1;
      if (align === "left") {
        x = box.x + 3;
      } else if (align === "right") {
        x = box.x + box.width - 3;
      } else {
        x = box.x + box.width / 2;
      }
      ctx.textAlign = align;
      if (box.clipRect) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(...box.clipRect);
        ctx.clip();
      }
      ctx.fillText(box.text, Math.round(x), Math.round(y));
      if (style.strikethrough) {
        if (align === "right") {
          x = x - box.textWidth;
        } else if (align === "center") {
          x = x - box.textWidth / 2;
        }
        ctx.fillRect(x, y, box.textWidth, 2.6 * thinLineWidth);
      }
      if (box.clipRect) {
        ctx.restore();
      }
    }
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, state: UI, viewport: Grid) {
  const { selection: zones } = viewport;
  ctx.fillStyle = "#f3f7fe";
  const onlyOneCell =
    zones.length === 1 && zones[0].left === zones[0].right && zones[0].top === zones[0].bottom;
  ctx.fillStyle = onlyOneCell ? "#f3f7fe" : "#e9f0ff";
  ctx.strokeStyle = "#3266ca";
  ctx.lineWidth = 1.5 * thinLineWidth;
  ctx.globalCompositeOperation = "multiply";
  for (const zone of zones) {
    const [x, y, width, height] = getRect(zone, state);
    if (width > 0 && height > 0) {
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawActiveZone(ctx: CanvasRenderingContext2D, state: UI) {
  const { mergeCellMap } = state;
  ctx.strokeStyle = "#3266ca";
  ctx.lineWidth = 3 * thinLineWidth;
  let zone: Zone;
  if (state.activeXc in mergeCellMap) {
    zone = state.merges[mergeCellMap[state.activeXc]];
  } else {
    zone = {
      top: state.activeRow,
      bottom: state.activeRow,
      left: state.activeCol,
      right: state.activeCol
    };
  }
  const [x, y, width, height] = getRect(zone, state);
  if (width > 0 && height > 0) {
    ctx.strokeRect(x, y, width, height);
  }
}

function getRect(zone: Zone, state: UI): Rect {
  const { left, top, right, bottom } = zone;
  const { cols, rows, offsetY, offsetX } = state;
  const x = Math.max(cols[left].left - offsetX, HEADER_WIDTH);
  const width = cols[right].right - offsetX - x;
  const y = Math.max(rows[top].top - offsetY, HEADER_HEIGHT);
  const height = rows[bottom].bottom - offsetY - y;
  return [x, y, width, height];
}

function drawHighlights(ctx: CanvasRenderingContext2D, state: UI) {
  ctx.lineWidth = 3 * thinLineWidth;
  for (let h of state.highlights) {
    const [x, y, width, height] = getRect(h.zone, state);
    if (width > 0 && height > 0) {
      ctx.strokeStyle = h.color!;
      ctx.strokeRect(x, y, width, height);
    }
  }
}

function drawClipBoard(ctx: CanvasRenderingContext2D, state: UI) {
  const { clipboard } = state;
  if (!clipboard.length) {
    return;
  }
  ctx.save();
  ctx.setLineDash([8, 5]);
  ctx.strokeStyle = "#3266ca";
  ctx.lineWidth = 3.3 * thinLineWidth;
  for (const zone of clipboard) {
    const [x, y, width, height] = getRect(zone, state);
    if (width > 0 && height > 0) {
      ctx.strokeRect(x, y, width, height);
    }
  }
  ctx.restore();
}

function drawHeader(ctx: CanvasRenderingContext2D, state: UI, viewportState: Grid) {
  const { activeCols, activeRows, selection } = viewportState;
  const { viewport, width, height, cols, rows, offsetX, offsetY } = state;
  const { top, left, bottom, right } = viewport;

  ctx.fillStyle = "#f4f5f8";
  ctx.font = "400 12px Source Sans Pro";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = thinLineWidth;
  ctx.strokeStyle = "#333";

  // background
  ctx.fillRect(0, 0, width, HEADER_HEIGHT);
  ctx.fillRect(0, 0, HEADER_WIDTH, height);
  // selection background
  ctx.fillStyle = "#dddddd";
  for (let zone of selection) {
    const x1 = Math.max(HEADER_WIDTH, cols[zone.left].left - offsetX);
    const x2 = Math.max(HEADER_WIDTH, cols[zone.right].right - offsetX);
    const y1 = Math.max(HEADER_HEIGHT, rows[zone.top].top - offsetY);
    const y2 = Math.max(HEADER_HEIGHT, rows[zone.bottom].bottom - offsetY);
    ctx.fillStyle = activeCols.has(zone.left) ? "#595959" : "#dddddd";
    ctx.fillRect(x1, 0, x2 - x1, HEADER_HEIGHT);
    ctx.fillStyle = activeRows.has(zone.top) ? "#595959" : "#dddddd";
    ctx.fillRect(0, y1, HEADER_WIDTH, y2 - y1);
  }

  // 2 main lines
  ctx.beginPath();
  ctx.moveTo(HEADER_WIDTH, 0);
  ctx.lineTo(HEADER_WIDTH, height);
  ctx.moveTo(0, HEADER_HEIGHT);
  ctx.lineTo(width, HEADER_HEIGHT);
  ctx.stroke();

  ctx.beginPath();
  // column text + separator
  for (let i = left; i <= right; i++) {
    const col = cols[i];
    ctx.fillStyle = activeCols.has(i) ? "#fff" : "#111";
    ctx.fillText(col.name, (col.left + col.right) / 2 - offsetX, HEADER_HEIGHT / 2);
    ctx.moveTo(col.right - offsetX, 0);
    ctx.lineTo(col.right - offsetX, HEADER_HEIGHT);
  }
  // row text + separator
  for (let i = top; i <= bottom; i++) {
    const row = rows[i];
    ctx.fillStyle = activeRows.has(i) ? "#fff" : "#111";

    ctx.fillText(row.name, HEADER_WIDTH / 2, (row.top + row.bottom) / 2 - offsetY);
    ctx.moveTo(0, row.bottom - offsetY);
    ctx.lineTo(HEADER_WIDTH, row.bottom - offsetY);
  }

  ctx.stroke();
}
