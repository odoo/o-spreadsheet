import { providePlugins, proxy, signal, untrack, useEffect, usePlugin, useProps } from "@odoo/owl";
import { sumArray } from "../../helpers/misc";
import { RendererPlugin } from "../../owl_plugins/renderer_plugin";
import { ViewportsPlugin, ViewportsPluginInstance } from "../../owl_plugins/viewports_owl_plugin";
import { ZoomPlugin } from "../../owl_plugins/zoom_plugin";
import { useChildStoreProvider, useLocalStore, useStore } from "../../store_engine/store_hooks";
import { CellHoverOverlayStore } from "../../stores/cell_hover_overlay_store";
import { HeaderIndex } from "../../types/misc";
import { DOMDimension, Rect } from "../../types/rendering";
import { Store } from "../../types/store_engine";
import { ClickableCellsOverlay } from "../clickable_cells_overlay/clickable_cells_overlay";
import { ClickableCellsStore } from "../dashboard/clickable_cell_store";
import { DelayedHoveredCellStore } from "../grid/delayed_hovered_cell_store";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { HoveredIconStore } from "../grid_overlay/hovered_icon_store";
import { GridPopover } from "../grid_popover/grid_popover";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { startDnd } from "../helpers/drag_and_drop";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { OSComponent } from "../os_component";
import { CellPopoverStore } from "../popover/cell_popover_store";
import { types } from "../props_validation";
import { VerticalScrollBar } from "../scrollbar/scrollbar_vertical";
import { StandaloneViewportStore } from "./standalone_viewport_store";

interface ColResizer {
  col: HeaderIndex;
  style: string;
}

interface DnDResizeState {
  col: HeaderIndex | undefined;
}

export class StandaloneViewport extends OSComponent {
  static template = "o-spreadsheet-StandaloneViewport";
  static components = { VerticalScrollBar, GridOverlay, ClickableCellsOverlay, GridPopover };

  protected props = useProps({
    range: types.Range(),
    canResizeColumns: types.boolean().optional(true),
    onResizeColumns: types.function<(columnWeights: number[] | undefined) => void>().optional(),
    columnWeights: types.array<number>().optional(),
    size: types.object<DOMDimension>(),
  });

  private canvasRef = signal.ref(HTMLCanvasElement);
  private containerRef = signal.ref();

  private store!: Store<StandaloneViewportStore>;

  dndState = proxy<DnDResizeState>({
    col: undefined,
  });

  onMouseWheel!: (ev: WheelEvent) => void;

  viewPlugin!: ViewportsPluginInstance;
  zoomPlugin = usePlugin(ZoomPlugin);
  cellPopoverStore!: Store<CellPopoverStore>;

  setup() {
    providePlugins([ViewportsPlugin]);
    useChildStoreProvider([
      HoveredIconStore,
      ClickableCellsStore,
      CellHoverOverlayStore,
      DelayedHoveredCellStore,
      CellPopoverStore,
    ]);
    this.viewPlugin = usePlugin(ViewportsPlugin);
    this.store = useLocalStore(StandaloneViewportStore, this.props.range, this.props.columnWeights);
    this.cellPopoverStore = useStore(CellPopoverStore);
    providePlugins([RendererPlugin], { layers: ["Background", "Chart"] });
    const rendererPlugin = usePlugin(RendererPlugin);
    useEffect(() => {
      this.store.setRange(this.props.range);
      if (this.dndState.col === undefined) {
        this.store.setCustomColWeights(this.props.columnWeights);
      }
      const { width, height } = this.props.size;
      const scrollBarWidth = this.zoomPlugin.scrollBarWidth();
      // `hasVerticalScrollBar` reads the viewport that `setContainerSize` then resizes.
      // Reading it untracked keeps this effect from depending on its own writes once the
      // viewports become reactive: a computation that invalidates itself is silently
      // dropped by owl, which would leave the container one scrollbar width too wide.
      // The size and the zoom are read tracked, as they are today.
      const contentWidth = untrack(() => this.hasVerticalScrollBar)
        ? width - scrollBarWidth
        : width;
      this.store.setContainerSize(contentWidth, height);
    });

    useGridDrawing({
      canvasRef: this.canvasRef,
      renderingCtx: () => this.store.renderingContext,
      rendererPlugin,
    });

    this.onMouseWheel = useWheelHandler((deltaX, deltaY, ev) => {
      if (this.hasVerticalScrollBar) {
        ev.stopPropagation();
        ev.preventDefault();

        const scroll = this.viewPlugin.activeSheetScrollInfo;
        this.viewPlugin.setViewportOffset({
          offsetX: scroll.scrollX + deltaX,
          offsetY: scroll.scrollY + deltaY,
        });
      }
    });
  }

