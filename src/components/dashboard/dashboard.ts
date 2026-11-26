import { providePlugins, signal, usePlugin, useProps } from "@odoo/owl";
import { DevicePixelRatioPlugin } from "../../owl_plugins/device_pixel_ratio_owl_plugin";
import { RendererPlugin } from "../../owl_plugins/renderer_plugin";
import { ViewportsPlugin } from "../../owl_plugins/viewports_owl_plugin";
import { ZoomPlugin } from "../../owl_plugins/zoom_plugin";
import { useLocalStore } from "../../store_engine/store_hooks";
import { Pixel } from "../../types/misc";
import { DOMCoordinates, DOMDimension, OrderedLayers, Rect } from "../../types/rendering";
import { ClickableCellsOverlay } from "../clickable_cells_overlay/clickable_cells_overlay";
import { FiguresContainer } from "../figures/figure_container/figure_container";
import { DelayedHoveredCellPlugin } from "../grid/delayed_hovered_cell_owl_plugin";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { GridPopover } from "../grid_popover/grid_popover";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useTouchHandlers } from "../helpers/touch_handlers_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { OSComponent } from "../os_component";
import { CellPopoverPlugin } from "../popover/cell_popover_owl_plugin";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";
import { HorizontalScrollBar } from "../scrollbar/scrollbar_horizontal";
import { VerticalScrollBar } from "../scrollbar/scrollbar_vertical";
import { HoveredTableStore } from "../tables/hovered_table_store";

export class SpreadsheetDashboard extends OSComponent {
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

  protected cellPopovers = usePlugin(CellPopoverPlugin);

  onMouseWheel!: (ev: WheelEvent) => void;
  canvasPosition!: DOMCoordinates;
  private viewPlugin = usePlugin(ViewportsPlugin);
  private hoveredCell = usePlugin(DelayedHoveredCellPlugin);
  private zoomPlugin = usePlugin(ZoomPlugin);
  private devicePixelRatioPlugin = usePlugin(DevicePixelRatioPlugin);

  private gridRef = signal.ref();
  private canvasRef = signal.ref(HTMLCanvasElement);

  setup() {
    useLocalStore(HoveredTableStore);

    const layers = OrderedLayers().filter((layer) => layer !== "Headers");
    providePlugins([RendererPlugin], { layers });
    const rendererPlugin = usePlugin(RendererPlugin);

    useGridDrawing({
      canvasRef: this.canvasRef,
      renderingCtx: () => ({
        dpr: this.devicePixelRatioPlugin.devicePixelRatio() || 1,
        viewports: this.viewPlugin.viewports(),
        ...this.model().getters.getSelectionState(),
        hideGridLines: true,
      }),
      rendererPlugin,
    });
    this.onMouseWheel = useWheelHandler((deltaX, deltaY) => {
      this.moveCanvas(deltaX, deltaY);
      this.hoveredCell.clear();
    });

    useTouchHandlers(this.gridRef, {
      updateScroll: this.moveCanvas.bind(this),
      canMoveUp: () => {
        const { scrollY } = this.viewPlugin.activeSheetScrollInfo;
        return scrollY > 0;
      },
      canMoveDown: () => {
        const { maxOffsetY } = this.viewPlugin.maximumSheetOffset;
        const { scrollY } = this.viewPlugin.activeSheetScrollInfo;
        return scrollY < maxOffsetY;
      },
      getZoom: () => this.zoomPlugin.zoomLevel(),
      setZoom: (zoom: number) => this.zoomPlugin.setZoom(zoom),
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
    this.viewPlugin.resizeSheetView({
      height,
      width: Math.min(maxWidth, width),
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
  }

  private moveCanvas(deltaX: Pixel, deltaY: Pixel) {
    const { scrollX, scrollY } = this.viewPlugin.activeSheetScrollInfo;
    this.viewPlugin.setViewportOffset({ offsetX: scrollX + deltaX, offsetY: scrollY + deltaY });
  }

  getGridRect(): Rect {
    return {
      ...getElBoundingRect(this.gridRef()),
      ...this.viewPlugin.sheetViewDimensionWithHeaders,
    };
  }

  private getMaxSheetWidth(): Pixel {
    const sheetId = this.viewPlugin.displayedSheetId();
    const { right } = this.model().getters.getSheetZone(sheetId);
    return this.model().getters.getColDimensions(sheetId, right).end;
  }

  get dashboardStyle() {
    const style = { zoom: this.zoomPlugin.zoomLevel().toString() };
    return cssPropertiesToCss(style);
  }

  get backgroundStyle() {
    const sheet = this.model().getters.getActiveSheet();
    return cssPropertiesToCss({ "background-color": sheet.backgroundColor });
  }
}
