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
  computeTextLinesHeight,
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
  CellPosition,
  CellValueType,
  Dimension,
  GridRenderingContext,
  HeaderDimensions,
  HeaderIndex,
  LAYERS,
  UID,
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
        this.boxes = this.getGridBoxes();
        this.drawBackground(renderingContext);
        this.drawOverflowingCellBackground(renderingContext);
        this.drawCellBackground(renderingContext);
        this.drawBorders(renderingContext);
        this.drawTexts(renderingContext);
        this.drawIcon(renderingContext);
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

    // white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width + CANVAS_SHIFT, height + CANVAS_SHIFT);

    const areGridLinesVisible =
      !this.getters.isDashboard() &&
      this.getters.getGridLinesVisibility(this.getters.getActiveSheetId());
    const inset = areGridLinesVisible ? 0.1 * thinLineWidth : 0;

    if (areGridLinesVisible) {
      for (const box of this.boxes) {
        ctx.strokeStyle = CELL_BORDER_COLOR;
        ctx.lineWidth = thinLineWidth;
        ctx.strokeRect(box.x + inset, box.y + inset, box.width - 2 * inset, box.height - 2 * inset);
      }
    }
  }

  private drawCellBackground(renderingContext: GridRenderingContext) {
    const { ctx } = renderingContext;
    for (const box of this.boxes) {
      let style = box.style;
      if (style.fillColor && style.fillColor !== "#ffffff") {
        ctx.fillStyle = style.fillColor || "#ffffff";
        ctx.fillRect(box.x, box.y, box.width, box.height);
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

  private drawOverflowingCellBackground(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;
    for (const box of this.boxes) {
      if (box.content && box.isOverflow) {
        const align = box.content.align || "left";
        let x: number;
        let width: number;
        const y = box.y + thinLineWidth / 2;
        const height = box.height - thinLineWidth;
        const clipWidth = Math.min(box.clipRect?.width || Infinity, box.content.width);
        if (align === "left") {
          x = box.x + thinLineWidth / 2;
          width = clipWidth - 2 * thinLineWidth;
        } else if (align === "right") {
          x = box.x + box.width - thinLineWidth / 2;
          width = -clipWidth + 2 * thinLineWidth;
        } else {
          x =
            (box.clipRect?.x || box.x + box.width / 2 - box.content.width / 2) + thinLineWidth / 2;
          width = clipWidth - 2 * thinLineWidth;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, width, height);
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

        // compute font and textColor
        const font = computeTextFont(style);
        if (font !== currentFont) {
          currentFont = font;
          ctx.font = font;
        }
        ctx.fillStyle = style.textColor || "#000";

        // compute horizontal align start point parameter
        let x = box.x;
        if (align === "left") {
          x += MIN_CELL_TEXT_MARGIN + (box.image ? box.image.size + MIN_CF_ICON_MARGIN : 0);
        } else if (align === "right") {
          x +=
            box.width -
            MIN_CELL_TEXT_MARGIN -
            (box.isFilterHeader ? ICON_EDGE_LENGTH + FILTER_ICON_MARGIN : 0);
        } else {
          x += box.width / 2;
        }

        // horizontal align text direction
        ctx.textAlign = align;

        // clip rect if needed
        if (box.clipRect) {
          ctx.save();
          ctx.beginPath();
          const { x, y, width, height } = box.clipRect;
          ctx.rect(x, y, width, height);
          ctx.clip();
        }

        // compute vertical align start point parameter:
        const textLineHeight = computeTextFontSizeInPixels(style);
        const numberOfLines = box.content.textLines.length;
        let y = this.computeTextYCoordinate(box, textLineHeight, numberOfLines);

        // use the horizontal and the vertical start points to:
        // fill text / fill strikethrough / fill underline
        for (let brokenLine of box.content.textLines) {
          ctx.fillText(brokenLine, Math.round(x), Math.round(y));
          if (style.strikethrough || style.underline) {
            const lineWidth = computeTextWidth(ctx, brokenLine, style);
            let _x = x;
            if (align === "right") {
              _x -= lineWidth;
            } else if (align === "center") {
              _x -= lineWidth / 2;
            }
            if (style.strikethrough) {
              ctx.fillRect(_x, y + textLineHeight / 2, lineWidth, 2.6 * thinLineWidth);
            }
            if (style.underline) {
              ctx.fillRect(_x, y + textLineHeight + 1, lineWidth, 1.3 * thinLineWidth);
            }
          }
          y += MIN_CELL_TEXT_MARGIN + textLineHeight;
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
        if (box.image.clipIcon) {
          ctx.save();
          ctx.beginPath();
          const { x, y, width, height } = box.image.clipIcon;
          ctx.rect(x, y, width, height);
          ctx.clip();
        }

        const iconSize = box.image.size;
        const y = this.computeTextYCoordinate(box, iconSize);
        ctx.drawImage(icon, box.x + MIN_CF_ICON_MARGIN, y, iconSize, iconSize);
        if (box.image.clipIcon) {
          ctx.restore();
        }
      }
    }
  }

  /** Compute the vertical start point from which a text line should be draw.
   *
   * Note that in case the cell does not have enough spaces to display its text lines,
   * (wrapping cell case) then the vertical align should be at the top.
   * */
  private computeTextYCoordinate(box: Box, textLineHeight: number, numberOfLines: number = 1) {
    const y = box.y + 1;
    const textHeight = computeTextLinesHeight(textLineHeight, numberOfLines);
    const hasEnoughSpaces = box.height > textHeight + MIN_CELL_TEXT_MARGIN * 2;
    const verticalAlign = box.verticalAlign || "middle";

    if (hasEnoughSpaces) {
      if (verticalAlign === "middle") {
        return y + (box.height - textHeight) / 2;
      }
      if (verticalAlign === "bottom") {
        return y + box.height - textHeight - MIN_CELL_TEXT_MARGIN;
      }
    }
    return y + MIN_CELL_TEXT_MARGIN;
  }

  private drawHeaders(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;
    const visibleCols = this.getters.getSheetViewVisibleCols();
    const left = visibleCols[0];
    const right = visibleCols[visibleCols.length - 1];
    const visibleRows = this.getters.getSheetViewVisibleRows();
    const top = visibleRows[0];
    const bottom = visibleRows[visibleRows.length - 1];
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
    for (let col = left; col <= right; col++) {
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
    for (let row = top; row <= bottom; row++) {
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
    for (const i of visibleCols) {
      const colSize = this.getters.getColSize(sheetId, i);
      const colName = numberToLetters(i);
      ctx.fillStyle = activeCols.has(i) ? "#fff" : TEXT_HEADER_COLOR;
      let colStart = this.getHeaderOffset("COL", left, i);
      ctx.fillText(colName, colStart + colSize / 2, HEADER_HEIGHT / 2);
      ctx.moveTo(colStart + colSize, 0);
      ctx.lineTo(colStart + colSize, HEADER_HEIGHT);
    }
    // row text + separator
    for (const i of visibleRows) {
      const rowSize = this.getters.getRowSize(sheetId, i);
      ctx.fillStyle = activeRows.has(i) ? "#fff" : TEXT_HEADER_COLOR;

      let rowStart = this.getHeaderOffset("ROW", top, i);
      ctx.fillText(String(i + 1), HEADER_WIDTH / 2, rowStart + rowSize / 2);
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

  private findNextEmptyCol(base: HeaderIndex, max: HeaderIndex, row: HeaderIndex): HeaderIndex {
    const sheetId = this.getters.getActiveSheetId();
    let col: HeaderIndex = base;
    while (col < max) {
      const position = { sheetId, col: col + 1, row };
      const nextCell = this.getters.getEvaluatedCell(position);
      const nextCellBorder = this.getters.getCellBorderWithFilterBorder(position);
      if (
        nextCell.type !== CellValueType.empty ||
        this.getters.isInMerge(position) ||
        nextCellBorder?.left
      ) {
        return col;
      }
      col++;
    }
    return col;
  }

  private findPreviousEmptyCol(base: HeaderIndex, min: HeaderIndex, row: HeaderIndex): HeaderIndex {
    const sheetId = this.getters.getActiveSheetId();
    let col: HeaderIndex = base;
    while (col > min) {
      const position = { sheetId, col: col - 1, row };
      const previousCell = this.getters.getEvaluatedCell(position);
      const previousCellBorder = this.getters.getCellBorderWithFilterBorder(position);
      if (
        previousCell.type !== CellValueType.empty ||
        this.getters.isInMerge(position) ||
        previousCellBorder?.right
      ) {
        return col;
      }
      col--;
    }
    return col;
  }

  private computeCellAlignment(position: CellPosition, isOverflowing: boolean): Align {
    const cell = this.getters.getCell(position);
    if (cell?.isFormula && this.getters.shouldShowFormulas()) {
      return "left";
    }
    const { align } = this.getters.getCellStyle(position);
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    if (isOverflowing && evaluatedCell.type === CellValueType.number) {
      return align !== "center" ? "left" : align;
    }
    return align || evaluatedCell.defaultAlign;
  }

  private createZoneBox(sheetId: UID, zone: Zone): Box {
    const visibleCols = this.getters.getSheetViewVisibleCols();
    const left = visibleCols[0];
    const right = visibleCols[visibleCols.length - 1];
    const col: HeaderIndex = zone.left;
    const row: HeaderIndex = zone.top;
    const position = { sheetId, col, row };
    const cell = this.getters.getEvaluatedCell(position);
    const showFormula = this.getters.shouldShowFormulas();
    const { x, y, width, height } = this.getters.getVisibleRect(zone);
    const { verticalAlign } = this.getters.getCellStyle(position);

    const box: Box = {
      x,
      y,
      width,
      height,
      border: this.getters.getCellBorderWithFilterBorder(position) || undefined,
      style: this.getters.getCellComputedStyle(position),
      verticalAlign,
    };

    if (cell.type === CellValueType.empty) {
      return box;
    }
    /** Icon CF */
    const cfIcon = this.getters.getConditionalIcon(position);
    const fontSizePX = computeTextFontSizeInPixels(box.style);
    const iconBoxWidth = cfIcon ? MIN_CF_ICON_MARGIN + fontSizePX : 0;
    if (cfIcon) {
      box.image = {
        type: "icon",
        size: fontSizePX,
        clipIcon: { x: box.x, y: box.y, width: Math.min(iconBoxWidth, width), height },
        image: ICONS[cfIcon].img,
      };
    }

    /** Filter Header */
    box.isFilterHeader = this.getters.isFilterHeader(position);
    const headerIconWidth = box.isFilterHeader ? FILTER_ICON_EDGE_LENGTH + FILTER_ICON_MARGIN : 0;

    /** Content */
    const style = this.getters.getCellComputedStyle(position);
    const wrapping = style.wrapping || "overflow";
    const maxWidth =
      wrapping === "wrap" && !showFormula ? width - 2 * MIN_CELL_TEXT_MARGIN : undefined;
    const multiLineText = this.getters.getCellMultiLineText(position, maxWidth);
    const textWidth = Math.max(
      ...multiLineText.map((line) => this.getters.getTextWidth(line, style) + MIN_CELL_TEXT_MARGIN)
    );

    const contentWidth = iconBoxWidth + textWidth + headerIconWidth;
    const align = this.computeCellAlignment(position, contentWidth > width);
    box.content = {
      textLines: multiLineText,
      width: wrapping === "overflow" ? textWidth : width,
      align,
    };

    /** Error */
    if (cell.type === CellValueType.error && cell.error.logLevel > CellErrorLevel.silent) {
      box.error = cell.error.message;
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

      const isCellInMerge = this.getters.isInMerge(position);
      if (isCellInMerge) {
        // Always clip merges
        nextColIndex = this.getters.getMerge(position)!.right;
        previousColIndex = col;
      } else {
        nextColIndex = this.findNextEmptyCol(col, right, row);
        previousColIndex = this.findPreviousEmptyCol(col, left, row);
        box.isOverflow = true;
      }

      switch (align) {
        case "left": {
          const emptyZoneOnTheLeft = positionToZone({ col: nextColIndex, row });
          const { x, y, width, height } = this.getters.getVisibleRect(
            union(zone, emptyZoneOnTheLeft)
          );
          if (width < contentWidth || fontSizePX > height || multiLineText.length > 1) {
            box.clipRect = { x, y, width, height };
          }
          break;
        }
        case "right": {
          const emptyZoneOnTheRight = positionToZone({ col: previousColIndex, row });
          const { x, y, width, height } = this.getters.getVisibleRect(
            union(zone, emptyZoneOnTheRight)
          );
          if (width < contentWidth || fontSizePX > height || multiLineText.length > 1) {
            box.clipRect = { x, y, width, height };
          }
          break;
        }
        case "center": {
          const emptyZone = {
            ...zone,
            left: previousColIndex,
            right: nextColIndex,
          };
          const { x, y, height, width } = this.getters.getVisibleRect(emptyZone);
          const halfContentWidth = contentWidth / 2;
          const boxMiddle = box.x + box.width / 2;
          if (
            x + width < boxMiddle + halfContentWidth ||
            x > boxMiddle - halfContentWidth ||
            fontSizePX > height ||
            multiLineText.length > 1
          ) {
            const clipX = x > boxMiddle - halfContentWidth ? x : boxMiddle - halfContentWidth;
            const clipWidth = x + width - clipX;
            box.clipRect = { x: clipX, y, width: clipWidth, height };
          }
          break;
        }
      }
    } else if (wrapping === "clip" || wrapping === "wrap" || multiLineText.length > 1) {
      box.clipRect = {
        x: box.x,
        y: box.y,
        width,
        height,
      };
    }

    return box;
  }

  private getGridBoxes(): Box[] {
    const boxes: Box[] = [];

    const visibleCols = this.getters.getSheetViewVisibleCols();
    const left = visibleCols[0];
    const right = visibleCols[visibleCols.length - 1];
    const visibleRows = this.getters.getSheetViewVisibleRows();
    const top = visibleRows[0];
    const bottom = visibleRows[visibleRows.length - 1];
    const viewport = { left, right, top, bottom };
    const sheetId = this.getters.getActiveSheetId();

    for (const row of visibleRows) {
      for (const col of visibleCols) {
        const position = { sheetId, col, row };
        if (this.getters.isInMerge(position)) {
          continue;
        }
        boxes.push(this.createZoneBox(sheetId, positionToZone(position)));
      }
    }
    for (const merge of this.getters.getMerges(sheetId)) {
      if (this.getters.isMergeHidden(sheetId, merge)) {
        continue;
      }
      if (overlap(merge, viewport)) {
        const box = this.createZoneBox(sheetId, merge);
        const borderBottomRight = this.getters.getCellBorder({
          sheetId,
          col: merge.right,
          row: merge.bottom,
        });
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
