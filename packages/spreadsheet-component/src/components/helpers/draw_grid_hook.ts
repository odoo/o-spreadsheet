import { useEffect, useRef } from "@odoo/owl";
import { CANVAS_SHIFT } from "../../constants";
import { Model } from "../../model";
import { useStore } from "../../store_engine";
import { GridRenderer } from "../../stores/grid_renderer_store";
import { RendererStore } from "../../stores/renderer_store";
import { DOMDimension, OrderedLayers } from "../../types";

export function useGridDrawing(refName: string, model: Model, canvasSize: () => DOMDimension) {
  const canvasRef = useRef(refName);
  useEffect(drawGrid);
  const rendererStore = useStore(RendererStore);
  useStore(GridRenderer);

  function drawGrid() {
    const canvas = canvasRef.el as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const thinLineWidth = 0.4 * dpr;
    const renderingContext = {
      ctx,
      dpr,
      thinLineWidth,
    };
    const { width, height } = canvasSize();
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    // Imagine each pixel as a large square. The whole-number coordinates (0, 1, 2…)
    // are the edges of the squares. If you draw a one-unit-wide line between whole-number
    // coordinates, it will overlap opposite sides of the pixel square, and the resulting
    // line will be drawn two pixels wide. To draw a line that is only one pixel wide,
    // you need to shift the coordinates by 0.5 perpendicular to the line's direction.
    // http://diveintohtml5.info/canvas.html#pixel-madness
    ctx.translate(-CANVAS_SHIFT, -CANVAS_SHIFT);
    ctx.scale(dpr, dpr);

    for (const layer of OrderedLayers()) {
      model.drawLayer(renderingContext, layer);
      // @ts-ignore 'drawLayer' is not declated as a mutator because:
      // it does not mutate anything. Most importantly it's used
      // during rendering. Invoking a mutator during rendering would
      // trigger another rendering, ultimately resulting in an infinite loop.
      rendererStore.drawLayer(renderingContext, layer);
    }
  }
}
