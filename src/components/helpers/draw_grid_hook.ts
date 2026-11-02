import {
  PluginInstance,
  providePlugins,
  signal,
  useEffect,
  useListener,
  usePlugin,
} from "@odoo/owl";
import { CANVAS_SHIFT } from "../../constants";
import { useEffectAfterPatch } from "../../helpers/owl3_helpers";
import { RendererPlugin } from "../../owl_plugins/renderer_plugin";
import { StoreRendererPlugin } from "../../owl_plugins/stores_render_owl_plugin";
import { useLocalStore, useStoreProvider } from "../../store_engine/store_hooks";
import { GridRenderer } from "../../stores/grid_renderer_store";
import { GridRenderingContext } from "../../types/rendering";
import { cssPropertiesToCss } from "./css";

interface GridDrawingArgs {
  canvasRef: () => HTMLElement | null;
  renderingCtx: () => Omit<GridRenderingContext, "ctx" | "thinLineWidth">;
  rendererPlugin?: PluginInstance<typeof RendererPlugin>;
  changeCanvasSizeOnZoom?: boolean;
}

export function useGridDrawing({
  canvasRef,
  renderingCtx,
  rendererPlugin,
  changeCanvasSizeOnZoom,
}: GridDrawingArgs) {
  const renderer = rendererPlugin ?? usePlugin(RendererPlugin);

  providePlugins([StoreRendererPlugin], {
    stores: useStoreProvider(),
    rendererPlugin: renderer,
  });
  const storeRendererPlugin = usePlugin(StoreRendererPlugin);
  useLocalStore(GridRenderer, { renderer });
  const drawCanvasSignal = signal(0);

  const triggerDrawSignal = () => signal.trigger(drawCanvasSignal);
  // The browser can throw away the canvas bitmap on background tab, draw again when tab becomes visible
  useListener(document, "visibilitychange", () => {
    if (document.visibilityState === "visible") {
      triggerDrawSignal();
    }
  });
  // A 2d context is restored by the browser on its own, only its content has to be drawn again.
  useEffect(() => {
    const canvas = canvasRef();
    if (!canvas) {
      return;
    }
    canvas.addEventListener("contextrestored", triggerDrawSignal);
    return () => canvas.removeEventListener("contextrestored", triggerDrawSignal);
  });

  useEffectAfterPatch(drawGrid);

  function drawGrid() {
    drawCanvasSignal();
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
      // OWL3 FIXME: we need to manually read the signals on early return since the viewports are not reactive.
      storeRendererPlugin.readSignals();
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
