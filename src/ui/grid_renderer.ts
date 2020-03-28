import {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  HEADER_HEIGHT,
  HEADER_WIDTH
} from "../constants";
import { fontSizeMap } from "../fonts";
import { Box, Rect, UI, Viewport, Zone } from "../types/index";

let dpr = window.devicePixelRatio || 1;
let thinLineWidth = 0.4 * dpr;

export function drawGrid(ctx: CanvasRenderingContext2D, state: UI, viewport: Viewport) {
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
  drawSelection(ctx, state);
  drawHeader(ctx, state, viewport);
  drawActiveZone(ctx, state);
}

function drawBackgroundGrid(ctx: CanvasRenderingContext2D, state: UI, viewport: Viewport) {
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
        }
        ctx.fillRect(x, y, box.textWidth, 2.6 * thinLineWidth);
      }
      if (box.clipRect) {
        ctx.restore();
      }
    }
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, state: UI) {
  const { selection } = state;
  const { zones } = selection;
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

function drawHeader(ctx: CanvasRenderingContext2D, state: UI, viewportState: Viewport) {
  const { activeCols, activeRows } = viewportState;
  const { selection, viewport, width, height, cols, rows, offsetX, offsetY } = state;
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
  for (let zone of selection.zones) {
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
