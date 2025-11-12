import { CANVAS_SHIFT } from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { useEffect, useRef } from "@odoo/owl";
import { useStore } from "../../store_engine";
import { GridRenderer } from "../../stores/grid_renderer_store";
import { RendererStore } from "../../stores/renderer_store";
import { DOMDimension } from "../../types";

export function useGridDrawing(refName: string, model: Model, canvasSize: () => DOMDimension) {
  const canvasRef = useRef(refName);
  useEffect(drawGrid);
  const rendererStore = useStore(RendererStore);
  useStore(GridRenderer);

  function drawGrid() {
    const canvas = canvasRef.el as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const zoom = Math.max(model.getters.getViewportZoomLevel(), 1);
    const thinLineWidth = 0.4 * dpr;
    const renderingContext = {
      ctx,
      dpr,
      thinLineWidth,
    };
    let { width, height } = canvasSize();
    width = zoom * width;
    height = zoom * height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;zoom:${1 / zoom};`);
    if (width === 0 || height === 0) {
      return;
    }
    // Imagine each pixel as a large square. The whole-number coordinates (0, 1, 2…)
    // are the edges of the squares. If you draw a one-unit-wide line between whole-number
    // coordinates, it will overlap opposite sides of the pixel square, and the resulting
    // line will be drawn two pixels wide. To draw a line that is only one pixel wide,
    // you need to shift the coordinates by 0.5 perpendicular to the line's direction.
    // http://diveintohtml5.info/canvas.html#pixel-madness
    ctx.translate(-CANVAS_SHIFT, -CANVAS_SHIFT);
    ctx.scale(dpr * zoom, dpr * zoom);

    rendererStore.draw(renderingContext);
  }
}
