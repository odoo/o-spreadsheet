import { GridRenderingContext, UID, Zone } from "@odoo/o-spreadsheet-engine";
import { CANVAS_SHIFT } from "@odoo/o-spreadsheet-engine/constants";
import { InternalViewport } from "@odoo/o-spreadsheet-engine/helpers/internal_viewport";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef } from "@odoo/owl";
import { Store, useLocalStore } from "../../store_engine";
import { GridRenderer } from "../../stores/grid_renderer_store";
import { RendererStore } from "../../stores/renderer_store";
import { getRefBoundingRect } from "../helpers/dom_helpers";

interface Props {
  sheetId: UID;
  zone: Zone;
}

export class GridCanvas extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridCanvas";
  static props = {
    sheetId: String,
    zone: Object,
  };

  canvasContainerRef = useRef("canvasContainer");
  canvasRef = useRef("canvas");

  rendererStore!: Store<RendererStore>;

  setup() {
    this.rendererStore = useLocalStore(RendererStore);
    const gridRendererStore = useLocalStore(GridRenderer, this.rendererStore);
    this.rendererStore.register(gridRendererStore as any);
    useEffect(this.drawGrid.bind(this));
  }

  get dimensions() {
    return getRefBoundingRect(this.canvasContainerRef);
  }

  get renderingContext(): Partial<GridRenderingContext> {
    const sheetId = this.props.sheetId;
    const zone = this.props.zone;

    const firstRowStart = this.env.model.getters.getRowDimensions(sheetId, zone.top).start;
    const lastRowEnd = this.env.model.getters.getRowDimensions(sheetId, zone.bottom).end;
    const firstColStart = this.env.model.getters.getColDimensions(sheetId, zone.left).start;
    const lastColEnd = this.env.model.getters.getColDimensions(sheetId, zone.right).end;

    const partialCtx: Partial<GridRenderingContext> = {
      getters: this.env.model.getters,
      hideHeaders: true,
      gridOffsetX: 0,
      gridOffsetY: 0,
      selectedZones: [],
      sheetViewWidth: lastColEnd - firstColStart,
      sheetViewHeight: lastRowEnd - firstRowStart,
      sheetId,
      zoomLevel: 1,
    };

    const testViewport = new InternalViewport(
      this.env.model.getters,
      sheetId,
      this.env.model.getters.getSheetZone(sheetId),
      { width: lastColEnd - firstColStart, height: lastRowEnd - firstRowStart },
      { canScrollHorizontally: false, canScrollVertically: false },
      { x: firstColStart, y: firstRowStart }
    );
    // new ViewportCollection()

    partialCtx.viewports = {
      bottomRight: testViewport,
      topLeft: undefined,
      topRight: undefined,
      bottomLeft: undefined,
    };
    return partialCtx;
  }

  drawGrid() {
    const canvas = this.canvasRef.el as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const thinLineWidth = 0.4 * dpr; // ADRM TODO: zoom
    const renderingContext: GridRenderingContext = {
      ctx,
      dpr,
      thinLineWidth,
      ...this.env.model.getters.getSheetViewCtx(),
      ...this.env.model.getters.getSelectionContext(),
      ...this.renderingContext,
    };
    const zoom = renderingContext.zoomLevel;
    let { width, height } = this.dimensions;
    width = Math.min(width, renderingContext.sheetViewWidth);
    height = Math.min(height, renderingContext.sheetViewHeight);
    width = zoom * width;
    height = zoom * height;
    // canvas.style.width = `${zoom * width}px`;
    // canvas.style.height = `${zoom * height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;zoom:${1}`);
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

    this.rendererStore.draw(renderingContext);
  }
}
