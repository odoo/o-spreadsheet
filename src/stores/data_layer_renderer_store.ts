import { getPath2D } from "../components/icons/icons";
import { HoveredTableStore } from "../components/tables/hovered_table_store";
import { CANVAS_SHIFT, MIN_CELL_TEXT_MARGIN } from "../constants";
import { blendColors, toHex } from "../helpers/color";
import { formatHasRepeatedChar } from "../helpers/format/format";
import {
  computeTextFont,
  computeTextFontSizeInPixels,
  computeTextLinesHeight,
  drawDecoratedText,
} from "../helpers/text_helper";
import { positionToZone, zoneToXc } from "../helpers/zones";
import { DisposableStore } from "../store_engine/store";
import { CellValueType } from "../types/cells";
import { RenderingGetters } from "../types/getters";
import { Align, CellPosition, HeaderIndex, Pixel, UID, Zone } from "../types/misc";
import { Box, Rect } from "../types/rendering";
import { Get, Store } from "../types/store_engine";
import { ModelStore } from "./model_store";

/**
 * Given a pixel position (x, y) relative to the rect origin, returns the
 * CellPosition within the zone, or undefined if outside.
 */
const DATA_LAYER_PADDING = 8;

export function getDataLayerCellPosition(
  getters: RenderingGetters,
  sheetId: UID,
  zone: Zone,
  rect: Rect,
  x: Pixel,
  y: Pixel
): CellPosition | undefined {
  const paddedRect = {
    x: rect.x + DATA_LAYER_PADDING,
    y: rect.y,
    width: rect.width - DATA_LAYER_PADDING * 2,
    height: rect.height - DATA_LAYER_PADDING,
  };
  const originX = getters.getColDimensions(sheetId, zone.left).start;
  const originY = getters.getRowDimensions(sheetId, zone.top).start;

  let col: HeaderIndex | undefined;
  for (let c = zone.left; c <= zone.right; c++) {
    if (getters.isHeaderHidden(sheetId, "COL", c)) {
      continue;
    }
    const dim = getters.getColDimensions(sheetId, c);
    const cellX = paddedRect.x + (dim.start - originX);
    if (x >= cellX && x < cellX + dim.size) {
      col = c;
      break;
    }
  }

  let row: HeaderIndex | undefined;
  for (let r = zone.top; r <= zone.bottom; r++) {
    if (getters.isHeaderHidden(sheetId, "ROW", r)) {
      continue;
    }
    const dim = getters.getRowDimensions(sheetId, r);
    const cellY = paddedRect.y + (dim.start - originY);
    if (y >= cellY && y < cellY + dim.size) {
      row = r;
      break;
    }
  }

  if (col === undefined || row === undefined) {
    return undefined;
  }
  return { sheetId, col, row };
}

/**
 * DataLayerRenderer renders a range of cells from any sheet into a given
 * rectangular area (typically inside a carousel figure).
 *
 * It reuses the same Box-based drawing approach as GridRenderer but without
 * animations, selection, hover, or viewport dependencies.
 */
export class DataLayerRenderer extends DisposableStore {
  mutators = ["render"] as const;

  private getters: RenderingGetters;
  private hoveredTables: Store<HoveredTableStore>;

  constructor(get: Get) {
    super(get);
    this.getters = get(ModelStore).getters;
    this.hoveredTables = get(HoveredTableStore);
  }