  get contentWidth() {
    return this.hasVerticalScrollBar
      ? this.props.size.width - this.zoomPlugin.scrollBarWidth()
      : this.props.size.width;
  }

  get hasVerticalScrollBar() {
    return (
      this.viewPlugin.mainViewportCoordinates.y + this.viewPlugin.mainViewportRect.height >
      this.props.size.height
    );
  }

  get scrollBarContainerStyle() {
    return cssPropertiesToCss({
      width: `${this.zoomPlugin.scrollBarWidth()}px`,
    });
  }

  onCellDoubleClicked(col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) {
    if (!this.model().getters.isDashboard()) {
      ev.stopPropagation();
      const activeSheetId = this.model().getters.getActiveSheetId();
      if (this.props.range.sheetId !== activeSheetId) {
        this.model().dispatch("ACTIVATE_SHEET", {
          sheetIdFrom: activeSheetId,
          sheetIdTo: this.props.range.sheetId,
        });
      }
      this.model().selection.selectCell(col, row);
      return;
    }
  }

  get gridOverlayDimensions() {
    const { sheetId, zone } = this.props.range;
    const rect = this.viewPlugin.viewports().getVisibleRect(sheetId, zone);
    return cssPropertiesToCss({ height: `${rect.height}px`, width: `${rect.width}px` });
  }

  get colResizers(): ColResizer[] {
    const resizers: ColResizer[] = [];
    const zone = this.props.range.zone;
    const sheetId = this.props.range.sheetId;
    for (let col = zone.left; col < zone.right; col++) {
      if (this.model().getters.isColHidden(sheetId, col)) {
        continue;
      }
      const colDimensions = this.viewPlugin.viewports().getColDimensionsInViewport(sheetId, col);
      const style = cssPropertiesToCss({ left: `${colDimensions.end}px` });
      resizers.push({ style, col });
    }
    return resizers;
  }

  onResizerPointerDown(ev: MouseEvent, resizer: ColResizer) {
    if (ev.button !== 0) {
      return;
    }
    this.dndState.col = resizer.col;

    const initialX = this.zoomPlugin.getZoomedEvent(ev).clientX;
    const startingColWeights = this.store.columnWeights;
    const totalWeight = sumArray(startingColWeights);
    let deltaX = 0;

    const onMouseUp = (ev: MouseEvent) => {
      this.dndState.col = undefined;
      if (deltaX) {
        this.props.onResizeColumns?.(this.store.columnWeights);
      }
    };
    const onMouseMove = (ev: MouseEvent) => {
      deltaX = this.zoomPlugin.getZoomedEvent(ev).clientX - initialX;

      const weightDelta = (deltaX / this.props.size.width) * totalWeight;
      this.store.resizeColumn(resizer.col, weightDelta, startingColWeights);
    };
    startDnd(onMouseMove, onMouseUp);
  }

  onResizerDoubleClick() {
    this.props.onResizeColumns?.(undefined);
  }

  getGridRect(): Rect {
    return {
      ...getElBoundingRect(this.containerRef()),
      ...this.viewPlugin.sheetViewDimensionWithHeaders,
    };
  }
}
