import { GridRenderingContext, Highlight, Rect } from "../types";

import { HIGHLIGHT_COLOR } from "../constants";
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
  if (!highlight.noBorder) {
    ctx.strokeStyle = color;
    if (highlight.thinLine) {
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    } else {
      ctx.lineWidth = 2;
      /** + 0.5 offset to have sharp lines. See comment in {@link RendererPlugin#drawBorder} for more details */
      ctx.strokeRect(x + 0.5, y + 0.5, width, height);
    }
  }
  if (!highlight.noFill) {
    ctx.fillStyle = setColorAlpha(color, highlight.fillAlpha ?? 0.12);
    ctx.fillRect(x, y, width, height);
  }
}
