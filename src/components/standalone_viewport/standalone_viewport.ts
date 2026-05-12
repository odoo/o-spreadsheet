import { props, signal } from "@odoo/owl";
import { HeaderIndex, PixelOffset, ViewportsGetters } from "../..";
import { range } from "../../helpers/misc";
import { ViewportCollection } from "../../helpers/viewport_collection";
import { Component, useChildSubEnv, useLayoutEffect } from "../../owl3_compatibility_layer";
import { useChildStoreProvider, useLocalStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { UID } from "../../types/misc";
import { GridRenderingContext } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { HoveredIconStore } from "../grid_overlay/hovered_icon_store";
import { cssPropertiesToCss } from "../helpers/css";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { types } from "../props_validation";
import { VerticalScrollBar } from "../scrollbar/scrollbar_vertical";
import { HoveredTableStore } from "../tables/hovered_table_store";

// FIXME CAROUSELS: it doesn't work with zoom
// FIXME CAROUSELS: flicker on first render (thus in figure drag & drop)
export class StandaloneViewport extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneViewport";
  static components = { VerticalScrollBar, GridOverlay };

  protected props = props({
    range: types.Range(),
  });

  private canvasRef = signal<HTMLElement | null>(null);
  private containerRef = signal<HTMLElement | null>(null);

  onMouseWheel!: (ev: WheelEvent) => void;

  rendererStore!: Store<RendererStore>;
  renderingContext!: Omit<GridRenderingContext, "ctx" | "thinLineWidth">;

  setup() {
    useChildStoreProvider([HoveredIconStore, HoveredTableStore]);
    this.rendererStore = useLocalStore(RendererStore, ["Background", "Chart"]);
    this.renderingContext = this.getRenderingContext();
    useLayoutEffect(
      () => {
        this.renderingContext = this.getRenderingContext();
      },
      () => [this.containerWidth, this.props.range, this.env.model.getters.getViewportZoomLevel()]
    );
    useGridDrawing({
      canvasRef: this.canvasRef,
      renderingCtx: () => this.renderingContext,
      rendererStore: this.rendererStore,
      changeCanvasSizeOnZoom: true,
    });
    const self = this;
    // FIXME CAROUSELS: this is not great, as nothing prevents the child components to use getters.getViewportCollection()
    // instead of env.viewports. The clean way would probably be to make the viewports/selection into a store.
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
        ev.stopPropagation();
        ev.preventDefault();

        const scroll = this.renderingContext.viewports.getSheetScrollInfo(this.props.range.sheetId);
        this.onScroll({ offsetX: scroll.scrollX + deltaX, offsetY: scroll.scrollY + deltaY });
      }
    });
  }

  getRenderingContext(): Omit<GridRenderingContext, "ctx" | "thinLineWidth"> {
    const { sheetId, zone } = this.props.range;

    const getters = this.viewportGetters;
    const sheetViewWidth = this.containerWidth;
    const sheetViewHeight = this.containerHeight;
    const viewports = new ViewportCollection({
      getters: getters,
      paneDivision: { [sheetId]: { xSplit: 0, ySplit: 0 } },
      sheetViewWidth,
      sheetViewHeight,
      zoomLevel: this.env.model.getters.getViewportZoomLevel(),
      zoneToDisplay: zone,
      getFooterSize: () => 0,
    });

    const renderingCtx: Omit<GridRenderingContext, "ctx" | "thinLineWidth"> = {
      sheetId,
      viewports,
      hideGridLines: false,
      dpr: 1,
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
      const zone = this.props.range.zone;
      const nonHiddenCols = range(zone.left, zone.right + 1).filter(
        (col) => !this.env.model.getters.isColHidden(sheetId, col)
      );
      const hiddenColsBefore = range(zone.left, index).filter((col) =>
        this.env.model.getters.isColHidden(sheetId, col)
      ).length;
      index = index - hiddenColsBefore;
      const colSize = Math.floor(this.containerWidth / nonHiddenCols.length);
      return { start: index * colSize, size: colSize, end: (index + 1) * colSize };
    };

    return this.env.model.getters.buildViewportGetters(getHeaderDimensions);
  }

  onScroll(offset: PixelOffset) {
    this.renderingContext.viewports.setSheetViewOffset(
      this.props.range.sheetId,
      offset.offsetX,
      offset.offsetY
    );
    this.render(true); // FIXME CAROUSELS: remove this once the viewports are a store and do a render
  }

  get hasVerticalScrollBar() {
    return (
      this.renderingContext.viewports.getMainViewportRect(this.props.range.sheetId).height >
      this.containerHeight
    );
  }

  get scrollBarContainerStyle() {
    return cssPropertiesToCss({
      width: `${this.renderingContext.viewports.getScrollBarWidth()}px`,
    });
  }

  onCellClicked(col: HeaderIndex, row: HeaderIndex) {
    if (!this.env.model.getters.isDashboard()) {
      const activeSheetId = this.env.model.getters.getActiveSheetId();
      if (this.props.range.sheetId !== activeSheetId) {
        this.env.model.dispatch("ACTIVATE_SHEET", {
          sheetIdFrom: activeSheetId,
          sheetIdTo: this.props.range.sheetId,
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
