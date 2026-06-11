import { props, signal } from "@odoo/owl";
import { GridClickModifiers, HeaderIndex, PixelOffset, ViewportsGetters } from "../..";
import { ViewportCollection } from "../../helpers/viewport_collection";
import { Component, useChildSubEnv, useLayoutEffect } from "../../owl3_compatibility_layer";
import { useLocalStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { UID } from "../../types/misc";
import { GridRenderingContext } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { cssPropertiesToCss } from "../helpers/css";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { ZoomedMouseEvent } from "../helpers/zoom";
import { types } from "../props_validation";
import { VerticalScrollBar } from "../scrollbar/scrollbar_vertical";

// ADRM TODO: Worry about zoom. I did some things that approximately work, but have no idea why.
export class StandaloneViewport extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneViewport";
  static components = { VerticalScrollBar, GridOverlay };

  protected props = props({
    sheetId: types.UID(),
    zone: types.Zone(),
  });

  private canvasRef = signal<HTMLElement | null>(null);
  private containerRef = signal<HTMLElement | null>(null);

  onMouseWheel!: (ev: WheelEvent) => void;

  rendererStore!: Store<RendererStore>;
  renderingContext!: Omit<GridRenderingContext, "ctx" | "thinLineWidth">;

  setup() {
    this.rendererStore = useLocalStore(RendererStore, ["Background", "Chart"]);
    this.renderingContext = this.getRenderingContext();
    useLayoutEffect(
      () => {
        this.renderingContext = this.getRenderingContext();
      },
      () => [
        this.containerWidth,
        this.props.zone,
        this.props.sheetId,
        this.env.model.getters.getViewportZoomLevel(),
      ]
    );
    useGridDrawing({
      canvasRef: this.canvasRef,
      renderingCtx: () => this.renderingContext,
      rendererStore: this.rendererStore,
      changeCanvasSizeOnZoom: true,
    });
    const self = this;
    useChildSubEnv({
      get viewports() {
        return self.renderingContext.viewports;
      },
      get sheetId() {
        return self.renderingContext.sheetId;
      },
    });

    this.onMouseWheel = useWheelHandler((deltaX, deltaY, ev) => {
      if (this.hasVerticalScrollBar) {
        ev.stopPropagation(); // ADRM TODO; only stop if there is a scrollbar
        ev.preventDefault();

        const scroll = this.renderingContext.viewports.getSheetScrollInfo(this.props.sheetId);
        this.onScroll({ offsetX: scroll.scrollX + deltaX, offsetY: scroll.scrollY + deltaY });
      }
    });
    // ADRM TODO: try to make the resize observer work. It generate strange error messages when resizing the figure
    // const resizeObserver = new ResizeObserver(() => {
    //   this.renderingContext = this.getRenderingContext();
    //   drawGrid();
    // });
    // onMounted(() => {
    //   const container = this.containerRect();
    //   if (container) {
    //     resizeObserver.observe(container);
    //   }
    // });
    // onWillUnmount(() => resizeObserver.disconnect());
  }

  getRenderingContext(): Omit<GridRenderingContext, "ctx" | "thinLineWidth"> {
    const { sheetId, zone } = this.props;

    const getters = this.viewportGetters;
    // const firstRowStart = getters.getRowDimensions(sheetId, zone.top).start;
    // const lastRowEnd = getters.getRowDimensions(sheetId, zone.bottom).end;
    // const firstColStart = getters.getColDimensions(sheetId, zone.left).start;
    // const lastColEnd = getters.getColDimensions(sheetId, zone.right).end;

    // const sheetViewWidth = lastColEnd - firstColStart;
    // const sheetViewHeight = lastRowEnd - firstRowStart;
    const sheetViewWidth = this.containerWidth;
    const sheetViewHeight = this.containerHeight;
    // const firstRowStart = 0;
    // const firstColStart = 0;
    const viewports = new ViewportCollection({
      getters: getters,
      paneDivision: { [sheetId]: { xSplit: 0, ySplit: 0 } },
      sheetViewWidth,
      sheetViewHeight,
      zoomLevel: 1,
      zoneToDisplay: zone,
      getFooterSize: () => 0,
    });
    // viewports.setSheet=ROW()ViewOffset(sheetId, firstColStart, firstRowStart);

    const renderingCtx: Omit<GridRenderingContext, "ctx" | "thinLineWidth"> = {
      sheetId,
      viewports,
      hideGridLines: false,
      dpr: window.devicePixelRatio * this.env.model.getters.getViewportZoomLevel(),
      selectedZones: [],
      activeCols: new Set(),
      activeRows: new Set(),
      activePosition: undefined,
      theme: this.env.model.getters.getSpreadsheetTheme(),
    };
    return renderingCtx;
  }

  get containerWidth() {
    return this.containerRef()?.offsetWidth || 0;
  }

  get containerHeight() {
    return this.containerRef()?.offsetHeight || 0;
  }

  get viewportGetters(): ViewportsGetters {
    const getHeaderDimensions = (sheetId: UID, dimension: "COL" | "ROW", index: number) => {
      if (dimension === "ROW") {
        return this.env.model.getters.getRowDimensions(sheetId, index);
      }
      const colSize = this.containerWidth / (this.props.zone.right - this.props.zone.left + 1);
      return { start: index * colSize, size: colSize, end: (index + 1) * colSize }; // ADRM TODO hidden cols
    };

    return this.env.model.getters.buildViewportGetters(getHeaderDimensions);
  }

  onScroll(offset: PixelOffset) {
    this.renderingContext.viewports.setSheetViewOffset(
      this.props.sheetId,
      offset.offsetX,
      offset.offsetY
    );
    this.render(true); // ADRM TODO
  }

  get hasVerticalScrollBar() {
    return (
      this.renderingContext.viewports.getMainViewportRect(this.props.sheetId).height >
      this.containerHeight
    );
  }

  get scrollBarContainerStyle() {
    return cssPropertiesToCss({
      width: `${this.renderingContext.viewports.getScrollBarWidth()}px`, // ADRM TODO: 0 if no scrollbar
    });
  }

  onCellClicked(
    col: HeaderIndex,
    row: HeaderIndex,
    modifiers: GridClickModifiers,
    zoomedMouseEvent: ZoomedMouseEvent<MouseEvent | PointerEvent>
  ) {
    if (!this.env.model.getters.isDashboard()) {
      const activeSheetId = this.env.model.getters.getActiveSheetId();
      if (this.props.sheetId !== activeSheetId) {
        this.env.model.dispatch("ACTIVATE_SHEET", {
          sheetIdFrom: activeSheetId,
          sheetIdTo: this.props.sheetId,
        });
      }
      this.env.model.selection.selectCell(col, row);
      return;
    }
  }

  get gridOverlayDimensions() {
    return cssPropertiesToCss({ height: "100%", width: "100%" });
  }
}
