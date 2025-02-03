import { ICONS } from "../../components/icons/icons";
import {
  BACKGROUND_HEADER_ACTIVE_COLOR,
  BACKGROUND_HEADER_COLOR,
  BACKGROUND_HEADER_FILTER_COLOR,
  BACKGROUND_HEADER_SELECTED_COLOR,
  BACKGROUND_HEADER_SELECTED_FILTER_COLOR,
  CANVAS_SHIFT,
  CELL_BORDER_COLOR,
  DEFAULT_FONT,
  FILTERS_COLOR,
  FILTER_ICON_EDGE_LENGTH,
  FILTER_ICON_MARGIN,
  HEADER_BORDER_COLOR,
  HEADER_FONT_SIZE,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  ICON_EDGE_LENGTH,
  MIN_CELL_TEXT_MARGIN,
  MIN_CF_ICON_MARGIN,
  TEXT_HEADER_COLOR,
} from "../../constants";
import {
  computeTextFont,
  computeTextFontSizeInPixels,
  computeTextWidth,
  getZonesCols,
  getZonesRows,
  numberToLetters,
  overlap,
  positionToZone,
  union,
} from "../../helpers/index";
import { CellErrorLevel } from "../../types/errors";
import {
  Align,
  Box,
  Cell,
  CellValueType,
  Dimension,
  GridRenderingContext,
  HeaderDimensions,
  HeaderIndex,
  LAYERS,
  UID,
  Viewport,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

// -----------------------------------------------------------------------------
// Constants, types, helpers, ...
// -----------------------------------------------------------------------------

export const CELL_BACKGROUND_GRIDLINE_STROKE_STYLE = "#111";

export class RendererPlugin extends UIPlugin {
  static layers = [LAYERS.Background, LAYERS.Headers];
  static getters = ["getColDimensionsInViewport", "getRowDimensionsInViewport"] as const;

  private boxes: Box[] = [];

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Returns the size, start and end coordinates of a column relative to the left
   * column of the current viewport
   */
  getColDimensionsInViewport(sheetId: UID, col: HeaderIndex): HeaderDimensions {
    const left = Math.min(...this.getters.getSheetViewVisibleCols());
    const start = this.getters.getColRowOffsetInViewport("COL", left, col);
    const size = this.getters.getColSize(sheetId, col);
    const isColHidden = this.getters.isColHidden(sheetId, col);
    return {
      start,
      size: size,
      end: start + (isColHidden ? 0 : size),
    };
  }

  /**
   * Returns the size, start and end coordinates of a row relative to the top row
   * of the current viewport
   */
  getRowDimensionsInViewport(sheetId: UID, row: HeaderIndex): HeaderDimensions {
    const top = Math.min(...this.getters.getSheetViewVisibleRows());
    const start = this.getters.getColRowOffsetInViewport("ROW", top, row);
    const size = this.getters.getRowSize(sheetId, row);
    const isRowHidden = this.getters.isRowHidden(sheetId, row);
    return {
      start,
      size: size,
      end: start + (isRowHidden ? 0 : size),
    };
  }

  /**
   * Get the offset of a header (see getColRowOffsetInViewport), adjusted with the header
   * size (HEADER_HEIGHT and HEADER_WIDTH)
   */
  private getHeaderOffset(dimension: Dimension, start: HeaderIndex, index: HeaderIndex): number {
    let size = this.getters.getColRowOffsetInViewport(dimension, start, index);
    if (!this.getters.isDashboard()) {
      size += dimension === "ROW" ? HEADER_HEIGHT : HEADER_WIDTH;
    }
    return size;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext, layer: LAYERS) {
    switch (layer) {
      case LAYERS.Background:
        this.drawBackground(renderingContext);
        for (const zone of this.getters.getAllActiveViewportsZones()) {
          const { ctx } = renderingContext;
          ctx.save();
          ctx.beginPath();
          const rect = this.getters.getVisibleRect(zone);
          ctx.rect(rect.x, rect.y, rect.width, rect.height);
          ctx.clip();
          this.boxes = this.getGridBoxes(zone);
          this.drawCellBackground(renderingContext);
          this.drawBorders(renderingContext);
          this.drawTexts(renderingContext);
          this.drawIcon(renderingContext);
          ctx.restore();
        }
        this.drawFrozenPanes(renderingContext);
        break;
      case LAYERS.Headers:
        if (!this.getters.isDashboard()) {
          this.drawHeaders(renderingContext);
          this.drawFrozenPanesHeaders(renderingContext);
        }
        break;
    }
  }

  private drawBackground(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;
    const { width, height } = this.getters.getSheetViewDimensionWithHeaders();
    const sheetId = this.getters.getActiveSheetId();

    // white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width + CANVAS_SHIFT, height + CANVAS_SHIFT);

    // background grid
    const visibleCols = this.getters.getSheetViewVisibleCols();
    const left = visibleCols[0];
    const right = visibleCols[visibleCols.length - 1];

    const visibleRows = this.getters.getSheetViewVisibleRows();
    const top = visibleRows[0];
    const bottom = visibleRows[visibleRows.length - 1];

    if (!this.getters.getGridLinesVisibility(sheetId) || this.getters.isDashboard()) {
      return;
    }
    ctx.lineWidth = 2 * thinLineWidth;
    ctx.strokeStyle = CELL_BORDER_COLOR;
    ctx.beginPath();

    // vertical lines
    for (const i of visibleCols) {
      const zone = { top, bottom, left: i, right: i };
      const { x, width: colWidth, height: colHeight } = this.getters.getVisibleRect(zone);
      ctx.moveTo(x + colWidth, 0);
      ctx.lineTo(
        x + colWidth,
        Math.min(height, colHeight + (this.getters.isDashboard() ? 0 : HEADER_HEIGHT))
      );
    }

    // horizontal lines
    for (const i of visibleRows) {
      const zone = { left, right, top: i, bottom: i };
      const { y, width: rowWidth, height: rowHeight } = this.getters.getVisibleRect(zone);
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
    const areGridLinesVisible =
      !this.getters.isDashboard() &&
      this.getters.getGridLinesVisibility(this.getters.getActiveSheetId());
    ctx.lineWidth = areGridLinesVisible ? 0.3 * thinLineWidth : thinLineWidth;
    const inset = areGridLinesVisible ? 0.1 * thinLineWidth : 0;
    ctx.strokeStyle = "#111";
    for (let box of this.boxes) {
      // fill color
      let style = box.style;
      if ((style.fillColor && style.fillColor !== "#ffffff") || box.isMerge) {
        ctx.fillStyle = style.fillColor || "#ffffff";
        if (areGridLinesVisible) {
          ctx.fillRect(box.x, box.y, box.width, box.height);
          ctx.strokeRect(
            box.x + inset,
            box.y + inset,
            box.width - 2 * inset,
            box.height - 2 * inset
          );
        } else {
          ctx.fillRect(
            box.x - thinLineWidth,
            box.y - thinLineWidth,
            box.width + 2 * thinLineWidth,
            box.height + 2 * thinLineWidth
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
      const border = box.border;
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
    ctx.textBaseline = "top";
    let currentFont;
    for (let box of this.boxes) {
      if (box.content) {
        const style = box.style || {};
        const align = box.content.align || "left";
        const font = computeTextFont(style);
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
          x =
            box.x +
            box.width -
            MIN_CELL_TEXT_MARGIN -
            (box.isFilterHeader ? ICON_EDGE_LENGTH + FILTER_ICON_MARGIN : 0);
        } else {
          x = box.x + box.width / 2;
        }
        ctx.textAlign = align;
        if (box.clipRect) {
          ctx.save();
          ctx.beginPath();
          const { x, y, width, height } = box.clipRect;
          ctx.rect(x, y, width, height);
          ctx.clip();
        }

        const brokenLineNumber = box.content.multiLineText.length;
        const size = computeTextFontSizeInPixels(style);
        const contentHeight =
          brokenLineNumber * (size + MIN_CELL_TEXT_MARGIN) - MIN_CELL_TEXT_MARGIN;
        let brokenLineY = y - contentHeight / 2;

        for (let brokenLine of box.content.multiLineText) {
          ctx.fillText(brokenLine, Math.round(x), Math.round(brokenLineY));
          if (style.strikethrough || style.underline) {
            const lineWidth = computeTextWidth(ctx, brokenLine, style);
            let _x = x;
            if (align === "right") {
              _x -= lineWidth;
            } else if (align === "center") {
              _x -= lineWidth / 2;
            }
            if (style.strikethrough) {
              ctx.fillRect(_x, brokenLineY + size / 2, lineWidth, 2.6 * thinLineWidth);
            }
            if (style.underline) {
              ctx.fillRect(_x, brokenLineY + size + 1, lineWidth, 1.3 * thinLineWidth);
            }
          }
          brokenLineY += MIN_CELL_TEXT_MARGIN + size;
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
          const { x, y, width, height } = box.image.clipIcon;
          ctx.rect(x, y, width, height);
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
    const { ctx, thinLineWidth } = renderingContext;
    const visibleCols = this.getters.getSheetViewVisibleCols();
    const left = visibleCols[0];
    const visibleRows = this.getters.getSheetViewVisibleRows();
    const top = visibleRows[0];
    const { width, height } = this.getters.getSheetViewDimensionWithHeaders();
    const selection = this.getters.getSelectedZones();
    const selectedCols = getZonesCols(selection);
    const selectedRows = getZonesRows(selection);
    const sheetId = this.getters.getActiveSheetId();
    const numberOfCols = this.getters.getNumberCols(sheetId);
    const numberOfRows = this.getters.getNumberRows(sheetId);
    const activeCols = this.getters.getActiveCols();
    const activeRows = this.getters.getActiveRows();

    ctx.font = `400 ${HEADER_FONT_SIZE}px ${DEFAULT_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = thinLineWidth;
    ctx.strokeStyle = "#333";

    // Columns headers background
    for (const col of visibleCols) {
      const colZone = { left: col, right: col, top: 0, bottom: numberOfRows - 1 };
      const { x, width } = this.getters.getVisibleRect(colZone);
      const colHasFilter = this.getters.doesZonesContainFilter(sheetId, [colZone]);
      const isColActive = activeCols.has(col);
      const isColSelected = selectedCols.has(col);
      if (isColActive) {
        ctx.fillStyle = colHasFilter ? FILTERS_COLOR : BACKGROUND_HEADER_ACTIVE_COLOR;
      } else if (isColSelected) {
        ctx.fillStyle = colHasFilter
          ? BACKGROUND_HEADER_SELECTED_FILTER_COLOR
          : BACKGROUND_HEADER_SELECTED_COLOR;
      } else {
        ctx.fillStyle = colHasFilter ? BACKGROUND_HEADER_FILTER_COLOR : BACKGROUND_HEADER_COLOR;
      }
      ctx.fillRect(x, 0, width, HEADER_HEIGHT);
    }

    // Rows headers background
    for (const row of visibleRows) {
      const rowZone = { top: row, bottom: row, left: 0, right: numberOfCols - 1 };
      const { y, height } = this.getters.getVisibleRect(rowZone);

      const rowHasFilter = this.getters.doesZonesContainFilter(sheetId, [rowZone]);
      const isRowActive = activeRows.has(row);
      const isRowSelected = selectedRows.has(row);
      if (isRowActive) {
        ctx.fillStyle = rowHasFilter ? FILTERS_COLOR : BACKGROUND_HEADER_ACTIVE_COLOR;
      } else if (isRowSelected) {
        ctx.fillStyle = rowHasFilter
          ? BACKGROUND_HEADER_SELECTED_FILTER_COLOR
          : BACKGROUND_HEADER_SELECTED_COLOR;
      } else {
        ctx.fillStyle = rowHasFilter ? BACKGROUND_HEADER_FILTER_COLOR : BACKGROUND_HEADER_COLOR;
      }
      ctx.fillRect(0, y, HEADER_WIDTH, height);
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
    for (const col of visibleCols) {
      const colSize = this.getters.getColSize(sheetId, col);
      const colName = numberToLetters(col);
      ctx.fillStyle = activeCols.has(col) ? "#fff" : TEXT_HEADER_COLOR;
      let colStart = this.getHeaderOffset("COL", left, col);
      ctx.fillText(colName, colStart + colSize / 2, HEADER_HEIGHT / 2);
      ctx.moveTo(colStart + colSize, 0);
      ctx.lineTo(colStart + colSize, HEADER_HEIGHT);
    }
    // row text + separator
    for (const row of visibleRows) {
      const rowSize = this.getters.getRowSize(sheetId, row);
      ctx.fillStyle = activeRows.has(row) ? "#fff" : TEXT_HEADER_COLOR;

      let rowStart = this.getHeaderOffset("ROW", top, row);
      ctx.fillText(String(row + 1), HEADER_WIDTH / 2, rowStart + rowSize / 2);
      ctx.moveTo(0, rowStart + rowSize);
      ctx.lineTo(HEADER_WIDTH, rowStart + rowSize);
    }

    ctx.stroke();
  }

  private drawFrozenPanesHeaders(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;

    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      this.getters.getMainViewportCoordinates();
    const widthCorrection = this.getters.isDashboard() ? 0 : HEADER_WIDTH;
    const heightCorrection = this.getters.isDashboard() ? 0 : HEADER_HEIGHT;
    ctx.lineWidth = 6 * thinLineWidth;
    ctx.strokeStyle = "#BCBCBC";
    ctx.beginPath();
    if (offsetCorrectionX) {
      ctx.moveTo(widthCorrection + offsetCorrectionX, 0);
      ctx.lineTo(widthCorrection + offsetCorrectionX, heightCorrection);
    }
    if (offsetCorrectionY) {
      ctx.moveTo(0, heightCorrection + offsetCorrectionY);
      ctx.lineTo(widthCorrection, heightCorrection + offsetCorrectionY);
    }
    ctx.stroke();
  }

  private drawFrozenPanes(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;

    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      this.getters.getMainViewportCoordinates();

    const visibleCols = this.getters.getSheetViewVisibleCols();
    const left = visibleCols[0];
    const right = visibleCols[visibleCols.length - 1];
    const visibleRows = this.getters.getSheetViewVisibleRows();
    const top = visibleRows[0];
    const bottom = visibleRows[visibleRows.length - 1];
    const viewport = { left, right, top, bottom };

    const rect = this.getters.getVisibleRect(viewport);
    const widthCorrection = this.getters.isDashboard() ? 0 : HEADER_WIDTH;
    const heightCorrection = this.getters.isDashboard() ? 0 : HEADER_HEIGHT;
    ctx.lineWidth = 6 * thinLineWidth;
    ctx.strokeStyle = "#DADFE8";
    ctx.beginPath();
    if (offsetCorrectionX) {
      ctx.moveTo(widthCorrection + offsetCorrectionX, heightCorrection);
      ctx.lineTo(widthCorrection + offsetCorrectionX, rect.height + heightCorrection);
    }
    if (offsetCorrectionY) {
      ctx.moveTo(widthCorrection, heightCorrection + offsetCorrectionY);
      ctx.lineTo(rect.width + widthCorrection, heightCorrection + offsetCorrectionY);
    }
    ctx.stroke();
  }

  private hasContent(col: HeaderIndex, row: HeaderIndex): boolean {
    const sheetId = this.getters.getActiveSheetId();
    const cell = this.getters.getCell(sheetId, col, row);
    return (cell && !cell.isEmpty()) || this.getters.isInMerge(sheetId, col, row);
  }

  private findNextEmptyCol(base: HeaderIndex, max: HeaderIndex, row: HeaderIndex): HeaderIndex {
    let col: HeaderIndex = base;
    while (col < max && !this.hasContent(col + 1, row)) {
      col++;
    }
    return col;
  }

  private findPreviousEmptyCol(base: HeaderIndex, min: HeaderIndex, row: HeaderIndex): HeaderIndex {
    let col: HeaderIndex = base;
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
    const { left, right } = viewport;
    const col: HeaderIndex = zone.left;
    const row: HeaderIndex = zone.top;
    const cell = this.getters.getCell(sheetId, col, row);
    const showFormula = this.getters.shouldShowFormulas();
    const { x, y, width, height } = this.getters.getRect(zone);

    const box: Box = {
      x,
      y,
      width,
      height,
      border: this.getters.getCellBorderWithFilterBorder(sheetId, col, row) || undefined,
      style: this.getters.getCellComputedStyle(sheetId, col, row),
    };

    if (!cell) {
      return box;
    }
    /** Icon CF */
    const cfIcon = this.getters.getConditionalIcon(col, row);
    const fontSizePX = computeTextFontSizeInPixels(box.style);
    const iconBoxWidth = cfIcon ? 2 * MIN_CF_ICON_MARGIN + fontSizePX : 0;
    if (cfIcon) {
      box.image = {
        type: "icon",
        size: fontSizePX,
        clipIcon: { x: box.x, y: box.y, width: Math.min(iconBoxWidth, width), height },
        image: ICONS[cfIcon].img,
      };
    }

    /** Filter Header */
    box.isFilterHeader = this.getters.isFilterHeader(sheetId, col, row);
    const headerIconWidth = box.isFilterHeader ? FILTER_ICON_EDGE_LENGTH + FILTER_ICON_MARGIN : 0;

    /** Content */
    const text = this.getters.getCellText(cell, showFormula);
    const textWidth = this.getters.getTextWidth(cell);
    const wrapping = this.getters.getCellStyle(cell).wrapping || "overflow";
    const multiLineText =
      wrapping === "wrap"
        ? this.getters.getCellMultiLineText(cell, width - 2 * MIN_CELL_TEXT_MARGIN)
        : [text];
    const contentWidth = iconBoxWidth + textWidth + headerIconWidth;
    const align = this.computeCellAlignment(cell, contentWidth > width);
    box.content = {
      multiLineText,
      width: wrapping === "overflow" ? textWidth : width,
      align,
    };

    /** Error */
    if (
      cell.evaluated.type === CellValueType.error &&
      cell.evaluated.error.logLevel > CellErrorLevel.silent
    ) {
      box.error = cell.evaluated.error.message;
    }

    /** ClipRect */
    const isOverflowing = contentWidth > width || fontSizePX > height;
    if (cfIcon || box.isFilterHeader) {
      box.clipRect = {
        x: box.x + iconBoxWidth,
        y: box.y,
        width: Math.max(0, width - iconBoxWidth - headerIconWidth),
        height,
      };
    } else if (isOverflowing && wrapping === "overflow") {
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
          const { x, y, width, height } = this.getters.getVisibleRect(
            union(zone, emptyZoneOnTheLeft)
          );
          if (width < textWidth || fontSizePX > height) {
            box.clipRect = { x, y, width, height };
          }
          break;
        }
        case "right": {
          const emptyZoneOnTheRight = positionToZone({ col: previousColIndex, row });
          const { x, y, width, height } = this.getters.getVisibleRect(
            union(zone, emptyZoneOnTheRight)
          );
          if (width < textWidth || fontSizePX > height) {
            box.clipRect = { x, y, width, height };
          }
          break;
        }
        case "center": {
          const emptyZone = {
            ...zone,
            right: nextColIndex,
            left: previousColIndex,
          };
          const { x, y, width, height } = this.getters.getVisibleRect(emptyZone);
          if (
            width < textWidth ||
            previousColIndex === col ||
            nextColIndex === col ||
            fontSizePX > height
          ) {
            box.clipRect = { x, y, width, height };
          }
          break;
        }
      }
    } else if (wrapping === "clip" || wrapping === "wrap") {
      box.clipRect = {
        x: box.x,
        y: box.y,
        width,
        height,
      };
    }
    return box;
  }

  private getGridBoxes(zone: Zone): Box[] {
    const boxes: Box[] = [];

    const visibleCols = this.getters
      .getSheetViewVisibleCols()
      .filter((col) => col >= zone.left && col <= zone.right);
    const left = visibleCols[0];
    const right = visibleCols[visibleCols.length - 1];
    const visibleRows = this.getters
      .getSheetViewVisibleRows()
      .filter((row) => row >= zone.top && row <= zone.bottom);
    const top = visibleRows[0];
    const bottom = visibleRows[visibleRows.length - 1];
    const viewport = { left, right, top, bottom };
    const sheetId = this.getters.getActiveSheetId();

    for (const rowNumber of visibleRows) {
      for (const colNumber of visibleCols) {
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
