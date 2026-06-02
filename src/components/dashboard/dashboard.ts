import { props, signal } from "@odoo/owl";
import { Component, useChildSubEnv } from "../../owl3_compatibility_layer";
import { useLocalStore, useStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { Pixel } from "../../types/misc";
import { DOMCoordinates, DOMDimension, OrderedLayers, Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { ClickableCellsOverlay } from "../clickable_cells_overlay/clickable_cells_overlay";
import { DelayedHoveredCellStore } from "../grid/delayed_hovered_cell_store";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useTouchHandlers } from "../helpers/touch_handlers_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { getZoomedRect } from "../helpers/zoom";
import { CellPopoverStore } from "../popover/cell_popover_store";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";
import { HorizontalScrollBar } from "../scrollbar/scrollbar_horizontal";
import { VerticalScrollBar } from "../scrollbar/scrollbar_vertical";

export class SpreadsheetDashboard extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetDashboard";
  static components = {
    GridOverlay,
    GridPopover,
    Popover,
    VerticalScrollBar,
    HorizontalScrollBar,
    ClickableCellsOverlay,
  };

  protected props = props({
    getGridSize: types.function<() => DOMDimension>(),
  });

  protected cellPopovers!: Store<CellPopoverStore>;

  onMouseWheel!: (ev: WheelEvent) => void;
  canvasPosition!: DOMCoordinates;
  hoveredCell!: Store<DelayedHoveredCellStore>;

  private gridRef = signal<HTMLElement | null>(null);
  private canvasRef = signal<HTMLElement | null>(null);

  setup() {
    this.hoveredCell = useStore(DelayedHoveredCellStore);

    const layers = OrderedLayers().filter((layer) => layer !== "Headers");
    const rendererStore = useLocalStore(RendererStore, layers);
    useChildSubEnv({
      getPopoverContainerRect: () =>
        getZoomedRect(this.env.model.getters.getViewportZoomLevel(), this.getGridRect()),
    });
    useGridDrawing({
      canvasRef: this.canvasRef,
      rendererStore,
      renderingCtx: () => ({
        dpr: window.devicePixelRatio || 1,
        viewports: this.env.model.getters.getViewportCollection(),
        ...this.env.model.getters.getSelectionState(),
        hideGridLines: true,
        theme: this.env.model.getters.getSpreadsheetTheme(),
      }),
    });
    this.onMouseWheel = useWheelHandler((deltaX, deltaY) => {
      this.moveCanvas(deltaX, deltaY);
      this.hoveredCell.clear();
    });
    this.cellPopovers = useStore(CellPopoverStore);

    useTouchHandlers(this.gridRef, {
      updateScroll: this.moveCanvas.bind(this),
      canMoveUp: () => {
        const { scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
        return scrollY > 0;
      },
      canMoveDown: () => {
        const { maxOffsetY } = this.env.model.getters.getMaximumSheetOffset();
        const { scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
        return scrollY < maxOffsetY;
      },
      getZoom: () => this.env.model.getters.getViewportZoomLevel(),
      setZoom: (zoom: number) => this.env.model.dispatch("SET_ZOOM", { zoom }),
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
    this.env.model.dispatch("RESIZE_SHEETVIEW", {
      width: Math.min(maxWidth, width),
      height,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
  }

  private moveCanvas(deltaX: Pixel, deltaY: Pixel) {
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: scrollX + deltaX,
      offsetY: scrollY + deltaY,
    });
  }

  private getGridRect(): Rect {
    return {
      ...getElBoundingRect(this.gridRef()),
      ...this.env.model.getters.getSheetViewDimensionWithHeaders(),
    };
  }

  private getMaxSheetWidth(): Pixel {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const { right } = this.env.model.getters.getSheetZone(sheetId);
    return this.env.model.getters.getColDimensions(sheetId, right).end;
  }

  get dashboardStyle() {
    const zoomLevel = this.env.model.getters.getViewportZoomLevel();
    return cssPropertiesToCss({ zoom: `${zoomLevel}` });
  }
}
