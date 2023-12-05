import { GridRenderingContext, Highlight, Rect } from "../types";

export function drawHighlight(
  renderingContext: GridRenderingContext,
  highlight: Highlight,
  rect: Rect
) {
  const { x, y, width, height } = rect;
  if (width < 0 || height < 0) {
    return;
  }

  const { ctx } = renderingContext;
  ctx.strokeStyle = highlight.color;
  /** + 0.5 offset to have sharp lines. See comment in {@link RendererPlugin#drawBorders} for more details */
  ctx.strokeRect(x + 0.5, y + 0.5, width, height);
  ctx.globalCompositeOperation = "source-over";
  if (!highlight.noFill) {
    ctx.fillStyle = highlight.color! + "20";
    ctx.fillRect(x, y, width, height);
  }
}
