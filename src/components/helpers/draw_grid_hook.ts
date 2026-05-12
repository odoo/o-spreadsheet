import { plugin, useEffect, type Signal } from "@odoo/owl";
import { CANVAS_SHIFT } from "../../constants";
import { useLocalStore, useStore } from "../../store_engine/store_hooks";
import { GridRenderer } from "../../stores/grid_renderer_store";
import { RendererStore } from "../../stores/renderer_store";
import { GridRenderingContext } from "../../types/rendering";
import { Store } from "../../types/store_engine";
import { ModelPlugin } from "../owl_plugins/model_plugin";
import { cssPropertiesToCss } from "./css";

interface GridDrawingArgs {
  canvasRef: Signal<HTMLElement | null>;
  renderingCtx: () => Omit<GridRenderingContext, "ctx" | "thinLineWidth">;
  rendererStore?: Store<RendererStore>;
  changeCanvasSizeOnZoom?: boolean;
}

export function useGridDrawing({
  canvasRef,
  renderingCtx,
  rendererStore,
  changeCanvasSizeOnZoom,
}: GridDrawingArgs) {
  const renderer = rendererStore || useStore(RendererStore);
  useLocalStore(GridRenderer, renderer);

  const drawGrid = () => {
    const canvas = canvasRef() as HTMLCanvasElement;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const renderingContext: GridRenderingContext = {
      ctx,
      thinLineWidth: 0.4,
      ...renderingCtx(),
    };
    const dpr = renderingContext.dpr;
    let zoom = renderingContext.viewports.getZoomLevel();
    if (!changeCanvasSizeOnZoom) {
      zoom = Math.max(zoom, 1);
    }
    const { width, height } = renderingContext.viewports.getSheetViewDimensionWithHeaders();
    canvas.width = width * dpr * zoom;
    canvas.height = height * dpr * zoom;
    const style = cssPropertiesToCss({
      width: changeCanvasSizeOnZoom ? `${width * zoom}px` : `${width}px`,
      height: changeCanvasSizeOnZoom ? `${height * zoom}px` : `${height}px`,
    });
    canvas.setAttribute("style", style);
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

    renderer.draw(renderingContext);
  };

  const modelPlugin = plugin(ModelPlugin);
  useEffect(() => {
    modelPlugin.model(); // Manually subscribe to the model plugin to trigger re-render on model updates.
    drawGrid();
  });

  return drawGrid;
}
