import { getPath2D } from "../components/icons/icons";
import {
  CANVAS_SHIFT,
  DEFAULT_FONT,
  HEADER_FONT_SIZE,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MIN_CELL_TEXT_MARGIN,
} from "../constants";
import { Pixel } from "../types/misc";
import { BorderDescrWithOpacity, Box, GridRenderingContext } from "../types/rendering";
import { blendColors, toHex } from "./color";
import { numberToLetters } from "./coordinates";
import { computeRotationPosition, computeTextFont, drawDecoratedText } from "./text_helper";
import { getZonesCols, getZonesRows } from "./zones";

export function drawGlobalBackground(renderingContext: GridRenderingContext) {
  const { ctx, viewports } = renderingContext;
  const { width, height } = viewports.getSheetViewDimensionWithHeaders();

  // white background
  ctx.fillStyle = renderingContext.theme.backgroundColor;
  ctx.fillRect(0, 0, width + CANVAS_SHIFT, height + CANVAS_SHIFT);
}

export function drawBackground(renderingContext: GridRenderingContext, boxes: Box[]) {
  const { ctx, thinLineWidth } = renderingContext;

  const areGridLinesVisible = !renderingContext.hideGridLines;
  const inset = areGridLinesVisible ? 0.1 * thinLineWidth : 0;

  if (areGridLinesVisible) {
    const theme = renderingContext.theme;
    ctx.strokeStyle = theme.gridBorderColor;
    for (const box of boxes) {
      if (box.style.hideGridLines) {
        continue;
      }
      ctx.lineWidth = thinLineWidth;
      ctx.strokeRect(box.x + inset, box.y + inset, box.width - 2 * inset, box.height - 2 * inset);
    }
  }
}

export function drawCellBackground(renderingContext: GridRenderingContext, boxes: Box[]) {
  const { ctx } = renderingContext;
  for (const box of boxes) {
    const style = box.style;
    const fillColor = toHex(style.fillColor || "#ffffff");
    if (fillColor !== "#FFFFFF") {
      ctx.fillStyle = fillColor;
      // We shift the canvas by CANVAS_SHIFT to avoid blurry lines (lines are drawn between pixels), but fillRect
      // are drawn at the exact pixel position, so we need to compensate this shift here. We also want to extend
      // the fill by 1px to draw over the gridLines.
      ctx.fillRect(
        box.x - CANVAS_SHIFT,
        box.y - CANVAS_SHIFT,
        box.width + CANVAS_SHIFT * 2,
        box.height + CANVAS_SHIFT * 2
      );
    }
    if (box.dataBarFill) {
      ctx.fillStyle = box.dataBarFill.color;
      const percentage = box.dataBarFill.percentage;
      const width = box.width * (percentage / 100);
      ctx.fillRect(box.x, box.y, width, box.height);
    }
    if (box.overlayColor) {
      ctx.fillStyle = blendColors(fillColor, box.overlayColor);
      ctx.fillRect(
        box.x - CANVAS_SHIFT,
        box.y - CANVAS_SHIFT,
        box.width + CANVAS_SHIFT * 2,
        box.height + CANVAS_SHIFT * 2
      );
    }
    if (box?.chip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.width, box.height);
      ctx.clip();
      const chip = box.chip;
      ctx.fillStyle = box.overlayColor ? blendColors(chip.color, box.overlayColor) : chip.color;
      const radius = 10;
      ctx.beginPath();
      ctx.roundRect(chip.x, chip.y, chip.width, chip.height, radius);
      ctx.fill();
      ctx.restore();
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

export function drawOverflowingCellBackground(
  renderingContext: GridRenderingContext,
  boxes: Box[]
) {
  const { ctx, thinLineWidth } = renderingContext;
  for (const box of boxes) {
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
        x = (box.clipRect?.x || box.x + box.width / 2 - box.content.width / 2) + thinLineWidth / 2;
        width = clipWidth - 2 * thinLineWidth;
      }
      ctx.fillStyle = renderingContext.theme.backgroundColor;
      ctx.fillRect(x, y, width, height);
    }
  }
}

