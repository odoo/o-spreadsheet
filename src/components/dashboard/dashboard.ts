import { signal, toRaw, useProps } from "@odoo/owl";
import { Component, useChildSubEnv } from "../../owl3_compatibility_layer";
import { useLocalStore, useStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { Pixel } from "../../types/misc";
import { DOMCoordinates, DOMDimension, OrderedLayers, Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { DelayedHoveredCellStore } from "../grid/delayed_hovered_cell_store";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect, isMiddleClickOrCtrlClick } from "../helpers/dom_helpers";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useTouchHandlers } from "../helpers/touch_handlers_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { getZoomedRect } from "../helpers/zoom";
import { CellPopoverStore } from "../popover/cell_popover_store";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";
import { HorizontalScrollBar } from "../scrollbar/scrollbar_horizontal";
import { VerticalScrollBar } from "../scrollbar/scrollbar_vertical";
import { ClickableCell, ClickableCellsStore } from "./clickable_cell_store";

export class SpreadsheetDashboard extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetDashboard";
  static components = {
    GridOverlay,
    GridPopover,
    Popover,
    VerticalScrollBar,
    HorizontalScrollBar,
  };

  protected props = useProps({
    getGridSize: types.function<() => DOMDimension>(),
  });

  protected cellPopovers!: Store<CellPopoverStore>;

  onMouseWheel!: (ev: WheelEvent) => void;
  canvasPosition!: DOMCoordinates;
  hoveredCell!: Store<DelayedHoveredCellStore>;
  clickableCellsStore!: Store<ClickableCellsStore>;
  private viewStore!: Store<ViewportsStore>;

  private gridRef = signal<HTMLElement | null>(null);
  private canvasRef = signal<HTMLElement | null>(null);

  setup() {
    this.hoveredCell = useStore(DelayedHoveredCellStore);
    this.clickableCellsStore = useStore(ClickableCellsStore);
    this.viewStore = useStore(ViewportsStore);

    const layers = OrderedLayers().filter((layer) => layer !== "Headers");
    const rendererStore = useLocalStore(RendererStore, layers);
    useChildSubEnv({
      getPopoverContainerRect: () => getZoomedRect(this.viewStore.zoomLevel, this.getGridRect()),
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
    this.onMouseWheel = useWheelHandler((deltaX, deltaY) => {
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
      getZoom: () => this.viewStore.zoomLevel,
      setZoom: (zoom: number) => this.viewStore.setZoom(zoom),
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

  getCellClickableStyle(coordinates: Rect) {
    return cssPropertiesToCss({
      top: `${coordinates.y}px`,
      left: `${coordinates.x}px`,
      width: `${coordinates.width}px`,
      height: `${coordinates.height}px`,
    });
  }

  /**
   * Get all the boxes for the cell in the sheet view that are clickable.
   * This function is used to render an overlay over each clickable cell in
   * order to display a pointer cursor.
   *
   */
  getClickableCells(): ClickableCell[] {
    return toRaw(this.clickableCellsStore.clickableCells);
  }

  selectClickableCell(ev: MouseEvent, clickableCell: ClickableCell) {
    const { position, action } = clickableCell;
    action(position, this.env, isMiddleClickOrCtrlClick(ev));
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

  private getGridRect(): Rect {
    return {
      ...getElBoundingRect(this.gridRef()),
      ...this.viewStore.sheetViewDimensionWithHeaders,
    };
  }

  private getMaxSheetWidth(): Pixel {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const { right } = this.env.model.getters.getSheetZone(sheetId);
    return this.env.model.getters.getColDimensions(sheetId, right).end;
  }

  get dashboardStyle() {
    const zoomLevel = this.viewStore.zoomLevel;
    const style = { zoom: `${zoomLevel}` };
    const sheet = this.env.model.getters.getActiveSheet();
    if (sheet.backgroundColor) {
      style["background-color"] = "transparent";
    }
    return cssPropertiesToCss(style);
  }

  get backgroundStyle() {
    const sheet = this.env.model.getters.getActiveSheet();
    return sheet.backgroundColor
      ? cssPropertiesToCss({
          "background-color": sheet.backgroundColor,
        })
      : "";
  }
}
