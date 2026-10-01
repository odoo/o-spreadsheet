import { Plugin, proxy, useConfig, usePlugin } from "@odoo/owl";
import { DRAG_THRESHOLD } from "../../../constants";
import { isDefined } from "../../../helpers/misc";
import { rectUnion } from "../../../helpers/rectangle";
import { ModelPlugin } from "../../../owl_plugins/model_owl_plugin";
import { figureRegistry } from "../../../registries/figures_registry";
import { ChartDragStore } from "../../../stores/chart_drag_store";
import { ViewportsStore } from "../../../stores/viewports_store";
import { ZoomStore } from "../../../stores/zoom_store";
import { Figure, FigureUI, ResizeDirection } from "../../../types/figure";
import { UID } from "../../../types/misc";
import { DOMCoordinates, DOMDimension, Rect } from "../../../types/rendering";
import { Store } from "../../../types/store_engine";
import { getOverlappedFigure } from "../../helpers/chart_drag_and_drop";
import { cssPropertiesToCss, rectToCss } from "../../helpers/css";
import { startDnd } from "../../helpers/drag_and_drop";
import { dragFigureForMove, dragFigureForResize } from "../../helpers/figure_drag_helper";
import {
  HFigureAxisType,
  SnapLine,
  VFigureAxisType,
  snapForMove,
  snapForResize,
} from "../../helpers/figure_snap_helper";

interface Snap<T extends HFigureAxisType | VFigureAxisType> {
  line: SnapLine<T>;
  lineStyle: string;
  containerStyle: string;
}

interface DndState {
  draggedFigure?: FigureUI;
  selectedFigures?: FigureUI[];
  selectedRect?: Rect;
  horizontalSnap?: Snap<HFigureAxisType>;
  verticalSnap?: Snap<VFigureAxisType>;
  cancelDnd: (() => void) | undefined;
}

interface DragCallbacks {
  onDragEnd: (droppedFigures: Figure[], overlappingFigureId: UID | undefined) => void;
  onMouseUpWithoutDrag?: () => void;
}

export class DraggedFigurePlugin extends Plugin {
  dnd = proxy<DndState>({
    draggedFigure: undefined,
    selectedFigures: undefined,
    selectedRect: undefined,
    horizontalSnap: undefined,
    verticalSnap: undefined,
    cancelDnd: undefined,
  });
  private viewStore: Store<ViewportsStore> = useConfig("viewStore");
  private zoomStore: Store<ZoomStore> = useConfig("zoomStore");
  private chartDragStore: Store<ChartDragStore> = useConfig("chartDragStore");
  private model = usePlugin(ModelPlugin).model;

  private getFiguresOnScreen(): FigureUI[] {
    const visibleFigures = this.viewStore.visibleFigures;
    for (const figure of this.dnd.selectedFigures || []) {
      if (!visibleFigures.some((figureUI) => figureUI.id === figure.id)) {
        visibleFigures.push(figure);
      }
    }
    return visibleFigures.map((figure) => this.toScreenPosition(figure));
  }

  get selectedRectStyle(): string {
    return this.dnd.selectedRect ? cssPropertiesToCss(rectToCss(this.dnd.selectedRect)) : "";
  }

  get sheetBoundaries(): Rect {
    const sheetId = this.model().getters.getActiveSheetId();
    const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;
    return {
      x: 0 - scrollX,
      y: 0 - scrollY,
      width: this.model().getters.getColDimensions(
        sheetId,
        this.model().getters.getNumberCols(sheetId) - 1
      ).end,
      height: this.model().getters.getRowDimensions(
        sheetId,
        this.model().getters.getNumberRows(sheetId) - 1
      ).end,
    };
  }

  private getDndFigureRect(): Rect | undefined {
    if (this.dnd.selectedFigures && this.dnd.selectedFigures.length > 1) {
      return rectUnion(...this.dnd.selectedFigures);
    }
    return;
  }

  private toScreenPosition(figureUI: FigureUI): FigureUI {
    const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;
    const screenFigure = { ...figureUI };
    const pane = this.getFigurePane(figureUI.id);

    if (pane === "bottomLeft") {
      screenFigure.y -= scrollY;
    } else if (pane === "topRight") {
      screenFigure.x -= scrollX;
    } else if (pane === "bottomRight") {
      screenFigure.x -= scrollX;
      screenFigure.y -= scrollY;
    }

    return screenFigure;
  }

