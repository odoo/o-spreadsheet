import { props, proxy, signal } from "@odoo/owl";
import { sumArray } from "../../helpers/misc";
import { Component, useChildSubEnv, useLayoutEffect } from "../../owl3_compatibility_layer";
import { useChildStoreProvider, useLocalStore, useStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { HeaderIndex, PixelOffset } from "../../types/misc";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { ClickableCellsOverlay } from "../clickable_cells_overlay/clickable_cells_overlay";
import { GridOverlay } from "../grid_overlay/grid_overlay";
import { HoveredIconStore } from "../grid_overlay/hovered_icon_store";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect } from "../helpers/dom_helpers";
import { startDnd } from "../helpers/drag_and_drop";
import { useGridDrawing } from "../helpers/draw_grid_hook";
import { useWheelHandler } from "../helpers/wheel_hook";
import { withZoom } from "../helpers/zoom";
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

  protected props = props({
    range: types.Range(),
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
    useChildStoreProvider([ViewportsStore, HoveredIconStore, HoveredTableStore]);
    this.store = useLocalStore(StandaloneViewportStore, this.props.range, this.props.columnWeights);
    this.viewStore = useStore(ViewportsStore);
    this.viewStore.resizeSheetView({
      height: this.containerHeight,
      width: this.containerWidth,
    });
    // @ts-ignore ADRM TODO
    this.viewStore.setGetHeaderDimensionsCallback(this.store.headerDimensionsCallback);
    this.viewStore.setZoneToDisplay(this.props.range.zone);
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
        this.viewStore.setZoneToDisplay(this.props.range.zone);
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
    const self = this;
    // FIXME CAROUSELS: this is not great, as nothing prevents the child components to use getters.getViewportCollection()
    // instead of env.viewports. The clean way would probably be to make the viewports/selection into a store.
    useChildSubEnv({
      get sheetId() {
        return self.store.renderingContext.sheetId;
      },
    });

    this.onMouseWheel = useWheelHandler((deltaX, deltaY, ev) => {
      if (this.hasVerticalScrollBar) {
        ev.stopPropagation();
        ev.preventDefault();

        const scroll = this.store.renderingContext.viewports.getSheetScrollInfo(
          this.props.range.sheetId
        );
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
    this.store.renderingContext.viewports.setSheetViewOffset(
      this.props.range.sheetId,
      offset.offsetX,
      offset.offsetY
    );
    this.render(true); // FIXME CAROUSELS: remove this once the viewports are a store and do a render
  }

  get hasVerticalScrollBar() {
    return (
      this.store.renderingContext.viewports.getMainViewportRect(this.props.range.sheetId).height >
      this.containerHeight
    );
  }

  get scrollBarContainerStyle() {
    return cssPropertiesToCss({
      width: `${this.store.renderingContext.viewports.getScrollBarWidth()}px`,
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
      const colDimensions = this.store.renderingContext.viewports.getColDimensionsInViewport(
        sheetId,
        col
      );

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
