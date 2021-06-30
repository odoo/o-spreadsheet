import { ICONS } from "../../components/icons";
import {
  BACKGROUND_HEADER_ACTIVE_COLOR,
  BACKGROUND_HEADER_COLOR,
  BACKGROUND_HEADER_SELECTED_COLOR,
  CELL_BORDER_COLOR,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  HEADER_BORDER_COLOR,
  HEADER_FONT_SIZE,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MIN_CELL_TEXT_MARGIN,
  MIN_CF_ICON_MARGIN,
  TEXT_HEADER_COLOR,
} from "../../constants";
import { fontSizeMap } from "../../fonts";
import { isEmpty, isFormula } from "../../helpers/cells/index";
import { overlap, scrollDelay } from "../../helpers/index";
import { Mode } from "../../model";
import {
  Box,
  Cell,
  CellValueType,
  EdgeScrollInfo,
  GridRenderingContext,
  Header,
  LAYERS,
  Rect,
  ScrollDirection,
  Sheet,
  Viewport,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

// -----------------------------------------------------------------------------
// Constants, types, helpers, ...
// -----------------------------------------------------------------------------

function computeAlign(cell: Cell, isShowingFormulas: boolean): "right" | "center" | "left" {
  if (isFormula(cell) && isShowingFormulas) {
    return "left";
  }
  return cell.defaultAlign;
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
    } else if (header.isHidden) {
      left += 1;
    } else {
      return index;
    }
  }
  return -1;
}

