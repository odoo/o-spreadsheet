import { BasePlugin, LAYERS, GridRenderingContext } from "../base_plugin";
import {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  HEADER_HEIGHT,
  HEADER_WIDTH
} from "../constants";
import { fontSizeMap } from "../fonts";
import { overlap, toXC } from "../helpers/index";
import { Box, Rect, Zone, Viewport } from "../types/index";
import { Mode } from "../model";

// -----------------------------------------------------------------------------
// Constants, types, helpers, ...
// -----------------------------------------------------------------------------

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

export class RendererPlugin extends BasePlugin {
  static layers = [LAYERS.Background, LAYERS.Headers];
  static getters = ["getColIndex", "getRowIndex", "getRect", "getAdjustedViewport"];
  static modes: Mode[] = ["normal", "readonly"];

  private boxes: Box[] = [];

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Return the index of a column given an offset x and a visible left col index.
   * It returns -1 if no column is found.
   */
  getColIndex(x: number, left: number): number {
    if (x < HEADER_WIDTH) {
      return -1;
    }
    const cols = this.workbook.cols;
    const adjustedX = x - HEADER_WIDTH + cols[left].left + 1;
    for (let i = left; i <= cols.length; i++) {
      if (adjustedX <= cols[i].right) {
        return i;
      }
    }
    return -1;
  }

  getRowIndex(y: number, top: number): number {
    if (y < HEADER_HEIGHT) {
      return -1;
    }
    const rows = this.workbook.rows;
    const adjustedY = y - HEADER_HEIGHT + rows[top].top + 1;
    for (let i = top; i <= rows.length; i++) {
      if (adjustedY <= rows[i].bottom) {
        return i;
      }
    }
    return -1;
  }

  getRect(zone: Zone, viewport: Viewport): Rect {
    const { left, top, right, bottom } = zone;
    let { offsetY, offsetX } = viewport;
    offsetX -= HEADER_WIDTH;
    offsetY -= HEADER_HEIGHT;
    const { cols, rows } = this.workbook;
    const x = Math.max(cols[left].left - offsetX, HEADER_WIDTH);
    const width = cols[right].right - offsetX - x;
    const y = Math.max(rows[top].top - offsetY, HEADER_HEIGHT);
    const height = rows[bottom].bottom - offsetY - y;
    return [x, y, width, height];
  }

  /**
   * A viewport is a "physical" window into the data represented on a grid.
   * This method returns the corresponding zone (so, pretty much the same data,
   * but expressed in term of rows/cols)
   */
  getAdjustedViewport(viewport: Viewport, adjustment: "offsets" | "zone" | "position"): Viewport {
    const { cols, rows } = this.workbook;
    viewport = Object.assign({}, viewport);
    if (adjustment === "offsets") {
      viewport.offsetX = cols[viewport.left].left;
      viewport.offsetY = rows[viewport.top].top;
      return viewport;
    }
    if (adjustment === "position") {
      const [col, row] = this.getters.getPosition();
      while (col >= viewport.right && col !== cols.length - 1) {
        viewport.offsetX = cols[viewport.left].right;
        viewport = this.getAdjustedViewport(viewport, "zone");
      }
      while (col < viewport.left) {
        viewport.offsetX = cols[viewport.left - 1].left;
        viewport = this.getAdjustedViewport(viewport, "zone");
      }
      while (row >= viewport.bottom && row !== rows.length - 1) {
        viewport.offsetY = rows[viewport.top].bottom;
        viewport = this.getAdjustedViewport(viewport, "zone");
      }
      while (row < viewport.top) {
        viewport.offsetY = rows[viewport.top - 1].top;
        viewport = this.getAdjustedViewport(viewport, "zone");
      }
      return viewport;
    }
    const { width, height, offsetX, offsetY } = viewport;
    const top = this.getRowIndex(offsetY + HEADER_HEIGHT, 0);
    const left = this.getColIndex(offsetX + HEADER_WIDTH, 0);
    const x = width + offsetX - HEADER_WIDTH;
    let right = cols.length - 1;
    for (let i = left; i < cols.length; i++) {
      if (x < cols[i].right) {
        right = i;
        break;
      }
    }
    let y = height + offsetY - HEADER_HEIGHT;
    let bottom = rows.length - 1;
    for (let i = top; i < rows.length; i++) {
      if (y < rows[i].bottom) {
        bottom = i;
        break;
      }
    }
    return { width, height, offsetX, offsetY, left, top, right, bottom };
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext, layer: LAYERS) {
    switch (layer) {
      case LAYERS.Background:
        this.boxes = this.getGridBoxes(renderingContext);
        this.drawBackground(renderingContext);
        this.drawCellBackground(renderingContext);
        this.drawBorders(renderingContext);
        this.drawTexts(renderingContext);
        break;
      case LAYERS.Headers:
        this.drawHeaders(renderingContext);
        break;
    }
  }

  private drawBackground(renderingContext: GridRenderingContext) {
    const { ctx, viewport, thinLineWidth } = renderingContext;
    let { width, height, offsetX, offsetY, top, left, bottom, right } = viewport;
    const { rows, cols } = this.workbook;

    // white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // background grid
    offsetX -= HEADER_WIDTH;
    offsetY -= HEADER_HEIGHT;

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

  private drawCellBackground(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;
    ctx.lineWidth = 0.3 * thinLineWidth;
    const inset = 0.1 * thinLineWidth;
    ctx.strokeStyle = "#111";
    for (let box of this.boxes) {
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

  private drawBorders(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;
    for (let box of this.boxes) {
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

  private drawTexts(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;
    ctx.textBaseline = "middle";
    let currentFont;
    for (let box of this.boxes) {
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

  private drawHeaders(renderingContext: GridRenderingContext) {
    const { ctx, viewport, thinLineWidth } = renderingContext;
    let { width, height, offsetX, offsetY, left, top, right, bottom } = viewport;
    offsetX -= HEADER_WIDTH;
    offsetY -= HEADER_HEIGHT;
    const selection = this.getters.getSelectedZones();
    const { cols, rows } = this.workbook;
    const activeCols = this.getters.getActiveCols();
    const activeRows = this.getters.getActiveRows();

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

  private hasContent(col: number, row: number): boolean {
    const { cells, mergeCellMap } = this.workbook;
    const xc = toXC(col, row);
    const cell = cells[xc];
    return (cell && cell.content) || ((xc in mergeCellMap) as any);
  }

  private getGridBoxes(renderingContext: GridRenderingContext): Box[] {
    const { viewport } = renderingContext;
    let { right, left, top, bottom, offsetX, offsetY } = viewport;
    offsetX -= HEADER_WIDTH;
    offsetY -= HEADER_HEIGHT;

    const result: Box[] = [];
    const { cols, rows, mergeCellMap, merges, cells } = this.workbook;
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
      if (overlap(merge, viewport)) {
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
}
