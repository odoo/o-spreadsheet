import { ICONS } from "../../components/icons/icons";
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
TEXT_HEADER_COLOR
} from "../../constants";
import { fontSizeMap } from "../../fonts";
import { intersection,overlap,positionToZone,scrollDelay,union } from "../../helpers/index";
import {
Align,
Box,
Cell,
CellValueType,
Dimension,
EdgeScrollInfo,
GridRenderingContext,
HeaderDimensions,
LAYERS,
Rect,
ScrollDirection,
UID,
Viewport,
Zone
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

// -----------------------------------------------------------------------------
// Constants, types, helpers, ...
// -----------------------------------------------------------------------------

export class RendererPlugin extends UIPlugin {
  static layers = [LAYERS.Background, LAYERS.Headers];
  static getters = [
    "getColDimensions",
    "getColDimensionsInViewport",
    "getRowDimensions",
    "getRowDimensionsInViewport",
    "getRect",
    "isVisibleInViewport",
    "getEdgeScrollCol",
    "getEdgeScrollRow",
  ] as const;

  private boxes: Box[] = [];

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Returns the size, start and end coordinates of a column
   */
  getColDimensions(sheetId: UID, col: number): HeaderDimensions {
    const start = this.getColRowOffset("COL", 0, col, sheetId);
    const c = this.getters.getCol(sheetId, col);
    const size = this.getters.getColSize(sheetId, col);
    return {
      start,
      size,
      end: start + (c.isHidden ? 0 : size),
    };
  }

  /**
   * Returns the size, start and end coordinates of a column relative to the left
   * column of the current viewport
   */
  getColDimensionsInViewport(sheetId: UID, col: number): HeaderDimensions {
    const { left } = this.getters.getActiveSnappedViewport();
    const start = this.getColRowOffset("COL", left, col, sheetId);
    const c = this.getters.getCol(sheetId, col);
    const size = this.getters.getColSize(sheetId, col);
    return {
      start,
      size: size,
      end: start + (c.isHidden ? 0 : size),
    };
  }

  /**
   * Returns the size, start and end coordinates of a row
   */
  getRowDimensions(sheetId: UID, row: number): HeaderDimensions {
    const start = this.getColRowOffset("ROW", 0, row, sheetId);
    const r = this.getters.getRow(sheetId, row);
    const size = this.getters.getRowSize(sheetId, row);
    return {
      start,
      size: size,
      end: start + (r.isHidden ? 0 : size),
    };
  }

  /**
   * Returns the size, start and end coordinates of a row relative to the top row
   * of the current viewport
   */
  getRowDimensionsInViewport(sheetId: UID, row: number): HeaderDimensions {
    const { top } = this.getters.getActiveSnappedViewport();
    const start = this.getColRowOffset("ROW", top, row, sheetId);
    const r = this.getters.getRow(sheetId, row);
    const size = this.getters.getRowSize(sheetId, row);
    return {
      start,
      size: size,
      end: start + (r.isHidden ? 0 : size),
    };
  }

  /**
   * Returns the offset of a header (determined by the dimension) at the given index
   * based on the referenceIndex given. If start === 0, this method will return
   * the start attribute of the header.
   */
  private getColRowOffset(
    dimension: Dimension,
    referenceIndex: number,
    index: number,
    sheetId: UID = this.getters.getActiveSheetId()
  ): number {
    const sheet = this.getters.getSheet(sheetId);
    const headers = dimension === "ROW" ? sheet.rows : sheet.cols;
    if (index < referenceIndex) {
      return -this.getColRowOffset(dimension, index, referenceIndex);
    }
    let offset = 0;
    for (let i = referenceIndex; i < index; i++) {
      if (headers[i].isHidden) {
        continue;
      }
      offset +=
        dimension === "COL"
          ? this.getters.getColSize(sheetId, i)
          : this.getters.getRowSize(sheetId, i);
    }
    return offset;
  }

  /**
   * Get the offset of a header (see getColRowOffset), adjusted with the header
   * size (HEADER_HEIGHT and HEADER_WIDTH)
   */
  private getHeaderOffset(dimension: Dimension, start: number, index: number): number {
    let size = this.getColRowOffset(dimension, start, index);
    if (!this.getters.isDashboard()) {
      size += dimension === "ROW" ? HEADER_HEIGHT : HEADER_WIDTH;
    }
    return size;
  }

  /**
   * Get the actual size between two headers.
   * The size from A to B is the distance between A.start and B.end
   */
  private getSizeBetweenHeaders(dimension: Dimension, from: number, to: number): number {
    const { cols, rows, id: sheetId } = this.getters.getActiveSheet();
    const headers = dimension === "COL" ? cols : rows;
    let size = 0;
    for (let i = from; i <= to; i++) {
      if (headers[i].isHidden) {
        continue;
      }
      size +=
        dimension === "COL"
          ? this.getters.getColSize(sheetId, i)
          : this.getters.getRowSize(sheetId, i);
    }
    return size;
  }

  /**
   * Computes the coordinates and size to draw the zone on the canvas
   */
  getRect(zone: Zone, viewport: Viewport): Rect {
    const { left, top } = viewport;
    const x = this.getHeaderOffset("COL", left, zone.left);
    const width = this.getSizeBetweenHeaders("COL", zone.left, zone.right);
    const y = this.getHeaderOffset("ROW", top, zone.top);
    const height = this.getSizeBetweenHeaders("ROW", zone.top, zone.bottom);
    return [x, y, width, height];
  }

  /**
   * Check if a given position is visible in the viewport.
   */
  isVisibleInViewport(col: number, row: number, viewport: Viewport): boolean {
    const { right, left, top, bottom } = viewport;
    return row <= bottom && row >= top && col >= left && col <= right;
  }

  getEdgeScrollCol(x: number): EdgeScrollInfo {
    let canEdgeScroll = false;
    let direction: ScrollDirection = 0;
    let delay = 0;
    const { width } = this.getters.getViewportDimension();
    const { width: gridWidth } = this.getters.getMaxViewportSize(this.getters.getActiveSheet());
    const { left, offsetX } = this.getters.getActiveSnappedViewport();
    if (x < 0 && left > 0) {
      canEdgeScroll = true;
      direction = -1;
      delay = scrollDelay(-x);
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
    const { height: gridHeight } = this.getters.getMaxViewportSize(this.getters.getActiveSheet());
    const { top, offsetY } = this.getters.getActiveSnappedViewport();
    if (y < 0 && top > 0) {
      canEdgeScroll = true;
      direction = -1;
      delay = scrollDelay(-y);
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
        if (this.getters.isDashboard()) {
          return;
        }
        this.drawHeaders(renderingContext);
        break;
    }
  }

  private drawBackground(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth, viewport } = renderingContext;
    const { width, height } = this.getters.getViewportDimensionWithHeaders();
    const sheetId = this.getters.getActiveSheetId();

    // white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    // background grid
    const { right, left, top, bottom } = viewport;

    if (!this.getters.getGridLinesVisibility(sheetId) || this.getters.isDashboard()) {
      return;
    }
    ctx.lineWidth = 2 * thinLineWidth;
    ctx.strokeStyle = CELL_BORDER_COLOR;
    ctx.beginPath();

    // vertical lines
    for (let i = left; i <= right; i++) {
      if (this.getters.isColHidden(sheetId, i)) {
        continue;
      }
      const zone = { top, bottom, left: i, right: i };
      const [x, , colWidth, colHeight] = this.getRect(zone, viewport);
      ctx.moveTo(x + colWidth, 0);
      ctx.lineTo(
        x + colWidth,
        Math.min(height, colHeight + (this.getters.isDashboard() ? 0 : HEADER_HEIGHT))
      );
    }

    // horizontal lines
    for (let i = top; i <= bottom; i++) {
      if (this.getters.isRowHidden(sheetId, i)) {
        continue;
      }
      const zone = { left, right, top: i, bottom: i };
      const [, y, rowWidth, rowHeight] = this.getRect(zone, viewport);
      ctx.moveTo(0, y + rowHeight);
      ctx.lineTo(
        Math.min(width, rowWidth + (this.getters.isDashboard() ? 0 : HEADER_WIDTH)),
        y + rowHeight
      );
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
      if ((style.fillColor && style.fillColor !== "#ffffff") || box.isMerge) {
        ctx.fillStyle = style.fillColor || "#ffffff";
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
      if (box.content) {
        const style = box.style || {};
        const align = box.content.align || "left";
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
        ctx.fillText(box.content.text, Math.round(x), Math.round(y));
        if (style.strikethrough || style.underline) {
          if (align === "right") {
            x = x - box.content.width;
          } else if (align === "center") {
            x = x - box.content.width / 2;
          }
          if (style.strikethrough) {
            ctx.fillRect(x, y, box.content.width, 2.6 * thinLineWidth);
          }
          if (style.underline) {
            y = box.y + box.height / 2 + 1 + size / 2;
            ctx.fillRect(x, y, box.content.width, 1.3 * thinLineWidth);
          }
        }
        if (box.clipRect) {
          ctx.restore();
        }
      }
    }
  }

  private drawIcon(renderingContext: GridRenderingContext) {
    const { ctx } = renderingContext;
    for (const box of this.boxes) {
      if (box.image) {
        const icon: HTMLImageElement = box.image.image;
        const size = box.image.size;
        const margin = (box.height - size) / 2;
        if (box.image.clipIcon) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(...box.image.clipIcon);
          ctx.clip();
        }
        ctx.drawImage(icon, box.x + MIN_CF_ICON_MARGIN, box.y + margin, size, size);
        if (box.image.clipIcon) {
          ctx.restore();
        }
      }
    }
  }

  private drawHeaders(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth, viewport } = renderingContext;
    const { right, left, top, bottom } = viewport;
    const { width, height } = this.getters.getViewportDimensionWithHeaders();
    const selection = this.getters.getSelectedZones();
    const sheetId = this.getters.getActiveSheetId();
    const { cols, rows } = this.getters.getSheet(sheetId);
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
      const colZone = intersection(zone, { ...viewport, top: 0, bottom: rows.length - 1 });
      if (colZone) {
        const [x, , width] = this.getRect(colZone, viewport);
        ctx.fillStyle = activeCols.has(zone.left)
          ? BACKGROUND_HEADER_ACTIVE_COLOR
          : BACKGROUND_HEADER_SELECTED_COLOR;
        ctx.fillRect(x, 0, width, HEADER_HEIGHT);
      }
      const rowZone = intersection(zone, { ...viewport, left: 0, right: cols.length - 1 });
      if (rowZone) {
        const [, y, , height] = this.getRect(rowZone, viewport);
        ctx.fillStyle = activeRows.has(zone.top)
          ? BACKGROUND_HEADER_ACTIVE_COLOR
          : BACKGROUND_HEADER_SELECTED_COLOR;
        ctx.fillRect(0, y, HEADER_WIDTH, height);
      }
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
      const col = this.getters.getCol(sheetId, i);
      const colSize = this.getters.getColSize(sheetId, i);
      if (col.isHidden) {
        continue;
      }
      ctx.fillStyle = activeCols.has(i) ? "#fff" : TEXT_HEADER_COLOR;
      let colStart = this.getHeaderOffset("COL", viewport.left, i);
      ctx.fillText(col.name, colStart + colSize / 2, HEADER_HEIGHT / 2);
      ctx.moveTo(colStart + colSize, 0);
      ctx.lineTo(colStart + colSize, HEADER_HEIGHT);
    }
    // row text + separator
    for (let i = top; i <= bottom; i++) {
      const row = this.getters.getRow(sheetId, i);
      const rowSize = this.getters.getRowSize(sheetId, i);
      if (row.isHidden) {
        continue;
      }
      ctx.fillStyle = activeRows.has(i) ? "#fff" : TEXT_HEADER_COLOR;

      let rowStart = this.getHeaderOffset("ROW", viewport.top, i);
      ctx.fillText(row.name, HEADER_WIDTH / 2, rowStart + rowSize / 2);
      ctx.moveTo(0, rowStart + rowSize);
      ctx.lineTo(HEADER_WIDTH, rowStart + rowSize);
    }

    ctx.stroke();
  }

  private hasContent(col: number, row: number): boolean {
    const sheetId = this.getters.getActiveSheetId();
    const cell = this.getters.getCell(sheetId, col, row);
    return (cell && !cell.isEmpty()) || this.getters.isInMerge(sheetId, col, row);
  }

  private findNextEmptyCol(base: number, max: number, row: number): number {
    let col = base;
    while (col < max && !this.hasContent(col + 1, row)) {
      col++;
    }
    return col;
  }

  private findPreviousEmptyCol(base: number, min: number, row: number): number {
    let col = base;
    while (col > min && !this.hasContent(col - 1, row)) {
      col--;
    }
    return col;
  }

  private computeCellAlignment(cell: Cell, isOverflowing: boolean): Align {
    if (cell.isFormula() && this.getters.shouldShowFormulas()) {
      return "left";
    }
    const { align } = this.getters.getCellStyle(cell);
    if (isOverflowing && cell.evaluated.type === CellValueType.number) {
      return align !== "center" ? "left" : align;
    }
    return align || cell.defaultAlign;
  }

  private createZoneBox(sheetId: UID, zone: Zone, viewport: Viewport): Box {
    const { right, left } = viewport;
    const col = zone.left;
    const row = zone.top;
    const cell = this.getters.getCell(sheetId, col, row);
    const showFormula = this.getters.shouldShowFormulas();
    const [x, y, width, height] = this.getRect(zone, viewport);

    const box: Box = {
      x,
      y,
      width,
      height,
      border: this.getters.getCellBorder(sheetId, col, row) || undefined,
      style: {
        ...this.getters.getCellStyle(cell),
        ...this.getters.getConditionalStyle(col, row),
      },
    };

    if (!cell) {
      return box;
    }
    /** Icon CF */
    const cfIcon = this.getters.getConditionalIcon(col, row);
    const fontSize = box.style.fontSize || DEFAULT_FONT_SIZE;
    const fontSizePX = fontSizeMap[fontSize];
    const iconBoxWidth = cfIcon ? 2 * MIN_CF_ICON_MARGIN + fontSizePX : 0;
    if (cfIcon) {
      box.image = {
        type: "icon",
        size: fontSizePX,
        clipIcon: [box.x, box.y, Math.min(iconBoxWidth, width), height],
        image: ICONS[cfIcon].img,
      };
    }

    /** Content */
    const text = this.getters.getCellText(cell, showFormula);
    const textWidth = this.getters.getTextWidth(cell);
    const contentWidth = iconBoxWidth + textWidth;
    const align = this.computeCellAlignment(cell, contentWidth > width);
    box.content = {
      text,
      width: textWidth,
      align,
    };

    /** Error */
    if (cell.evaluated.type === CellValueType.error) {
      box.error = cell.evaluated.error;
    }

    /** ClipRect */
    const isOverflowing = contentWidth > width || fontSizeMap[fontSize] > height;
    if (cfIcon) {
      box.clipRect = [box.x + iconBoxWidth, box.y, Math.max(0, width - iconBoxWidth), height];
    } else if (isOverflowing) {
      let nextColIndex: number, previousColIndex: number;

      const isCellInMerge = this.getters.isInMerge(sheetId, col, row);
      if (isCellInMerge) {
        // Always clip merges
        nextColIndex = this.getters.getMerge(sheetId, col, row)!.right;
        previousColIndex = col;
      } else {
        nextColIndex = this.findNextEmptyCol(col, right, row);
        previousColIndex = this.findPreviousEmptyCol(col, left, row);
      }

      switch (align) {
        case "left": {
          const emptyZoneOnTheLeft = positionToZone({ col: nextColIndex, row });
          const [x, y, width, height] = this.getRect(union(zone, emptyZoneOnTheLeft), viewport);
          if (width < textWidth || fontSizePX > height) {
            box.clipRect = [x, y, width, height];
          }
          break;
        }
        case "right": {
          const emptyZoneOnTheRight = positionToZone({ col: previousColIndex, row });
          const [x, y, width, height] = this.getRect(union(zone, emptyZoneOnTheRight), viewport);
          if (width < textWidth || fontSizePX > height) {
            box.clipRect = [x, y, width, height];
          }
          break;
        }
        case "center": {
          const emptyZone = {
            ...zone,
            right: nextColIndex,
            left: previousColIndex,
          };
          const [x, y, width, height] = this.getRect(emptyZone, viewport);
          if (
            width < textWidth ||
            previousColIndex === col ||
            nextColIndex === col ||
            fontSizePX > height
          ) {
            box.clipRect = [x, y, width, height];
          }
          break;
        }
      }
    }
    return box;
  }

  private getGridBoxes(renderingContext: GridRenderingContext): Box[] {
    const boxes: Box[] = [];

    const { viewport } = renderingContext;
    const { right, left, top, bottom } = viewport;
    const sheet = this.getters.getActiveSheet();
    const { id: sheetId } = sheet;

    for (let rowNumber = top; rowNumber <= bottom; rowNumber++) {
      if (this.getters.isRowHidden(sheetId, rowNumber)) {
        continue;
      }
      for (let colNumber = left; colNumber <= right; colNumber++) {
        if (this.getters.isColHidden(sheetId, colNumber)) {
          continue;
        }
        if (this.getters.isInMerge(sheetId, colNumber, rowNumber)) {
          continue;
        }
        boxes.push(
          this.createZoneBox(sheetId, positionToZone({ col: colNumber, row: rowNumber }), viewport)
        );
      }
    }
    for (const merge of this.getters.getMerges(sheetId)) {
      if (this.getters.isMergeHidden(sheetId, merge)) {
        continue;
      }
      if (overlap(merge, viewport)) {
        const box = this.createZoneBox(sheetId, merge, viewport);
        const borderBottomRight = this.getters.getCellBorder(sheetId, merge.right, merge.bottom);
        box.border = {
          ...box.border,
          bottom: borderBottomRight ? borderBottomRight.bottom : undefined,
          right: borderBottomRight ? borderBottomRight.right : undefined,
        };
        box.isMerge = true;
        boxes.push(box);
      }
    }
    return boxes;
  }
}
