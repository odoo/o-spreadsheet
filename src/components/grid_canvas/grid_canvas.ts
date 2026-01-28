import { GridRenderingContext, UID, Zone } from "@odoo/o-spreadsheet-engine";
import { CANVAS_SHIFT } from "@odoo/o-spreadsheet-engine/constants";
import { ViewportCollection } from "@odoo/o-spreadsheet-engine/plugins/ui_stateful/sheetview_class";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef } from "@odoo/owl";
import { Store, useLocalStore } from "../../store_engine";
import { GridRenderer } from "../../stores/grid_renderer_store";
import { RendererStore } from "../../stores/renderer_store";
import { FigureComponent } from "../figures/figure/figure";
import { cssPropertiesToCss } from "../helpers";
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
  static components = { FigureComponent };

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

  get containerStyle() {
    const sheetView = this.renderingContext.sheetView!; // ADRM TODO
    return cssPropertiesToCss({
      width: `${sheetView.sheetViewWidth}px`,
      height: `${sheetView.sheetViewHeight}px`,
    });
  }

  get renderingContext(): Partial<GridRenderingContext> {
    const sheetId = this.props.sheetId;
    const zone = this.props.zone;

    const firstRowStart = this.env.model.getters.getRowDimensions(sheetId, zone.top).start;
    const lastRowEnd = this.env.model.getters.getRowDimensions(sheetId, zone.bottom).end;
    const firstColStart = this.env.model.getters.getColDimensions(sheetId, zone.left).start;
    const lastColEnd = this.env.model.getters.getColDimensions(sheetId, zone.right).end;

    const partialCtx: Partial<GridRenderingContext> = {
      selectedZones: [],
      sheetId,
      hideHeaders: true,
    };

    const sheetView = new ViewportCollection(this.env.model.getters);
    sheetView.sheetViewWidth = lastColEnd - firstColStart;
    sheetView.sheetViewHeight = lastRowEnd - firstRowStart;
    sheetView.setSheetViewOffset(sheetId, firstColStart, firstRowStart);

    partialCtx.sheetView = sheetView;
    return partialCtx;
  }

  get visibleFigures() {
    const sheetView = this.renderingContext.sheetView!; // ADRM TODO
    return sheetView.getVisibleFigures(this.props.sheetId);
  }

  get figureContainerStyle() {
    const sheetView = this.renderingContext.sheetView!; // ADRM TODO
    const offset = sheetView.getViewportOffset(this.props.sheetId);
    return cssPropertiesToCss({
      left: `${-offset.x}px`,
      top: `${-offset.y}px`,
    });
  }

  drawGrid() {
    const canvas = this.canvasRef.el as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const thinLineWidth = 0.4 * dpr;
    // @ts-ignore ADRM TODO
    const renderingContext: GridRenderingContext = {
      ctx,
      dpr,
      thinLineWidth,
      ...this.env.model.getters.getSelectionContext(),
      ...this.renderingContext,
    };
    const zoom = renderingContext.sheetView.zoomLevel;
    let { width, height } = this.dimensions;
    width = Math.min(width, renderingContext.sheetView.sheetViewWidth);
    height = Math.min(height, renderingContext.sheetView.sheetViewHeight);
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