  private getFigurePane(figureId: UID): "topLeft" | "topRight" | "bottomLeft" | "bottomRight" {
    const sheetId = this.model().getters.getActiveSheetId();
    const figure = this.model().getters.getFigure(sheetId, figureId);
    if (!figure) {
      throw new Error(`Figure with ID ${figureId} not found`);
    }
    const figureUI = this.model().getters.getFigureUI(sheetId, figure);
    const { x: viewportX, y: viewportY } = this.viewStore.mainViewportCoordinates;
    if (figureUI.x < viewportX && figureUI.y < viewportY) {
      return "topLeft";
    } else if (figureUI.x < viewportX) {
      return "bottomLeft";
    } else if (figureUI.y < viewportY) {
      return "topRight";
    } else {
      return "bottomRight";
    }
  }

  /**
   * Convert a figure's screen coordinates to spreadsheet coordinates.
   */
  private toSpreadsheetFigure(figureUI: FigureUI): Figure {
    const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;
    // FIXME: we need to always add the scroll (even in frozen panes) to make getPositionAnchorOffset work, something is strange
    const spreadsheetFigure = { ...figureUI, x: figureUI.x + scrollX, y: figureUI.y + scrollY };
    const sheetId = this.model().getters.getActiveSheetId();

    return {
      ...figureUI,
      ...this.viewStore.viewports.getPositionAnchorOffset(sheetId, spreadsheetFigure),
    };
  }

  startDraggingFigure(figureUI: FigureUI, ev: MouseEvent, callbacks: DragCallbacks) {
    const sheetId = this.model().getters.getActiveSheetId();
    const zoom = this.zoomStore.zoomLevel;
    const initialMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
    const selectedFiguresIds = this.model().getters.getSelectedFigureIds();
    const initialFigures = selectedFiguresIds
      .map((id) => this.model().getters.getFigure(sheetId, id))
      .filter(isDefined)
      .map((f) => this.model().getters.getFigureUI(sheetId, f))
      .map(this.toScreenPosition.bind(this));

    const draggedFigureId = figureUI.id;

    let hasStartedDnd = false;
    let overlappingChartOrCarousel: FigureUI | undefined = undefined;
    const onMouseMove = (ev: MouseEvent) => {
      const currentMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };

      const offsetX = Math.abs(currentMousePosition.x - initialMousePosition.x);
      const offsetY = Math.abs(currentMousePosition.y - initialMousePosition.y);
      if (!hasStartedDnd && offsetX < DRAG_THRESHOLD && offsetY < DRAG_THRESHOLD) {
        return; // add a small threshold to avoid dnd when just clicking
      }
      hasStartedDnd = true;

      const selectedFigures = dragFigureForMove(
        currentMousePosition,
        initialMousePosition,
        initialFigures,
        this.sheetBoundaries
      );
      const draggedFigure = selectedFigures.find((f) => f.id === draggedFigureId);

      overlappingChartOrCarousel = undefined;
      const otherFigures = this.getOtherFigures(selectedFigures.map((f) => f.id));
      if (draggedFigure && !selectedFigures.find((f) => f.tag !== "chart")) {
        overlappingChartOrCarousel = getOverlappedFigure(draggedFigure, otherFigures, [
          "carousel",
          "chart",
        ]);
      }
      this.chartDragStore.setHighlightedFigure(overlappingChartOrCarousel?.id);

      if (!overlappingChartOrCarousel) {
        const snapReturn = snapForMove(
          { model: this.model(), isPositionVisible: this.isPositionVisible.bind(this) },
          selectedFigures,
          otherFigures
        );

        this.dnd.selectedFigures = snapReturn.snappedFigures;
        this.dnd.selectedRect = this.getDndFigureRect();
        this.dnd.draggedFigure = selectedFigures.find((f) => f.id === draggedFigureId);
        this.dnd.horizontalSnap = this.getSnap(snapReturn.horizontalSnapLine);
        this.dnd.verticalSnap = this.getSnap(snapReturn.verticalSnapLine);
      } else {
        this.dnd.draggedFigure = draggedFigure;
        this.dnd.selectedFigures = selectedFigures;
        this.dnd.selectedRect = this.getDndFigureRect();
        this.dnd.horizontalSnap = undefined;
        this.dnd.verticalSnap = undefined;
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      if (this.dnd.selectedFigures) {
        callbacks.onDragEnd(
          this.dnd.selectedFigures.map((f) => this.toSpreadsheetFigure(f)),
          overlappingChartOrCarousel?.id
        );
      } else {
        callbacks.onMouseUpWithoutDrag?.();
      }
      this.stopDragAndDrop();
    };

    this.dnd.cancelDnd = startDnd(onMouseMove, onMouseUp);
  }

