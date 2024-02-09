import { Color, Rect, RectBorder } from "../types";

export function drawRectBorders(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  borders: RectBorder[],
  lineWidth: number,
  color: Color
) {
  ctx.save();
  /**
   * Reset the transformation applied in draw_grid_hook, and re-apply the scaling without the translation
   * The translation makes the following computation more complex.
   *
   * TODO
   * The final goal would be to remove the translation from draw_grid_hook, as it is wrong ATM. It applies a translation
   * in both directions, but to draw a sharp line we need to apply a translation only in one direction (and only if the
   * line have an odd with).
   */
  ctx.resetTransform();
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;

  // /** + 0.5 offset to have sharp lines. See comment in {@link RendererPlugin#drawBorders} for more details */
  const offset = lineWidth % 2 === 1 ? -0.5 : 0;

  const { x, y, width, height } = rect;
  ctx.beginPath();
  if (borders.includes("top")) {
    const startOffset = borders.includes("left") ? Math.ceil(lineWidth / 2) : 0;
    ctx.moveTo(x - startOffset, y + offset);
    const endOffset = borders.includes("right") ? Math.floor(lineWidth / 2) : 0;
    ctx.lineTo(x + width + endOffset, y + offset);
  }
  if (borders.includes("right")) {
    ctx.moveTo(x + width + offset, y);
    ctx.lineTo(x + width + offset, y + height);
  }
  if (borders.includes("bottom")) {
    const startOffset = borders.includes("left") ? Math.ceil(lineWidth / 2) : 0;
    ctx.moveTo(x - startOffset, y + height + offset);
    const endOffset = borders.includes("right") ? Math.floor(lineWidth / 2) : 0;
    ctx.lineTo(x + width + endOffset, y + height + offset);
  }
  if (borders.includes("left")) {
    ctx.moveTo(x + offset, y);
    ctx.lineTo(x + offset, y + height);
  }
  ctx.stroke();

  ctx.restore();
}
