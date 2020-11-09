import { BasePlugin } from "../base_plugin";
import {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  BACKGROUND_HEADER_COLOR,
  BACKGROUND_HEADER_SELECTED_COLOR,
  BACKGROUND_HEADER_ACTIVE_COLOR,
  TEXT_HEADER_COLOR,
  HEADER_FONT_SIZE,
  HEADER_BORDER_COLOR,
  CELL_BORDER_COLOR,
} from "../constants";
import { fontSizeMap } from "../fonts";
import { overlap, toXC } from "../helpers/index";
import {
  Box,
  Rect,
  Zone,
  Viewport,
  Header,
  LAYERS,
  GridRenderingContext,
  Cell,
} from "../types/index";
import { Mode } from "../model";

// -----------------------------------------------------------------------------
// Constants, types, helpers, ...
// -----------------------------------------------------------------------------

function computeAlign(cell: Cell, isShowingFormulas: boolean): "right" | "center" | "left" {
  if (cell.type === "formula" && isShowingFormulas) {
    return "left";
  } else if (cell.error || cell.pending) {
    return "center";
  }
  switch (typeof cell.value) {
    case "object":
    case "number":
      return "right";
    case "boolean":
      return "center";
    default:
      return "left";
  }
}

function searchIndex(headers: Header[], offset: number): number {
  let left = 0;
  let right = headers.length - 1;
  while (left <= right) {
    const index = Math.floor((left + right) / 2);
    const header = headers[index];
    if (offset < header.start) {
      right = index - 1;
    } else if (offset > header.end) {
      left = index + 1;
    } else {
      return index;
    }
  }
  return -1;
}