  /**
   * Initialize the resize of the selected figures with mouse movements
   *
   * @param dirX X direction of the resize. -1 : resize from the left border of the figure, 0 : no resize in X, 1 :
   * resize from the right border of the figure
   * @param dirY Y direction of the resize. -1 : resize from the top border of the figure, 0 : no resize in Y, 1 :
   * resize from the bottom border of the figure
   * @param ev Mouse Event
   */
  resizeAllSelectedFigures(
    dirX: ResizeDirection,
    dirY: ResizeDirection,
    ev: MouseEvent,
    callbacks: Pick<DragCallbacks, "onDragEnd">
  ) {
    ev.stopPropagation();

    const sheetId = this.model().getters.getActiveSheetId();
    const zoom = this.zoomStore.zoomLevel;
    const initialMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
    const initialScrollPosition = this.viewStore.activeSheetScrollInfo;
    const selectedFiguresIds = this.model().getters.getSelectedFigureIds();
    const initialFigures = selectedFiguresIds
      .map((id) => this.model().getters.getFigure(sheetId, id))
      .filter(isDefined)
      .map((figure) => this.model().getters.getFigureUI(sheetId, figure))
      .map(this.toScreenPosition.bind(this));

    const multipleFiguresSelected = selectedFiguresIds.length > 1;
    if (initialFigures.length === 0) {
      return;
    }
    let minAggregateSize: DOMDimension;
    if (multipleFiguresSelected) {
      const widthScaleMax = Math.max(
        ...initialFigures.map((f) => {
          const minFigSize = figureRegistry.get(f.tag).minFigSize;
          return minFigSize / f.width;
        })
      );
      const heightScaleMax = Math.max(
        ...initialFigures.map((f) => {
          const minFigSize = figureRegistry.get(f.tag).minFigSize;
          return minFigSize / f.height;
        })
      );
      const initialAggregateRect = rectUnion(...initialFigures);
      minAggregateSize = {
        width: Math.round(initialAggregateRect.width * widthScaleMax),
        height: Math.round(initialAggregateRect.height * heightScaleMax),
      };
    } else {
      const minFigSize = figureRegistry.get(initialFigures[0].tag).minFigSize;
      minAggregateSize = {
        width: minFigSize,
        height: minFigSize,
      };
    }

    const onMouseMove = (ev: MouseEvent) => {
      const currentMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
      const keepRatio =
        multipleFiguresSelected || ev.shiftKey
          ? true
          : figureRegistry.get(initialFigures[0].tag).keepRatio || false;
      const initialRect = rectUnion(...initialFigures);
      const resizedRect = dragFigureForResize(
        initialRect,
        dirX,
        dirY,
        currentMousePosition,
        initialMousePosition,
        keepRatio,
        minAggregateSize,
        initialScrollPosition,
        this.viewStore.activeSheetScrollInfo,
        this.sheetBoundaries
      );

      const { snappedRect, verticalSnapLine, horizontalSnapLine } = snapForResize(
        { model: this.model(), isPositionVisible: this.isPositionVisible.bind(this) },
        dirX,
        dirY,
        resizedRect,
        this.getOtherFigures(selectedFiguresIds)
      );

      const scaleX = snappedRect.width / initialRect.width;
      const scaleY = snappedRect.height / initialRect.height;
      const snappedFigures = initialFigures.map((figureUI) => ({
        ...figureUI,
        x: Math.round(snappedRect.x + (figureUI.x - initialRect.x) * scaleX),
        y: Math.round(snappedRect.y + (figureUI.y - initialRect.y) * scaleY),
        width: Math.round(figureUI.width * scaleX),
        height: Math.round(figureUI.height * scaleY),
      }));

      this.dnd.draggedFigure = snappedFigures[0];
      this.dnd.selectedFigures = snappedFigures;
      this.dnd.selectedRect = this.getDndFigureRect();
      this.dnd.horizontalSnap = this.getSnap(horizontalSnapLine);
      this.dnd.verticalSnap = this.getSnap(verticalSnapLine);
    };

    const onMouseUp = () => {
      if (!this.dnd.selectedFigures) {
        return;
      }
      callbacks.onDragEnd(
        this.dnd.selectedFigures.map((figure) => this.toSpreadsheetFigure(figure)),
        undefined
      );
      this.stopDragAndDrop();
    };

    this.dnd.cancelDnd = startDnd(onMouseMove, onMouseUp);
  }

