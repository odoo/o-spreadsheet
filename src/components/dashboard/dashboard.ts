import { providePlugins, signal, useProps } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useLocalStore, useStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { ZoomStore } from "../../stores/zoom_store";
import { Pixel } from "../../types/misc";
import { DOMCoordinates, DOMDimension, OrderedLayers, Rect } from "../../types/rendering";
import { SpreadsheetComponentEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { ClickableCellsOverlay } from "../clickable_cells_overlay/clickable_cells_overlay";
import { FiguresContainer } from "../figures/figure_container/figure_container";
import { DelayedHoveredCellStore } from "../grid/delayed_hovered_cell_store";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useTouchHandlers } from "../helpers/touch_handlers_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { CellPopoverStore } from "../popover/cell_popover_store";
import { Popover } from "../popover/popover";
import { PopoverContainerPlugin } from "../popover/popover_container_owl_plugin";
import { types } from "../props_validation";
import { HorizontalScrollBar } from "../scrollbar/scrollbar_horizontal";
import { VerticalScrollBar } from "../scrollbar/scrollbar_vertical";
import { HoveredTableStore } from "../tables/hovered_table_store";

export class SpreadsheetDashboard extends Component<SpreadsheetComponentEnv> {
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