  /**
   * Render cells from `zone` on `sheetId` into the given `rect` on the canvas.
   */
  render(
    ctx: CanvasRenderingContext2D,
    sheetId: UID,
    zone: Zone,
    rect: Rect,
    options?: { paddingBackground?: string; hideGridLines?: boolean; hideFilterIcons?: boolean }
  ) {
    const paddedRect = {
      x: rect.x + DATA_LAYER_PADDING,
      y: rect.y,
      width: rect.width - DATA_LAYER_PADDING * 2,
      height: rect.height - DATA_LAYER_PADDING,
    };

    ctx.save();

    // Fill padding area with the header background
    if (options?.paddingBackground) {
      ctx.fillStyle = options.paddingBackground;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    ctx.beginPath();
    ctx.rect(paddedRect.x, paddedRect.y, paddedRect.width, paddedRect.height);
    ctx.clip();

    // Fill background
    const backgroundColor = this.getters.getSpreadsheetTheme().backgroundColor;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    const boxes = this.getBoxesForZone(sheetId, zone, paddedRect, options?.hideFilterIcons);
    if (!options?.hideGridLines) {
      this.drawGridLines(ctx, boxes, sheetId);
    }
    this.drawCellBackgrounds(ctx, boxes);
    this.drawBorders(ctx, boxes);
    this.drawTexts(ctx, boxes);
    this.drawIcons(ctx, boxes);

    ctx.restore();
  }

  private getBoxesForZone(sheetId: UID, zone: Zone, rect: Rect, hideFilterIcons?: boolean): Box[] {
    const boxes: Box[] = [];

    // Compute origin offset: the position of zone.left/zone.top in absolute sheet coords
    const originX = this.getters.getColDimensions(sheetId, zone.left).start;
    const originY = this.getters.getRowDimensions(sheetId, zone.top).start;

    for (let row = zone.top; row <= zone.bottom; row++) {
      if (this.getters.isHeaderHidden(sheetId, "ROW", row)) {
        continue;
      }
      for (let col = zone.left; col <= zone.right; col++) {
        if (this.getters.isHeaderHidden(sheetId, "COL", col)) {
          continue;
        }
        const position = { sheetId, col, row };
        if (this.getters.isInMerge(position)) {
          const merge = this.getters.getMerge(position);
          if (merge && (merge.left !== col || merge.top !== row)) {
            continue; // skip non-top-left cells of a merge
          }
        }
        const cellZone = this.getters.isInMerge(position)
          ? this.getters.getMerge(position)!
          : positionToZone(position);

        const box = this.createBox(
          sheetId,
          cellZone,
          zone,
          originX,
          originY,
          rect,
          hideFilterIcons
        );
        if (box) {
          boxes.push(box);
        }
      }
    }
    return boxes;
  }

  private createBox(
    sheetId: UID,
    cellZone: Zone,
    viewportZone: Zone,
    originX: Pixel,
    originY: Pixel,
    rect: Rect,
    hideFilterIcons?: boolean
  ): Box | undefined {
    const col = cellZone.left;
    const row = cellZone.top;
    const position: CellPosition = { sheetId, col, row };
    const cell = this.getters.getEvaluatedCell(position);

    // Compute cell rect relative to figure rect
    const colDim = this.getters.getColDimensions(sheetId, col);
    const rowDim = this.getters.getRowDimensions(sheetId, row);

    let width = colDim.size;
    let height = rowDim.size;

    // For merged cells, sum the dimensions
    if (cellZone.right > cellZone.left || cellZone.bottom > cellZone.top) {
      const endColDim = this.getters.getColDimensions(sheetId, cellZone.right);
      const endRowDim = this.getters.getRowDimensions(sheetId, cellZone.bottom);
      width = endColDim.end - colDim.start;
      height = endRowDim.end - rowDim.start;
    }

    const x = rect.x + (colDim.start - originX);
    const y = rect.y + (rowDim.start - originY);

    const style = this.getters.getCellComputedStyle(position);
    const border = this.getters.getCellComputedBorder(position) || undefined;
    const dataBarFill = this.getters.getConditionalDataBar(position);
    let iconsList = this.getters.getCellIcons(position);
    if (hideFilterIcons) {
      iconsList = iconsList.filter((icon) => icon?.type !== "filter_icon");
    }
    const cellIcons = {
      left: iconsList.find((icon) => icon?.horizontalAlign === "left"),
      right: iconsList.find((icon) => icon?.horizontalAlign === "right"),
      center: iconsList.find((icon) => icon?.horizontalAlign === "center"),
    };

    const box: Box = {
      id: zoneToXc(cellZone),
      x,
      y,
      width,
      height,
      border,
      style,
      dataBarFill,
      overlayColor: this.hoveredTables.overlayColors.get(position),
      isError:
        (cell.type === CellValueType.error && !!cell.message) ||
        this.getters.isDataValidationInvalid(position),
      icons: cellIcons,
    };

    if (cell.type === CellValueType.empty || box.icons.center) {
      return box;
    }

    // Content
    const fontSizePX = computeTextFontSizeInPixels(box.style);
    const wrapping = style.wrapping || "overflow";
    const wrapText = wrapping === "wrap";
    const leftIconWidth = box.icons.left ? box.icons.left.size + box.icons.left.margin : 0;
    const rightIconWidth = box.icons.right ? box.icons.right.size + box.icons.right.margin : 0;
    const availableWidth = width - 2 * MIN_CELL_TEXT_MARGIN;
    const maxWidth = style.align ? 0 : availableWidth;
    const wrapWidth = wrapText ? availableWidth : undefined;
    const multiLineText = this.getters.getCellMultiLineText(position, {
      maxWidth,
      wrapWidth,
    });

    const noRotationStyle = { ...style, align: "left" as const, rotation: 0 };
    const textWidth =
      Math.max(...multiLineText.map((line) => this.getters.getTextWidth(line, noRotationStyle))) +
      MIN_CELL_TEXT_MARGIN;
    const contentSize = this.getters.getMultilineTextSize(multiLineText, style);
    const contentWidth = leftIconWidth + contentSize.width + rightIconWidth + MIN_CELL_TEXT_MARGIN;
    const align = this.computeCellAlignment(position, contentWidth > width);

    const numberOfLines = multiLineText.length;
    const contentY = Math.round(
      this.getters.computeTextYCoordinate(box, fontSizePX, style.verticalAlign, numberOfLines)
    );

    let contentX = box.x;
    if (align === "left") {
      contentX += MIN_CELL_TEXT_MARGIN + leftIconWidth;
    } else if (align === "right") {
      contentX += box.width - MIN_CELL_TEXT_MARGIN - rightIconWidth;
    } else {
      contentX += box.width / 2;
    }
    contentX = Math.round(contentX);

    const textHeight = computeTextLinesHeight(fontSizePX, numberOfLines);
    box.content = {
      textLines: multiLineText,
      width: wrapping === "overflow" ? textWidth : width,
      textHeight,
      textWidth,
      align,
      x: contentX,
      y: contentY,
      fontSizePx: fontSizePX,
    };

    // Clip if content overflows
    const isOverflowing = contentWidth > width || contentSize.height > height;
    if (box.icons.left || box.icons.right) {
      box.clipRect = {
        x: box.x + leftIconWidth,
        y: box.y,
        width: Math.max(0, width - leftIconWidth - rightIconWidth),
        height,
      };
    } else if (
      isOverflowing ||
      wrapping === "clip" ||
      wrapping === "wrap" ||
      multiLineText.length > 1
    ) {
      box.clipRect = { x: box.x, y: box.y, width, height };
    }

    return box;
  }

  private computeCellAlignment(position: CellPosition, isOverflowing: boolean): Align {
    const cell = this.getters.getCell(position);
    if (cell?.isFormula && this.getters.shouldShowFormulas()) {
      return "left";
    }
    const { align } = this.getters.getCellStyle(position);
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    if (!align && formatHasRepeatedChar(evaluatedCell.value, evaluatedCell.format)) {
      return "left";
    }
    if (isOverflowing && evaluatedCell.type === CellValueType.number) {
      return align !== "center" ? "left" : align;
    }
    return align || evaluatedCell.defaultAlign;
  }

  private drawGridLines(ctx: CanvasRenderingContext2D, boxes: Box[], sheetId: UID) {
    const areGridLinesVisible = this.getters.getGridLinesVisibility(sheetId);
    if (!areGridLinesVisible) {
      return;
    }
    const theme = this.getters.getSpreadsheetTheme();
    ctx.strokeStyle = theme.gridBorderColor;
    ctx.lineWidth = 0.4;
    const inset = 0.04;
    for (const box of boxes) {
      if (box.style.hideGridLines) {
        continue;
      }
      ctx.strokeRect(box.x + inset, box.y + inset, box.width - 2 * inset, box.height - 2 * inset);
    }
  }

  private drawCellBackgrounds(ctx: CanvasRenderingContext2D, boxes: Box[]) {
    for (const box of boxes) {
      const fillColor = toHex(box.style.fillColor || "#ffffff");
      if (fillColor !== "#FFFFFF" || box.overlayColor) {
        ctx.fillStyle = box.overlayColor ? blendColors(fillColor, box.overlayColor) : fillColor;
        ctx.fillRect(
          box.x - CANVAS_SHIFT,
          box.y - CANVAS_SHIFT,
          box.width + CANVAS_SHIFT * 2,
          box.height + CANVAS_SHIFT * 2
        );
      }
      if (box.dataBarFill && !box.overlayColor) {
        ctx.fillStyle = box.dataBarFill.color;
        const percentage = box.dataBarFill.percentage;
        const barWidth = box.width * (percentage / 100);
        ctx.fillRect(box.x, box.y, barWidth, box.height);
      }
    }
  }

  private drawBorders(ctx: CanvasRenderingContext2D, boxes: Box[]) {
    for (const box of boxes) {
      const border = box.border;
      if (!border) {
        continue;
      }
      const { x, y, width, height } = box;
      if (border.left) {
        ctx.strokeStyle = border.left.color;
        ctx.lineWidth = border.left.style === "medium" ? 2 : border.left.style === "thick" ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + height);
        ctx.stroke();
      }
      if (border.top) {
        ctx.strokeStyle = border.top.color;
        ctx.lineWidth = border.top.style === "medium" ? 2 : border.top.style === "thick" ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();
      }
      if (border.right) {
        ctx.strokeStyle = border.right.color;
        ctx.lineWidth =
          border.right.style === "medium" ? 2 : border.right.style === "thick" ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(x + width, y);
        ctx.lineTo(x + width, y + height);
        ctx.stroke();
      }
      if (border.bottom) {
        ctx.strokeStyle = border.bottom.color;
        ctx.lineWidth =
          border.bottom.style === "medium" ? 2 : border.bottom.style === "thick" ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.stroke();
      }
    }
  }