export class RendererPlugin extends BasePlugin {
  static layers = [LAYERS.Background, LAYERS.Headers];
  static getters = [
    "getColIndex",
    "getRowIndex",
    "getRect",
    "snapViewportToCell",
    "adjustViewportPosition",
    "adjustViewportZone",
  ];
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
    const cols = this.getters.getActiveSheet().cols;
    const adjustedX = x - HEADER_WIDTH + cols[left].start + 1;
    return searchIndex(cols, adjustedX);
  }

  getRowIndex(y: number, top: number): number {
    if (y < HEADER_HEIGHT) {
      return -1;
    }
    const rows = this.getters.getActiveSheet().rows;
    const adjustedY = y - HEADER_HEIGHT + rows[top].start + 1;
    return searchIndex(rows, adjustedY);
  }

  getRect(zone: Zone, viewport: Viewport): Rect {
    const { left, top, right, bottom } = zone;
    let { offsetY, offsetX } = viewport;
    offsetX -= HEADER_WIDTH;
    offsetY -= HEADER_HEIGHT;
    const { cols, rows } = this.getters.getActiveSheet();
    const x = Math.max(cols[left].start - offsetX, HEADER_WIDTH);
    const width = cols[right].end - offsetX - x;
    const y = Math.max(rows[top].start - offsetY, HEADER_HEIGHT);
    const height = rows[bottom].end - offsetY - y;
    return [x, y, width, height];
  }

  /**
   * Snap a viewport boundaries to exactly match the start of a cell.
   * @param viewport
   */
  snapViewportToCell(viewport: Viewport): Viewport {
    const { cols, rows } = this.getters.getActiveSheet();
    const adjustedViewport = Object.assign({}, viewport);
    adjustedViewport.offsetX = cols[viewport.left].start;
    adjustedViewport.offsetY = rows[viewport.top].start;
    return adjustedViewport;
  }

  /**
   * Adjust the viewport until the active cell is completely visible inside it.
   * @param viewport the viewport that will be adjusted
   */
  adjustViewportPosition(viewport: Viewport): Viewport {
    const adjustedViewport = Object.assign({}, viewport);
    const { cols, rows } = this.getters.getActiveSheet();
    const [col, row] = this.getters.getPosition();
    while (col >= adjustedViewport.right && col !== cols.length - 1) {
      adjustedViewport.offsetX = cols[adjustedViewport.left].end;
      this.adjustViewportZoneX(adjustedViewport);
    }
    while (col < adjustedViewport.left) {
      adjustedViewport.offsetX = cols[adjustedViewport.left - 1].start;
      this.adjustViewportZoneX(adjustedViewport);
    }
    while (row >= adjustedViewport.bottom && row !== rows.length - 1) {
      adjustedViewport.offsetY = rows[adjustedViewport.top].end;
      this.adjustViewportZoneY(adjustedViewport);
    }
    while (row < adjustedViewport.top) {
      adjustedViewport.offsetY = rows[adjustedViewport.top - 1].start;
      this.adjustViewportZoneY(adjustedViewport);
    }
    return adjustedViewport;
  }

  adjustViewportZone(viewport: Viewport): Viewport {
    const adjustedViewport = Object.assign({}, viewport);
    this.adjustViewportZoneX(adjustedViewport);
    this.adjustViewportZoneY(adjustedViewport);
    return adjustedViewport;
  }

  private adjustViewportZoneX(viewport: Viewport) {
    const { cols } = this.getters.getActiveSheet();
    const { width, offsetX } = viewport;
    viewport.left = this.getColIndex(offsetX + HEADER_WIDTH, 0);
    const x = width + offsetX - HEADER_WIDTH;
    viewport.right = cols.length - 1;
    for (let i = viewport.left; i < cols.length; i++) {
      if (x < cols[i].end) {
        viewport.right = i;
        break;
      }
    }
  }

  private adjustViewportZoneY(viewport: Viewport) {
    const { rows } = this.getters.getActiveSheet();
    const { height, offsetY } = viewport;
    viewport.top = this.getRowIndex(offsetY + HEADER_HEIGHT, 0);

    let y = height + offsetY - HEADER_HEIGHT;
    viewport.bottom = rows.length - 1;
    for (let i = viewport.top; i < rows.length; i++) {
      if (y < rows[i].end) {
        viewport.bottom = i;
        break;
      }
    }
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
    const { cols, rows } = this.getters.getActiveSheet();
    // white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // background grid
    offsetX -= HEADER_WIDTH;
    offsetY -= HEADER_HEIGHT;

    ctx.lineWidth = 2 * thinLineWidth;
    ctx.strokeStyle = CELL_BORDER_COLOR;
    ctx.beginPath();

    // vertical lines
    const lineHeight = Math.min(height, rows[bottom].end - offsetY);
    for (let i = left; i <= right; i++) {
      const x = cols[i].end - offsetX;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, lineHeight);
    }

    // horizontal lines
    const lineWidth = Math.min(width, cols[right].end - offsetX);
    for (let i = top; i <= bottom; i++) {
      const y = rows[i].end - offsetY;
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
      if (style && style.fillColor && style.fillColor !== "#ffffff") {
        ctx.fillStyle = style.fillColor;
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.strokeRect(box.x + inset, box.y + inset, box.width - 2 * inset, box.height - 2 * inset);
      }
      if (box.error) {
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
    const { cols, rows } = this.getters.getActiveSheet();
    const activeCols = this.getters.getActiveCols();
    const activeRows = this.getters.getActiveRows();

    ctx.fillStyle = BACKGROUND_HEADER_COLOR;
    ctx.font = `400 ${HEADER_FONT_SIZE}px ${DEFAULT_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = thinLineWidth;
    ctx.strokeStyle = "#333";

    // background
    ctx.fillRect(0, 0, width, HEADER_HEIGHT);
    ctx.fillRect(0, 0, HEADER_WIDTH, height);
    // selection background
    ctx.fillStyle = BACKGROUND_HEADER_SELECTED_COLOR;
    for (let zone of selection) {
      const x1 = Math.max(HEADER_WIDTH, cols[zone.left].start - offsetX);
      const x2 = Math.max(HEADER_WIDTH, cols[zone.right].end - offsetX);
      const y1 = Math.max(HEADER_HEIGHT, rows[zone.top].start - offsetY);
      const y2 = Math.max(HEADER_HEIGHT, rows[zone.bottom].end - offsetY);
      ctx.fillStyle = activeCols.has(zone.left)
        ? BACKGROUND_HEADER_ACTIVE_COLOR
        : BACKGROUND_HEADER_SELECTED_COLOR;
      ctx.fillRect(x1, 0, x2 - x1, HEADER_HEIGHT);
      ctx.fillStyle = activeRows.has(zone.top)
        ? BACKGROUND_HEADER_ACTIVE_COLOR
        : BACKGROUND_HEADER_SELECTED_COLOR;
      ctx.fillRect(0, y1, HEADER_WIDTH, y2 - y1);
    }

    // 2 main lines
    ctx.beginPath();
    ctx.moveTo(HEADER_WIDTH, 0);
    ctx.lineTo(HEADER_WIDTH, height);
    ctx.moveTo(0, HEADER_HEIGHT);
    ctx.lineTo(width, HEADER_HEIGHT);
    ctx.strokeStyle = HEADER_BORDER_COLOR;
    ctx.stroke();

    ctx.beginPath();
    // column text + separator
    for (let i = left; i <= right; i++) {
      const col = cols[i];
      ctx.fillStyle = activeCols.has(i) ? "#fff" : TEXT_HEADER_COLOR;
      ctx.fillText(col.name, (col.start + col.end) / 2 - offsetX, HEADER_HEIGHT / 2);
      ctx.moveTo(col.end - offsetX, 0);
      ctx.lineTo(col.end - offsetX, HEADER_HEIGHT);
    }
    // row text + separator
    for (let i = top; i <= bottom; i++) {
      const row = rows[i];
      ctx.fillStyle = activeRows.has(i) ? "#fff" : TEXT_HEADER_COLOR;

      ctx.fillText(row.name, HEADER_WIDTH / 2, (row.start + row.end) / 2 - offsetY);
      ctx.moveTo(0, row.end - offsetY);
      ctx.lineTo(HEADER_WIDTH, row.end - offsetY);
    }

    ctx.stroke();
  }

  private hasContent(col: number, row: number): boolean {
    const sheetId = this.getters.getActiveSheetId();
    const cell = this.getters.getCell(sheetId, col, row);
    const xc = toXC(col, row);
    return (cell && cell.content) || (this.getters.isInMerge(xc) as any);
  }

  private getGridBoxes(renderingContext: GridRenderingContext): Box[] {
    const { viewport } = renderingContext;
    let { right, left, top, bottom, offsetX, offsetY } = viewport;
    offsetX -= HEADER_WIDTH;
    offsetY -= HEADER_HEIGHT;

    const result: Box[] = [];
    const { cols, rows } = this.getters.getActiveSheet();
    // process all visible cells
    for (let rowNumber = top; rowNumber <= bottom; rowNumber++) {
      let row = rows[rowNumber];
      for (let colNumber = left; colNumber <= right; colNumber++) {
        let cellId = row.cells[colNumber];
        if (cellId) {
          const cell = this.getters.getCellById(cellId)!;
          let xc = toXC(colNumber, rowNumber);
          if (!this.getters.isInMerge(xc)) {
            let col = cols[colNumber];
            const text = this.getters.getCellText(cell);
            const textWidth = this.getters.getCellWidth(cell);
            let style = this.getters.getCellStyle(cell);
            const conditionalStyle = this.getters.getConditionalStyle(xc);
            if (conditionalStyle) {
              style = Object.assign({}, style, conditionalStyle);
            }
            const align = text
              ? (style && style.align) || computeAlign(cell, this.getters.shouldShowFormulas())
              : undefined;
            let clipRect: Rect | null = null;
            if (text && textWidth > cols[colNumber].size) {
              if (align === "left") {
                let c = colNumber;
                while (c < right && !this.hasContent(c + 1, rowNumber)) {
                  c++;
                }
                const width = cols[c].end - col.start;
                if (width < textWidth) {
                  clipRect = [col.start - offsetX, row.start - offsetY, width, row.size];
                }
              } else {
                let c = colNumber;
                while (c > left && !this.hasContent(c - 1, rowNumber)) {
                  c--;
                }
                const width = col.end - cols[c].start;
                if (width < textWidth) {
                  clipRect = [cols[c].start - offsetX, row.start - offsetY, width, row.size];
                }
              }
            }

            result.push({
              x: col.start - offsetX,
              y: row.start - offsetY,
              width: col.size,
              height: row.size,
              text,
              textWidth,
              border: this.getters.getCellBorder(cell),
              style,
              align,
              clipRect,
              error: cell.error,
            });
          }
        }
      }
    }

    const activeSheetId = this.getters.getActiveSheetId();
    // process all visible merges
    for (let merge of this.getters.getMerges(activeSheetId)) {
      if (overlap(merge, viewport)) {
        const refCell = this.getters.getCell(activeSheetId, merge.left, merge.top);
        const bottomRight = this.getters.getCell(activeSheetId, merge.right, merge.bottom);
        const width = cols[merge.right].end - cols[merge.left].start;
        let text, textWidth, style, align, border;
        if (refCell || bottomRight) {
          text = refCell ? this.getters.getCellText(refCell) : "";
          textWidth = refCell ? this.getters.getCellWidth(refCell) : null;
          style = refCell ? this.getters.getCellStyle(refCell) : null;
          align = text
            ? (style && style.align) || computeAlign(refCell!, this.getters.shouldShowFormulas())
            : null;
          const borderTopLeft = refCell ? this.getters.getCellBorder(refCell) : null;
          const borderBottomRight = bottomRight ? this.getters.getCellBorder(bottomRight) : null;
          border = {
            bottom: borderBottomRight ? borderBottomRight.bottom : null,
            left: borderTopLeft ? borderTopLeft.left : null,
            right: borderBottomRight ? borderBottomRight.right : null,
            top: borderTopLeft ? borderTopLeft.top : null,
          };
        }
        style = style || {};
        // Small trick: the code that draw the background color skips the color
        // #ffffff.  But for merges, we actually need to draw the background,
        // otherwise the grid is visible. So, we change the #ffffff color to the
        // color #fff, which is actually the same.
        if (!style.fillColor || style.fillColor === "#ffffff") {
          style = Object.create(style);
          style.fillColor = "#fff";
        }

        const x = cols[merge.left].start - offsetX;
        const y = rows[merge.top].start - offsetY;
        const height = rows[merge.bottom].end - rows[merge.top].start;
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
          error: refCell ? refCell.error : undefined,
        });
      }
    }
    return result;
  }
}