export class RendererPlugin extends UIPlugin {
  static layers = [LAYERS.Background, LAYERS.Headers];
  static getters = [
    "getColIndex",
    "getRowIndex",
    "getRect",
    "getEdgeScrollCol",
    "getEdgeScrollRow",
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
  getColIndex(x: number, left: number, sheet?: Sheet): number {
    if (x < HEADER_WIDTH) {
      return -1;
    }
    const cols = (sheet || this.getters.getActiveSheet()).cols;
    const adjustedX = x - HEADER_WIDTH + cols[left].start + 1;
    return searchIndex(cols, adjustedX);
  }

  getRowIndex(y: number, top: number, sheet?: Sheet): number {
    if (y < HEADER_HEIGHT) {
      return -1;
    }
    const rows = (sheet || this.getters.getActiveSheet()).rows;
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

  // nouvelle implémentation

  getEdgeScrollCol(x: number): EdgeScrollInfo {
    let canEdgeScroll = false;
    let direction: ScrollDirection = 0;
    let delay = 0;
    const { width } = this.getters.getViewportDimension();
    const { width: gridWidth } = this.getters.getGridDimension(this.getters.getActiveSheet());
    const { left, offsetX } = this.getters.getActiveSnappedViewport();
    if (x < HEADER_WIDTH && left > 0) {
      canEdgeScroll = true;
      direction = -1;
      delay = scrollDelay(HEADER_WIDTH - x);
    } else if (x > width && offsetX < gridWidth - width) {
      canEdgeScroll = true;
      direction = +1;
      delay = scrollDelay(x - width);
    }

    return { canEdgeScroll, direction, delay };
  }

  getEdgeScrollRow(y: number): EdgeScrollInfo {
    let canEdgeScroll = false;
    let direction: ScrollDirection = 0;
    let delay = 0;
    const { height } = this.getters.getViewportDimension();
    const { height: gridHeight } = this.getters.getGridDimension(this.getters.getActiveSheet());
    const { top, offsetY } = this.getters.getActiveSnappedViewport();
    if (y < HEADER_HEIGHT && top > 0) {
      canEdgeScroll = true;
      direction = -1;
      delay = scrollDelay(HEADER_HEIGHT - y);
    } else if (y > height && offsetY < gridHeight - height) {
      canEdgeScroll = true;
      direction = +1;
      delay = scrollDelay(y - height);
    }
    return { canEdgeScroll, direction, delay };
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
        this.drawIcon(renderingContext);
        break;
      case LAYERS.Headers:
        this.drawHeaders(renderingContext);
        break;
    }
  }

  private drawBackground(renderingContext: GridRenderingContext) {
    const { ctx, viewport, thinLineWidth } = renderingContext;
    let { offsetX, offsetY, top, left, bottom, right } = viewport;
    const { width, height } = this.getters.getViewportDimension();
    const { cols, rows, id: sheetId } = this.getters.getActiveSheet();
    // white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    // background grid
    offsetX -= HEADER_WIDTH;
    offsetY -= HEADER_HEIGHT;

    if (!this.getters.getGridLinesVisibility(sheetId)) {
      return;
    }
    ctx.lineWidth = 2 * thinLineWidth;
    ctx.strokeStyle = CELL_BORDER_COLOR;
    ctx.beginPath();

    // vertical lines
    const lineHeight = Math.min(height, rows[bottom].end - offsetY);
    for (let i = left; i <= right; i++) {
      if (cols[i].isHidden) {
        continue;
      }
      const x = cols[i].end - offsetX;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, lineHeight);
    }

    // horizontal lines
    const lineWidth = Math.min(width, cols[right].end - offsetX);
    for (let i = top; i <= bottom; i++) {
      if (rows[i].isHidden) {
        continue;
      }
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
    const areGridLinesVisible = this.getters.getGridLinesVisibility(
      this.getters.getActiveSheetId()
    );
    for (let box of this.boxes) {
      // fill color
      let style = box.style;
      if (style && style.fillColor && style.fillColor !== "#ffffff") {
        ctx.fillStyle = style.fillColor;
        ctx.fillRect(box.x, box.y, box.width, box.height);
        if (areGridLinesVisible) {
          ctx.strokeRect(
            box.x + inset,
            box.y + inset,
            box.width - 2 * inset,
            box.height - 2 * inset
          );
        }
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
          x = box.x + (box.image ? box.image.size + 2 * MIN_CF_ICON_MARGIN : MIN_CELL_TEXT_MARGIN);
        } else if (align === "right") {
          x = box.x + box.width - MIN_CELL_TEXT_MARGIN;
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

  private async drawIcon(renderingContext: GridRenderingContext) {
    const { ctx } = renderingContext;
    for (let box of this.boxes) {
      if (box.image) {
        let x = box.x;
        let y = box.y;
        const icon: HTMLImageElement = box.image.image;
        const size = box.image.size;
        const margin = (box.height - size) / 2;
        if (box.image.clipIcon) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(...box.image.clipIcon);
          ctx.clip();
        }
        ctx.drawImage(icon, x + MIN_CF_ICON_MARGIN, y + margin, size, size);
        if (box.image.clipIcon) {
          ctx.restore();
        }
      }
    }
  }

  private drawHeaders(renderingContext: GridRenderingContext) {
    const { ctx, viewport, thinLineWidth } = renderingContext;
    let { offsetX, offsetY, left, top, right, bottom } = viewport;
    const { width, height } = this.getters.getViewportDimension();
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
      if (col.isHidden) {
        continue;
      }
      ctx.fillStyle = activeCols.has(i) ? "#fff" : TEXT_HEADER_COLOR;
      ctx.fillText(col.name, (col.start + col.end) / 2 - offsetX, HEADER_HEIGHT / 2);
      ctx.moveTo(col.end - offsetX, 0);
      ctx.lineTo(col.end - offsetX, HEADER_HEIGHT);
    }
    // row text + separator
    for (let i = top; i <= bottom; i++) {
      const row = rows[i];
      if (row.isHidden) {
        continue;
      }
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
    return !isEmpty(cell) || this.getters.isInMerge(sheetId, col, row);
  }

  private getGridBoxes(renderingContext: GridRenderingContext): Box[] {
    const { viewport } = renderingContext;
    let { right, left, top, bottom, offsetX, offsetY } = viewport;
    offsetX -= HEADER_WIDTH;
    offsetY -= HEADER_HEIGHT;

    const showFormula: boolean = this.getters.shouldShowFormulas();
    const result: Box[] = [];
    const { cols, rows, id: sheetId } = this.getters.getActiveSheet();
    // process all visible cells
    for (let rowNumber = top; rowNumber <= bottom; rowNumber++) {
      const row = rows[rowNumber];
      if (row.isHidden) {
        continue;
      }
      for (let colNumber = left; colNumber <= right; colNumber++) {
        const col = cols[colNumber];
        if (col.isHidden) {
          continue;
        }
        let cell = row.cells[colNumber];
        const border = this.getters.getCellBorder(sheetId, colNumber, rowNumber);
        const conditionalStyle = this.getters.getConditionalStyle(colNumber, rowNumber);
        const iconStyle = this.getters.getConditionalIcon(colNumber, rowNumber);
        if (!this.getters.isInMerge(sheetId, colNumber, rowNumber)) {
          if (cell) {
            const text = this.getters.getCellText(cell, showFormula);
            let style = this.getters.getCellStyle(cell);
            if (conditionalStyle) {
              style = Object.assign({}, style, conditionalStyle);
            }
            const align = text
              ? (style && style.align) || computeAlign(cell, showFormula)
              : undefined;
            let clipRect: Rect | null = null;
            let clipIcon: Rect | null = null;
            const textWidth = this.getters.getTextWidth(cell);
            const fontsize = style.fontSize || DEFAULT_FONT_SIZE;
            const iconWidth = fontSizeMap[fontsize];
            const iconBoxWidth = iconStyle ? iconWidth + 2 * MIN_CF_ICON_MARGIN : 0;
            const contentWidth = iconBoxWidth + textWidth;

            const isOverflowing =
              contentWidth > cols[colNumber].size || fontSizeMap[fontsize] > row.size;

            if (iconStyle) {
              const colWidth = col.end - col.start;
              clipRect = [
                col.start - offsetX + iconBoxWidth,
                row.start - offsetY,
                Math.max(0, colWidth - iconBoxWidth),
                row.size,
              ];
              clipIcon = [
                col.start - offsetX,
                row.start - offsetY,
                Math.min(iconBoxWidth, colWidth),
                row.size,
              ];
            } else {
              if (isOverflowing) {
                let c: number;
                let width: number;
                switch (align) {
                  case "left":
                    c = colNumber;
                    while (c < right && !this.hasContent(c + 1, rowNumber)) {
                      c++;
                    }
                    width = cols[c].end - col.start;
                    if (width < textWidth || fontSizeMap[fontsize] > row.size) {
                      clipRect = [col.start - offsetX, row.start - offsetY, width, row.size];
                    }
                    break;
                  case "right":
                    c = colNumber;
                    while (c > left && !this.hasContent(c - 1, rowNumber)) {
                      c--;
                    }
                    width = col.end - cols[c].start;
                    if (width < textWidth || fontSizeMap[fontsize] > row.size) {
                      clipRect = [cols[c].start - offsetX, row.start - offsetY, width, row.size];
                    }
                    break;
                  case "center":
                    let c1 = colNumber;
                    while (c1 > left && !this.hasContent(c1 - 1, rowNumber)) {
                      c1--;
                    }
                    let c2 = colNumber;
                    while (c2 < right && !this.hasContent(c2 + 1, rowNumber)) {
                      c2++;
                    }
                    const colLeft = Math.min(c1, colNumber);
                    const colRight = Math.max(c2, colNumber);
                    width = cols[colRight].end - cols[colLeft].start;
                    if (
                      width < textWidth ||
                      colLeft === colNumber ||
                      colRight === colNumber ||
                      fontSizeMap[fontsize] > row.size
                    ) {
                      clipRect = [
                        cols[colLeft].start - offsetX,
                        row.start - offsetY,
                        width,
                        row.size,
                      ];
                    }
                    break;
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
              border,
              style,
              align,
              clipRect,
              error: cell.evaluated.type === CellValueType.error ? cell.evaluated.error : undefined,
              image: iconStyle
                ? {
                    type: "icon",
                    size: iconWidth,
                    clipIcon,
                    image: ICONS[iconStyle].img,
                  }
                : undefined,
            });
          } else {
            result.push({
              x: col.start - offsetX,
              y: row.start - offsetY,
              width: col.size,
              height: row.size,
              text: "",
              textWidth: 0,
              border,
              style: conditionalStyle ? conditionalStyle : null,
              align: undefined,
              clipRect: null,
              error: undefined,
            });
          }
        }
      }
    }

    const activeSheetId = this.getters.getActiveSheetId();
    // process all visible merges
    for (let merge of this.getters.getMerges(activeSheetId)) {
      if (this.getters.isMergeHidden(activeSheetId, merge)) {
        continue;
      }
      if (overlap(merge, viewport)) {
        const refCell = this.getters.getCell(activeSheetId, merge.left, merge.top);
        const borderTopLeft = this.getters.getCellBorder(activeSheetId, merge.left, merge.top);
        const borderBottomRight = this.getters.getCellBorder(
          activeSheetId,
          merge.right,
          merge.bottom
        );
        const width = cols[merge.right].end - cols[merge.left].start;
        let text, textWidth, style, align, border;
        style = refCell ? this.getters.getCellStyle(refCell) : null;
        if (refCell || borderBottomRight || borderTopLeft) {
          text = refCell ? this.getters.getCellText(refCell, showFormula) : "";
          textWidth = refCell ? this.getters.getTextWidth(refCell) : null;
          const conditionalStyle = this.getters.getConditionalStyle(
            merge.topLeft.col,
            merge.topLeft.row
          );
          if (conditionalStyle) {
            style = Object.assign({}, style, conditionalStyle);
          }
          align = text ? (style && style.align) || computeAlign(refCell!, showFormula) : null;
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
        const iconStyle = this.getters.getConditionalIcon(merge.left, merge.top);
        const fontsize = style.fontSize || DEFAULT_FONT_SIZE;
        const iconWidth = fontSizeMap[fontsize];
        const iconBoxWidth = iconStyle ? 2 * MIN_CF_ICON_MARGIN + iconWidth : 0;

        const clipRect: Rect = iconStyle
          ? [x + iconBoxWidth, y, Math.max(0, width - iconBoxWidth), height]
          : [x, y, width, height];
        const clipIcon: Rect | null = iconStyle
          ? [x, y, Math.min(iconBoxWidth, width), height]
          : null;
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
          clipRect,
          error:
            refCell && refCell.evaluated.type === CellValueType.error
              ? refCell.evaluated.error
              : undefined,
          image: iconStyle
            ? {
                type: "icon",
                clipIcon,
                size: iconWidth,
                image: ICONS[iconStyle].img,
              }
            : undefined,
        });
      }
    }
    return result;
  }
}