  private drawTexts(ctx: CanvasRenderingContext2D, boxes: Box[]) {
    ctx.textBaseline = "top";
    let currentFont: string | undefined;
    for (const box of boxes) {
      if (!box.content) {
        continue;
      }
      const align = box.content.align || "left";
      const style = { ...box.style, align, rotation: 0 };

      const font = computeTextFont(style);
      if (font !== currentFont) {
        currentFont = font;
        ctx.font = font;
      }
      ctx.fillStyle = style.textColor || "#000";
      ctx.textAlign = align;

      if (box.clipRect) {
        ctx.save();
        ctx.beginPath();
        const { x, y, width, height } = box.clipRect;
        ctx.rect(x, y, width, height);
        ctx.clip();
      }

      const x = box.content.x;
      let y = box.content.y;
      for (const brokenLine of box.content.textLines) {
        drawDecoratedText(ctx, brokenLine, { x, y }, style.underline, style.strikethrough);
        y += MIN_CELL_TEXT_MARGIN + box.content.fontSizePx;
      }

      if (box.clipRect) {
        ctx.restore();
      }
    }
  }

  private drawIcons(ctx: CanvasRenderingContext2D, boxes: Box[]) {
    for (const box of boxes) {
      for (const icon of Object.values(box.icons)) {
        if (!icon) {
          continue;
        }
        const svg = icon.svg;
        if (!svg) {
          continue;
        }
        ctx.save();
        ctx.globalAlpha = icon.opacity ?? 1;
        ctx.beginPath();
        const clipRect = icon.clipRect || box;
        ctx.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
        ctx.clip();

        const iconSize = icon.size;
        const { x, y } = this.getters.getCellIconRect(icon, box);
        ctx.translate(x, y);
        ctx.scale(iconSize / svg.width, iconSize / svg.height);
        for (const path of svg.paths) {
          ctx.fillStyle = path.fillColor;
          ctx.fill(getPath2D(path.path));
        }
        ctx.restore();
      }
    }
  }
}