export function drawBorders(renderingContext: GridRenderingContext, boxes: Box[]) {
  const { ctx } = renderingContext;
  for (const box of boxes) {
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

  /**
   * Following https://usefulangle.com/post/17/html5-canvas-drawing-1px-crisp-straight-lines,
   * we need to make sure that a "single" pixel line is drawn on a "half" pixel coordinate,
   * while a "double" pixel line is drawn on a "full" pixel coordinate. As, in the rendering
   * process, we always had 0.5 before rendering line (to make sure it is drawn on a "half"
   * pixel), we need to correct this behavior for the "medium" and the "dotted" styles, as
   * they are drawing a two pixels width line.
   * We also adapt here the coordinates of the line to make sure corner are correctly drawn,
   * avoiding a "round corners" effect. This is done by subtracting 1 pixel to the origin of
   * each line and adding 1 pixel to the end of each line (depending on the direction of the
   * line).
   */
  function drawBorder(
    { color, style, opacity }: BorderDescrWithOpacity,
    x1: Pixel,
    y1: Pixel,
    x2: Pixel,
    y2: Pixel
  ) {
    ctx.globalAlpha = opacity ?? 1;
    ctx.strokeStyle = color;
    switch (style) {
      case "medium":
        ctx.lineWidth = 2;
        x1 += y1 === y2 ? -0.5 : 0.5;
        x2 += y1 === y2 ? 1.5 : 0.5;
        y1 += x1 === x2 ? -0.5 : 0.5;
        y2 += x1 === x2 ? 1.5 : 0.5;
        break;
      case "thick":
        ctx.lineWidth = 3;
        if (y1 === y2) {
          x1--;
          x2++;
        }
        if (x1 === x2) {
          y1--;
          y2++;
        }
        break;
      case "dashed":
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 3]);
        break;
      case "dotted":
        ctx.lineWidth = 1;
        if (y1 === y2) {
          x1 += 0.5;
          x2 += 0.5;
        }
        if (x1 === x2) {
          y1 += 0.5;
          y2 += 0.5;
        }
        ctx.setLineDash([1, 1]);
        break;
      case "thin":
      default:
        ctx.lineWidth = 1;
        break;
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

export function drawTexts(renderingContext: GridRenderingContext, boxes: Box[]) {
  const { ctx } = renderingContext;
  ctx.textBaseline = "top";
  let currentFont;
  for (const box of boxes) {
    if (box.content) {
      ctx.globalAlpha = box.textOpacity ?? 1;
      const align = box.content.align || "left";
      const rotation = box.chip ? 0 : box.style.rotation;
      const style = { ...box.style, align, rotation };

      // compute font and textColor
      const font = computeTextFont(style);
      if (font !== currentFont) {
        currentFont = font;
        ctx.font = font;
      }
      ctx.fillStyle = style.textColor || "#000";

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
      let x = box.content.x;
      let y = box.content.y;
      if (style.rotation) {
        ctx.save();
        ctx.rotate(style.rotation);
        ({ x, y } = computeRotationPosition(box.content, style));
      }

      // use the horizontal and the vertical start points to:
      // fill text / fill strikethrough / fill underline
      for (const brokenLine of box.content.textLines) {
        drawDecoratedText(ctx, brokenLine, { x, y }, style.underline, style.strikethrough);
        y += MIN_CELL_TEXT_MARGIN + box.content.fontSizePx;
      }

      if (style.rotation) {
        ctx.restore();
      }
      if (box.clipRect) {
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }
}

export function drawIcon(renderingContext: GridRenderingContext, boxes: Box[]) {
  const { ctx } = renderingContext;
  for (const box of boxes) {
    for (const icon of Object.values(box.icons)) {
      if (!icon) {
        continue;
      }
      const svg = icon.isHovered ? icon.hoverSvg || icon.svg : icon.svg;
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
      const { x, y } = icon.rect;
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

export function drawHeaders(renderingContext: GridRenderingContext) {
  const { ctx, thinLineWidth, viewports, sheetId } = renderingContext;
  const visibleCols = viewports.getSheetViewVisibleCols(sheetId);
  const left = visibleCols[0];
  const visibleRows = viewports.getSheetViewVisibleRows(sheetId);
  const top = visibleRows[0];
  const { width, height } = viewports.getSheetViewDimensionWithHeaders();
  const selection = renderingContext.selectedZones;
  const selectedCols = getZonesCols(selection);
  const selectedRows = getZonesRows(selection);
  const activeCols = renderingContext.activeCols;
  const activeRows = renderingContext.activeRows;

  const theme = renderingContext.theme;
  ctx.font = `400 ${HEADER_FONT_SIZE}px ${DEFAULT_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = thinLineWidth;
  ctx.strokeStyle = theme.headerTextColor;

  // Columns headers background
  for (const col of visibleCols) {
    const colZone = { left: col, right: col, top: 0, bottom: 1 };
    const { x, width } = viewports.getVisibleRect(sheetId, colZone);
    const isColActive = activeCols.has(col);
    const isColSelected = selectedCols.has(col);
    if (isColActive) {
      ctx.fillStyle = theme.headerActiveBackgroundColor;
    } else if (isColSelected) {
      ctx.fillStyle = theme.headerSelectedBackgroundColor;
    } else {
      ctx.fillStyle = theme.headerBackgroundColor;
    }
    ctx.fillRect(x, 0, width, HEADER_HEIGHT);
  }

  // Rows headers background
  for (const row of visibleRows) {
    const rowZone = { top: row, bottom: row, left: 0, right: 1 };
    const { y, height } = viewports.getVisibleRect(sheetId, rowZone);

    const isRowActive = activeRows.has(row);
    const isRowSelected = selectedRows.has(row);
    if (isRowActive) {
      ctx.fillStyle = theme.headerActiveBackgroundColor;
    } else if (isRowSelected) {
      ctx.fillStyle = theme.headerSelectedBackgroundColor;
    } else {
      ctx.fillStyle = theme.headerBackgroundColor;
    }
    ctx.fillRect(0, y, HEADER_WIDTH, height);
  }

  // 2 main lines
  ctx.beginPath();
  ctx.moveTo(HEADER_WIDTH, 0);
  ctx.lineTo(HEADER_WIDTH, height);
  ctx.moveTo(0, HEADER_HEIGHT);
  ctx.lineTo(width, HEADER_HEIGHT);
  ctx.strokeStyle = theme.headerBorderColor;
  ctx.stroke();

  // column text + separator
  for (const col of visibleCols) {
    const colName = numberToLetters(col);
    ctx.fillStyle = activeCols.has(col) ? "#fff" : theme.headerTextColor;
    const zone = { left: col, right: col, top: top, bottom: top };
    const { x: colStart, width: colSize } = viewports.getRect(sheetId, zone);
    const { x, width } = viewports.getVisibleRect(sheetId, zone);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, width, HEADER_HEIGHT);
    ctx.clip();
    ctx.fillText(colName, colStart + colSize / 2, HEADER_HEIGHT / 2);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(colStart + colSize, 0);
    ctx.lineTo(colStart + colSize, HEADER_HEIGHT);
    ctx.stroke();
  }

  // row text + separator
  for (const row of visibleRows) {
    ctx.fillStyle = activeRows.has(row) ? "#fff" : theme.headerTextColor;
    const zone = { top: row, bottom: row, left: left, right: left };
    const { y: rowStart, height: rowSize } = viewports.getRect(sheetId, zone);
    const { y, height } = viewports.getVisibleRect(sheetId, zone);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, HEADER_WIDTH, height);
    ctx.clip();
    ctx.fillText(String(row + 1), HEADER_WIDTH / 2, rowStart + rowSize / 2);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(0, rowStart + rowSize);
    ctx.lineTo(HEADER_WIDTH, rowStart + rowSize);
    ctx.stroke();
  }
}

export function drawFrozenPanesHeaders(renderingContext: GridRenderingContext) {
  const { ctx, thinLineWidth, sheetId, viewports } = renderingContext;

  const { x: offsetCorrectionX, y: offsetCorrectionY } =
    viewports.getMainViewportCoordinates(sheetId);

  const widthCorrection = viewports.getGridOffsetX();
  const heightCorrection = viewports.getGridOffsetY();
  ctx.lineWidth = 6 * thinLineWidth;
  ctx.strokeStyle = renderingContext.theme.frozenPaneHeaderBorderColor;
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

export function drawFrozenPanes(renderingContext: GridRenderingContext) {
  const { ctx, thinLineWidth, sheetId, viewports } = renderingContext;

  const { x: offsetCorrectionX, y: offsetCorrectionY } =
    viewports.getMainViewportCoordinates(sheetId);

  const visibleCols = viewports.getSheetViewVisibleCols(sheetId);
  const left = visibleCols[0];
  const right = visibleCols[visibleCols.length - 1];
  const visibleRows = viewports.getSheetViewVisibleRows(sheetId);
  const top = visibleRows[0];
  const bottom = visibleRows[visibleRows.length - 1];
  const viewport = { left, right, top, bottom };

  const rect = renderingContext.viewports.getVisibleRect(renderingContext.sheetId, viewport);
  const widthCorrection = viewports.getGridOffsetX();
  const heightCorrection = viewports.getGridOffsetY();
  ctx.lineWidth = 6 * thinLineWidth;
  ctx.strokeStyle = renderingContext.theme.frozenPaneBorderColor;
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
