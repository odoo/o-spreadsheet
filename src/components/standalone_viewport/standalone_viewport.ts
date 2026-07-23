import { proxy, signal, useProps } from "@odoo/owl";
import { sumArray } from "../../helpers/misc";
import { Component, useLayoutEffect } from "../../owl3_compatibility_layer";
import { useChildStoreProvider, useLocalStore, useStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { HeaderIndex, PixelOffset } from "../../types/misc";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { ClickableCellsOverlay } from "../clickable_cells_overlay/clickable_cells_overlay";
import { ClickableCellsStore } from "../dashboard/clickable_cell_store";
import { DelayedHoveredCellStore } from "../grid/delayed_hovered_cell_store";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { HoveredIconStore } from "../grid_overlay/hovered_icon_store";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { startDnd } from "../helpers/drag_and_drop";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { withZoom } from "../helpers/zoom";
import { CellPopoverStore } from "../popover/cell_popover_store";
import { types } from "../props_validation";
import { VerticalScrollBar } from "../scrollbar/scrollbar_vertical";
import { HoveredTableStore } from "../tables/hovered_table_store";
import { StandaloneViewportStore } from "./standalone_viewport_store";

interface ColResizer {
  col: HeaderIndex;
  style: string;
}

interface DnDResizeState {
  col: HeaderIndex | undefined;
}

// FIXME CAROUSELS: it doesn't work with zoom
// FIXME CAROUSELS: clickable cells, grid popover
// ADRM TODO DISCUSS: Make selection into a store & move everything ? idk it's hard

// ADRM TODO DISCUSS: discuss with francois: dynamic columns makes it very awkward with static column weights ...

export class StandaloneViewport extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneViewport";
  static components = { VerticalScrollBar, GridOverlay, ClickableCellsOverlay };

  protected props = useProps({
    range: types.Range(),
    canResizeColumns: types.boolean().optional(true),
    onResizeColumns: types.function<(columnWeights: number[] | undefined) => void>().optional(),
    columnWeights: types.array<number>().optional(),
  });

  private canvasRef = signal<HTMLElement | null>(null);
  private containerRef = signal<HTMLElement | null>(null);

  private store!: Store<StandaloneViewportStore>;

  private dndState = proxy<DnDResizeState>({
    col: undefined,
  });

  onMouseWheel!: (ev: WheelEvent) => void;

  rendererStore!: Store<RendererStore>;
  viewStore!: Store<ViewportsStore>;

  setup() {
    useChildStoreProvider([
      ViewportsStore,
      HoveredIconStore,
      HoveredTableStore,
      ClickableCellsStore,
      DelayedHoveredCellStore,
      CellPopoverStore,
    ]);
    this.store = useLocalStore(StandaloneViewportStore, this.props.range, this.props.columnWeights);
    this.viewStore = useStore(ViewportsStore);
    // @ts-ignore ADRM TODO
    const getHeaderDimensionsCallback = this.store.headerDimensionsCallback;
    this.viewStore.setDisplayedSheetId(this.props.range.sheetId);
    this.viewStore.setViewportArgs({
      getHeaderDimensions: getHeaderDimensionsCallback,
      zoneToDisplay: this.props.range.zone,
      getFooterSize: () => 0,
    });
    this.rendererStore = useLocalStore(RendererStore, ["Background", "Chart"]);
    useLayoutEffect(
      () => {
        this.store.setContainerSize(this.containerWidth, this.containerHeight);
        this.viewStore.resizeSheetView({
          height: this.containerHeight,
          width: this.containerWidth,
        });
      },
      () => [this.containerWidth, this.containerHeight]
    );
    useLayoutEffect(
      () => {
        this.store.setRange(this.props.range);
        this.viewStore.setDisplayedSheetId(this.props.range.sheetId);
        this.viewStore.setViewportArgs({ zoneToDisplay: this.props.range.zone });
      },
      () => [this.props.range.sheetId, this.env.model.getters.getRangeString(this.props.range)]
    );
    useLayoutEffect(
      () => this.store.setCustomColWeights(this.props.columnWeights),
      () => [this.props.columnWeights]
    );

    useGridDrawing({
      canvasRef: this.canvasRef,
      renderingCtx: () => this.store.renderingContext,
      rendererStore: this.rendererStore,
      changeCanvasSizeOnZoom: true,
    });

    this.onMouseWheel = useWheelHandler((deltaX, deltaY, ev) => {
      if (this.hasVerticalScrollBar) {
        ev.stopPropagation();
        ev.preventDefault();

        const scroll = this.viewStore.viewports.getSheetScrollInfo(this.props.range.sheetId);
        this.onScroll({ offsetX: scroll.scrollX + deltaX, offsetY: scroll.scrollY + deltaY });
      }
    });
  }

  get containerWidth() {
    return Math.floor(getElBoundingRect(this.containerRef()).width);
  }

  get containerHeight() {
    return Math.floor(getElBoundingRect(this.containerRef()).height);
  }

  onScroll(offset: PixelOffset) {
    this.viewStore.viewports.setSheetViewOffset(
      this.props.range.sheetId,
      offset.offsetX,
      offset.offsetY
    );
    this.render(true); // FIXME CAROUSELS: remove this once the viewports are a store and do a render
  }

  get hasVerticalScrollBar() {
    return (
      this.viewStore.viewports.getMainViewportRect(this.props.range.sheetId).height >
      this.containerHeight
    );
  }

  get scrollBarContainerStyle() {
    return cssPropertiesToCss({
      width: `${this.viewStore.viewports.getScrollBarWidth()}px`,
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

  get colResizers(): ColResizer[] {
    const resizers: ColResizer[] = [];
    const zone = this.props.range.zone;
    const sheetId = this.props.range.sheetId;
    for (let col = zone.left; col < zone.right; col++) {
      if (this.env.model.getters.isColHidden(sheetId, col)) {
        continue;
      }
      const colDimensions = this.viewStore.viewports.getColDimensionsInViewport(sheetId, col);

      const left = this.dndState.col === col ? colDimensions.end : colDimensions.end;

      const style = cssPropertiesToCss({ left: `${left}px` });
      resizers.push({ style, col });
    }
    return resizers;
  }

  onResizerPointerDown(ev: MouseEvent, resizer: ColResizer) {
    if (ev.button !== 0) {
      return;
    }
    this.dndState.col = resizer.col;
    const zoomedMouseEvent = withZoom(this.env, ev);

    const initialX = zoomedMouseEvent.clientX;
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
      const zoomedMouseEvent = withZoom(this.env, ev);
      deltaX = zoomedMouseEvent.clientX - initialX;

      const weightDelta = (deltaX / this.containerWidth) * totalWeight;
      this.store.resizeColumn(resizer.col, weightDelta, startingColWeights);
    };
    startDnd(onMouseMove, onMouseUp);
  }

  onResizerDoubleClick() {
    this.props.onResizeColumns?.(undefined);
  }
}
