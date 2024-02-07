import { HIGHLIGHT_COLOR } from "../constants";
import { GridRenderingContext, Highlight, Rect } from "../types";
import { setColorAlpha } from "./color";

export function drawHighlight(
  renderingContext: GridRenderingContext,
  highlight: Highlight,
  rect: Rect
) {
  const { x, y, width, height } = rect;
  if (width < 0 || height < 0) {
    return;
  }
  const color = highlight.color || HIGHLIGHT_COLOR;

  const { ctx } = renderingContext;
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  /** + 0.5 offset to have sharp lines. See comment in {@link RendererPlugin#drawBorders} for more details */
  ctx.strokeRect(x + 0.5, y + 0.5, width, height);
  ctx.globalCompositeOperation = "source-over";
  if (!highlight.noFill) {
    ctx.fillStyle = setColorAlpha(color, highlight.fillAlpha ?? 0.12);
    ctx.fillRect(x, y, width, height);
  }
}
