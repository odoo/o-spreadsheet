import { providePlugins, signal, useProps } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useLocalStore, useStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { ZoomStore } from "../../stores/zoom_store";
import { Pixel } from "../../types/misc";
import { DOMCoordinates, DOMDimension, OrderedLayers, Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { ClickableCellsOverlay } from "../clickable_cells_overlay/clickable_cells_overlay";
import { FiguresContainer } from "../figures/figure_container/figure_container";
import { DelayedHoveredCellStore } from "../grid/delayed_hovered_cell_store";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect, isCtrlKey } from "../helpers/dom_helpers";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useTouchHandlers } from "../helpers/touch_handlers_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import {
  centeredContentMargin,
  getZoomAnchorRect,
  nextWheelZoomLevel,
  rescaleDimensionsForZoom,
  zoomedScrollOffset,
} from "../helpers/zoom";
import { CellPopoverStore } from "../popover/cell_popover_store";
import { Popover } from "../popover/popover";
import { PopoverContainerPlugin } from "../popover/popover_container_owl_plugin";
import { types } from "../props_validation";
import { HorizontalScrollBar } from "../scrollbar/scrollbar_horizontal";
import { VerticalScrollBar } from "../scrollbar/scrollbar_vertical";
import { HoveredTableStore } from "../tables/hovered_table_store";

export class SpreadsheetDashboard extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetDashboard";
  static components = {
    GridOverlay,
    GridPopover,
    Popover,
    VerticalScrollBar,
    HorizontalScrollBar,
    ClickableCellsOverlay,
    FiguresContainer,
  };

  protected props = useProps({
    getGridSize: types.function<() => DOMDimension>(),
  });

  protected cellPopovers!: Store<CellPopoverStore>;

  onMouseWheel!: (ev: WheelEvent) => void;
  canvasPosition!: DOMCoordinates;
  hoveredCell!: Store<DelayedHoveredCellStore>;
  private viewStore!: Store<ViewportsStore>;
  private zoomStore!: Store<ZoomStore>;

  private gridRef = signal.ref();
  private canvasRef = signal.ref(HTMLCanvasElement);
  private zoomRootRef = signal.ref();

  setup() {
    this.hoveredCell = useStore(DelayedHoveredCellStore);
    this.viewStore = useStore(ViewportsStore);
    this.zoomStore = useStore(ZoomStore);
    useLocalStore(HoveredTableStore);

    const layers = OrderedLayers().filter((layer) => layer !== "Headers");
    const rendererStore = useLocalStore(RendererStore, layers);
    providePlugins([PopoverContainerPlugin], {
      getPopoverContainerRect: () => this.zoomStore.getZoomedRect(this.getGridRect()),
    });

    useGridDrawing({
      canvasRef: this.canvasRef,
      rendererStore,
      renderingCtx: () => ({
        dpr: window.devicePixelRatio || 1,
        viewports: this.viewStore.viewports,
        ...this.env.model.getters.getSelectionState(),
        hideGridLines: true,
      }),
    });
    this.onMouseWheel = useWheelHandler((deltaX, deltaY, ev) => {
      if (isCtrlKey(ev)) {
        ev.preventDefault();
        this.zoomAtCursor(ev);
        return;
      }
      this.moveCanvas(deltaX, deltaY);
      this.hoveredCell.clear();
    });
    this.cellPopovers = useStore(CellPopoverStore);

    useTouchHandlers(this.gridRef, {
      updateScroll: this.moveCanvas.bind(this),
      canMoveUp: () => {
        const { scrollY } = this.viewStore.activeSheetScrollInfo;
        return scrollY > 0;
      },
      canMoveDown: () => {
        const { maxOffsetY } = this.viewStore.maximumSheetOffset;
        const { scrollY } = this.viewStore.activeSheetScrollInfo;
        return scrollY < maxOffsetY;
      },
      getZoom: () => this.zoomStore.zoomLevel,
      setZoom: (zoom: number) => this.zoomStore.setZoom(zoom),
    });
  }

  get gridContainer() {
    const maxWidth = this.getMaxSheetWidth();
    return cssPropertiesToCss({ "max-width": `${maxWidth}px` });
  }

  get gridOverlayDimensions() {
    return cssPropertiesToCss({
      height: "100%",
      width: "100%",
    });
  }

  onClosePopover() {
    this.cellPopovers.close();
  }

  onGridResized() {
    const { height, width } = this.props.getGridSize();
    const maxWidth = this.getMaxSheetWidth();
    this.viewStore.resizeSheetView({
      height,
      width: Math.min(maxWidth, width),
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
  }

  private moveCanvas(deltaX: Pixel, deltaY: Pixel) {
    const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;
    this.viewStore.setViewportOffset({ offsetX: scrollX + deltaX, offsetY: scrollY + deltaY });
  }

  private zoomAtCursor(ev: WheelEvent) {
    const oldZoom = this.zoomStore.zoomLevel;
    const newZoom = nextWheelZoomLevel(oldZoom, ev.deltaY);
    if (newZoom === oldZoom) {
      return;
    }
    const gridRect = getZoomAnchorRect(this.zoomRootRef());
    const maxWidth = this.getMaxSheetWidth();
    const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;
    // The content (gridRef) is horizontally auto-centered inside the zoom root whenever it's
    // narrower than the available width (no horizontal scrollbar): that centering margin shrinks
    // or grows with the zoom level, so it has to be folded into the cursor-fixed-point offset on
    // the x axis, on top of the scale factor -- otherwise the content visibly jumps by the change
    // in margin once the browser reflows for the new zoom, on top of the intended zoom-at-cursor
    // motion.
    const newOffset = zoomedScrollOffset(
      { scrollX, scrollY },
      { x: ev.clientX - gridRect.x, y: ev.clientY - gridRect.y },
      oldZoom,
      newZoom,
      {
        old: centeredContentMargin(gridRect.width, maxWidth, oldZoom),
        new: centeredContentMargin(gridRect.width, maxWidth, newZoom),
      }
    );
    // Recompute the logical sheet-view size for the new zoom right away, instead of waiting for
    // the ResizeObserver to notice the browser's (delayed) reflow of the CSS zoom change: that lag
    // is what causes a stale/incorrect frame (blank canvas area, oversized scrollbar) to flash
    // before self-correcting on a later tick.
    const { width, height } = rescaleDimensionsForZoom(
      this.viewStore.sheetViewDimensionWithHeaders,
      oldZoom,
      newZoom
    );
    this.zoomStore.setZoom(newZoom);
    this.viewStore.resizeSheetView({
      height,
      width: Math.min(maxWidth, width),
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    this.viewStore.setViewportOffset(newOffset);
  }

  private getGridRect(): Rect {
    return {
      ...getElBoundingRect(this.gridRef()),
      ...this.viewStore.sheetViewDimensionWithHeaders,
    };
  }

  private getMaxSheetWidth(): Pixel {
    const sheetId = this.viewStore.displayedSheetId;
    const { right } = this.env.model.getters.getSheetZone(sheetId);
    return this.env.model.getters.getColDimensions(sheetId, right).end;
  }

  get dashboardStyle() {
    const style = { zoom: this.zoomStore.cssZoom };
    return cssPropertiesToCss(style);
  }

  get backgroundStyle() {
    const sheet = this.env.model.getters.getActiveSheet();
    const theme = this.env.model.getters.getSpreadsheetTheme();
    return cssPropertiesToCss({
      "background-color": sheet.backgroundColor || theme.backgroundColor,
    });
  }
}
