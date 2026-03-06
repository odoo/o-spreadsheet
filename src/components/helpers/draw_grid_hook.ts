import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { CANVAS_SHIFT } from "@odoo/o-spreadsheet-engine/constants";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { useEffect, useRef } from "@odoo/owl";
import { Store, useLocalStore, useStore } from "../../store_engine";
import { GridRenderer } from "../../stores/grid_renderer_store";
import { RendererStore } from "../../stores/renderer_store";
import { GridRenderingContext } from "../../types";

interface GridDrawingArgs {
  refName: string;
  model: Model;
  dpr?: number;
  partialRenderingCtx?: () => Partial<GridRenderingContext>;
  rendererStore?: Store<RendererStore>;
  changeCanvasSizeOnZoom?: boolean;
}

export function useGridDrawing({
  refName,
  model,
  partialRenderingCtx,
  dpr,
  rendererStore,
  changeCanvasSizeOnZoom,
}: GridDrawingArgs) {
  const canvasRef = useRef(refName);
  useEffect(drawGrid);
  const renderer = rendererStore || useStore(RendererStore);
  useLocalStore(GridRenderer, renderer);

  function drawGrid() {
    const canvas = canvasRef.el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    dpr = dpr || window.devicePixelRatio || 1;
    const renderingContext: GridRenderingContext = {
      ctx,
      dpr,
      thinLineWidth: 0.4,
      viewports: model.getters.getViewportCollection(),
      ...model.getters.getSelectionState(),
      ...(partialRenderingCtx?.() || {}),
    };
    let zoom = renderingContext.viewports.zoomLevel;
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
  }
}