  private getOtherFigures(figIds: UID[]): FigureUI[] {
    return this.getFiguresOnScreen().filter((f) => !figIds.includes(f.id));
  }

  getFigureStyle(figureUI: FigureUI): string {
    if (figureUI.id !== this.dnd.draggedFigure?.id) {
      return "";
    }
    return cssPropertiesToCss({
      opacity: this.chartDragStore.highlightedFigureId ? "0.6" : "0.9",
      cursor: "grabbing",
    });
  }

  private getSnap<T extends HFigureAxisType | VFigureAxisType>(
    snapLine: SnapLine<T> | undefined
  ): Snap<T> | undefined {
    if (!snapLine || !this.dnd.draggedFigure) {
      return undefined;
    }
    const figureVisibleRects = snapLine.matchedFigIds
      .map((id) => this.getFiguresOnScreen().find((figureUI) => figureUI.id === id))
      .filter(isDefined);
    const snapContainerRect = rectUnion(this.dnd.draggedFigure, ...figureVisibleRects);
    return {
      line: snapLine,
      containerStyle: cssPropertiesToCss(rectToCss(snapContainerRect)),
      lineStyle: this.getSnapLineStyle(snapLine, snapContainerRect),
    };
  }

  private getSnapLineStyle(
    snapLine: SnapLine<HFigureAxisType | VFigureAxisType> | undefined,
    snapContainerRect: Rect
  ): string {
    if (!snapLine) {
      return "";
    }
    if (["top", "vCenter", "bottom"].includes(snapLine.snappedAxisType)) {
      return cssPropertiesToCss({
        top: `${snapLine.position - snapContainerRect.y}px`,
      });
    } else {
      return cssPropertiesToCss({
        left: `${snapLine.position - snapContainerRect.x}px`,
      });
    }
  }

  stopDragAndDrop() {
    this.dnd.cancelDnd?.();
    this.dnd.draggedFigure = undefined;
    this.dnd.selectedFigures = undefined;
    this.dnd.selectedRect = undefined;
    this.dnd.horizontalSnap = undefined;
    this.dnd.verticalSnap = undefined;
    this.chartDragStore.setHighlightedFigure(undefined);
    this.dnd.cancelDnd = undefined;
  }

  private isPositionVisible(figureId: UID, screenPosition: DOMCoordinates) {
    const { x: viewportX, y: viewportY } = this.viewStore.mainViewportCoordinates;
    const { width: viewportWidth, height: viewportHeight } = this.viewStore.sheetViewDimension;
    const figurePane = this.getFigurePane(figureId);

    const checkXIsVisible = (x: number) =>
      figurePane === "topLeft" || figurePane === "bottomLeft"
        ? x <= viewportX + viewportWidth
        : x >= viewportX && x <= viewportX + viewportWidth;

    const checkYIsVisible = (y: number) =>
      figurePane === "topLeft" || figurePane === "topRight"
        ? y <= viewportY + viewportHeight
        : y >= viewportY && y <= viewportY + viewportHeight;

    return checkXIsVisible(screenPosition.x) && checkYIsVisible(screenPosition.y);
  }
}
