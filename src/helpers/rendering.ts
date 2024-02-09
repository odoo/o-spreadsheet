import { Border, BorderDescr, Rect } from "../types";

export function drawRectBorders(ctx: CanvasRenderingContext2D, rect: Rect, border: Border) {
  // console.log("drawRectBorders", rect, border);
  ctx.save();

  /**
   * Following https://usefulangle.com/post/17/html5-canvas-drawing-1px-crisp-straight-lines,
   * we need to make sure that a "single" pixel line is drawn on a "half" pixel coordinate,
   * while a "double" pixel line is drawn on a "full" pixel coordinate. As, in the rendering
   * process, we always had 0.5 before rendering line (to make sure it is drawn on a "half"
   * pixel), we need to correct this behavior for the "medium" and the "dotted" styles, as
   * they are drawing a two pixels width line.
   *
   * We also adapt here the coordinates of the line to make sure corner are correctly drawn,
   * avoiding a "round corners" effect. This is done by drawing slightly longer top/bottom borders
   * so they overlap with the left/right borders.
   *
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
  ctx.globalCompositeOperation = "source-over";

  const { x, y, width, height } = rect;
  console.log("drawRectBorders", rect, border);
  if (border.top) {
    ctx.beginPath();
    updateContextForBorder(ctx, border.top);
    const offset = ctx.lineWidth % 2 === 1 ? -0.5 : 0;

    // Draw slightly longer border to cover gap between borders
    const startOffset = border.left ? Math.ceil(ctx.lineWidth / 2) : 0; // ADRM TODO: dotted doens't work with this
    const endOffset = border.right ? Math.floor(ctx.lineWidth / 2) : 0;
    ctx.moveTo(x - startOffset, y + offset);
    ctx.lineTo(x + width + endOffset, y + offset);
    ctx.stroke();
  }
  if (border.right) {
    ctx.beginPath();
    updateContextForBorder(ctx, border.right);
    const offset = ctx.lineWidth % 2 === 1 ? -0.5 : 0;

    ctx.moveTo(x + width + offset, y);
    ctx.lineTo(x + width + offset, y + height);
    ctx.stroke();
  }
  if (border.bottom) {
    ctx.beginPath();
    updateContextForBorder(ctx, border.bottom);
    const offset = ctx.lineWidth % 2 === 1 ? -0.5 : 0;
    const startOffset = border.left ? Math.ceil(ctx.lineWidth / 2) : 0;
    const endOffset = border.right ? Math.floor(ctx.lineWidth / 2) : 0;
    ctx.moveTo(x - startOffset, y + height + offset);
    ctx.lineTo(x + width + endOffset, y + height + offset);
    ctx.stroke();
  }
  if (border.left) {
    ctx.beginPath();
    updateContextForBorder(ctx, border.left);
    const offset = ctx.lineWidth % 2 === 1 ? -0.5 : 0;

    ctx.moveTo(x + offset, y);
    ctx.lineTo(x + offset, y + height);
    ctx.stroke();
  }

  ctx.restore();
}

function updateContextForBorder(ctx: CanvasRenderingContext2D, borderDescr: BorderDescr) {
  ctx.strokeStyle = borderDescr.color;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  switch (borderDescr.style) {
    case "medium":
      ctx.lineWidth = 2;
      break;
    case "thick":
      ctx.lineWidth = 3;
      break;
    case "dashed":
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 3]);
      break;
    case "dotted":
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 1]);
      break;
    case "thin":
    default:
      ctx.lineWidth = 1;
      break;
  }
}
