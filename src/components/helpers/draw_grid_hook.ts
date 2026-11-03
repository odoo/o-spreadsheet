import { providePlugins, signal, useEffect, useListener, usePlugin } from "@odoo/owl";
import { CANVAS_SHIFT } from "../../constants";
import { StoreRendererPlugin } from "../../owl_plugins/stores_render_owl_plugin";
import { useLocalStore, useStore, useStoreProvider } from "../../store_engine/store_hooks";
import { GridRenderer } from "../../stores/grid_renderer_store";
import { RendererStore } from "../../stores/renderer_store";
import { GridRenderingContext } from "../../types/rendering";
import { Store } from "../../types/store_engine";
import { cssPropertiesToCss } from "./css";

interface GridDrawingArgs {
  canvasRef: () => HTMLElement | null;
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
  providePlugins([StoreRendererPlugin], {
    stores: useStoreProvider(),
    renderer,
  });
  const storeRenderer = usePlugin(StoreRendererPlugin);
  useLocalStore(GridRenderer, renderer);

  // The browser can throw away the canvas bitmap on background tab, force a redraw when tab becomes visible
  const redrawTrigger = signal(0);
  const forceRedraw = () => signal.trigger(redrawTrigger);
  useListener(document, "visibilitychange", () => {
    if (document.visibilityState === "visible") {
      forceRedraw();
    }
  });
  useEffect(() => {
    const canvas = canvasRef();
    if (!canvas) {
      return;
    }
    canvas.addEventListener("contextrestored", forceRedraw);
    return () => canvas.removeEventListener("contextrestored", forceRedraw);
  });

  useEffect(drawGrid);

  function drawGrid() {
    // Subscribe to the signals before any early return
    redrawTrigger();
    storeRenderer.watchDependencies();
    const canvas = canvasRef() as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d", { alpha: true })!;
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
    ctx.resetTransform();
    // Imagine each pixel as a large square. The whole-number coordinates (0, 1, 2…)
    // are the edges of the squares. If you draw a one-unit-wide line between whole-number
    // coordinates, it will overlap opposite sides of the pixel square, and the resulting
    // line will be drawn two pixels wide. To draw a line that is only one pixel wide,
    // you need to shift the coordinates by 0.5 perpendicular to the line's direction.
    // http://diveintohtml5.info/canvas.html#pixel-madness
    ctx.translate(-CANVAS_SHIFT, -CANVAS_SHIFT);
    ctx.scale(dpr * zoom, dpr * zoom);

    renderer.draw(renderingContext);
  }
}
