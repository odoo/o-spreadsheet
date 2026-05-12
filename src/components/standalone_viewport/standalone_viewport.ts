import { proxy, signal, useEffect, useProps } from "@odoo/owl";
import { sumArray } from "../../helpers/misc";
import { Component } from "../../owl3_compatibility_layer";
import { useChildStoreProvider, useLocalStore, useStore } from "../../store_engine/store_hooks";
import { RendererStore } from "../../stores/renderer_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { HeaderIndex } from "../../types/misc";
import { Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
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

export class StandaloneViewport extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-StandaloneViewport";
  static components = { VerticalScrollBar, GridOverlay, ClickableCellsOverlay, GridPopover };

  protected props = useProps({
    range: types.Range(),
    canResizeColumns: types.boolean().optional(true),
    onResizeColumns: types.function<(columnWeights: number[] | undefined) => void>().optional(),
    columnWeights: types.array<number>().optional(),
    zoomLevel: types.number(),
  });

  private canvasRef = signal<HTMLElement | null>(null);
  private containerRef = signal<HTMLElement | null>(null);

  private store!: Store<StandaloneViewportStore>;

  dndState = proxy<DnDResizeState>({
    col: undefined,
  });

  onMouseWheel!: (ev: WheelEvent) => void;

  rendererStore!: Store<RendererStore>;
  viewStore!: Store<ViewportsStore>;
  cellPopoverStore!: Store<CellPopoverStore>;

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
    this.cellPopoverStore = useStore(CellPopoverStore);
    this.rendererStore = useLocalStore(RendererStore, ["Background", "Chart"]);
    const resizeObserver = new ResizeObserver(() => {
      this.store.setContainerSize(this.containerWidth, this.containerHeight);
    });
    useEffect(() => {
      const el = this.containerRef();
      if (el) {
        resizeObserver.observe(el);
      }
      return () => resizeObserver.disconnect();
    });
    useEffect(() => {
      this.store.setRange(this.props.range);
      if (this.dndState.col === undefined) {
        this.store.setCustomColWeights(this.props.columnWeights);
      }
      this.viewStore.setZoom(this.props.zoomLevel);
      this.store.setContainerSize(this.containerWidth, this.containerHeight);
    });

    useGridDrawing({
      canvasRef: this.canvasRef,
      renderingCtx: () => this.store.renderingContext,
      rendererStore: this.rendererStore,
    });

    this.onMouseWheel = useWheelHandler((deltaX, deltaY, ev) => {
      if (this.hasVerticalScrollBar) {
        ev.stopPropagation();
        ev.preventDefault();

        const scroll = this.viewStore.activeSheetScrollInfo;
        this.viewStore.setViewportOffset({
          offsetX: scroll.scrollX + deltaX,
          offsetY: scroll.scrollY + deltaY,
        });
      }
    });
  }

  get containerWidth() {
    return Math.floor(getElBoundingRect(this.containerRef()).width / this.viewStore.zoomLevel);
  }

  get containerHeight() {
    return Math.floor(getElBoundingRect(this.containerRef()).height / this.viewStore.zoomLevel);
  }

  get hasVerticalScrollBar() {
    return (
      this.containerHeight &&
      this.viewStore.mainViewportCoordinates.y + this.viewStore.mainViewportRect.height >
        this.containerHeight
    );
  }

  get scrollBarContainerStyle() {
    return cssPropertiesToCss({
      width: `${this.viewStore.scrollBarWidth}px`,
    });
  }

  onCellDoubleClicked(col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) {
    if (!this.env.model.getters.isDashboard()) {
      ev.stopPropagation();
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
    const { sheetId, zone } = this.props.range;
    const rect = this.viewStore.viewports.getVisibleRect(sheetId, zone);
    return cssPropertiesToCss({ height: `${rect.height}px`, width: `${rect.width}px` });
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

    const initialX = withZoom(this.env, ev).clientX;
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
      deltaX = withZoom(this.env, ev).clientX - initialX;

      const weightDelta = (deltaX / this.containerWidth) * totalWeight;
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
      ...this.viewStore.sheetViewDimensionWithHeaders,
    };
  }
}
