import { Plugin, proxy, useConfig, usePlugin } from "@odoo/owl";
import { DRAG_THRESHOLD } from "../../../constants";
import { isDefined } from "../../../helpers/misc";
import { rectUnion } from "../../../helpers/rectangle";
import { ModelPlugin } from "../../../owl_plugins/model_owl_plugin";
import { figureRegistry } from "../../../registries/figures_registry";
import { ChartDragStore } from "../../../stores/chart_drag_store";
import { ViewportsStore } from "../../../stores/viewports_store";
import { ZoomStore } from "../../../stores/zoom_store";
import { FigureUI, ResizeDirection } from "../../../types/figure";
import { UID } from "../../../types/misc";
import { DOMDimension, Rect } from "../../../types/rendering";
import { Store } from "../../../types/store_engine";
import { getCarouselOverlappingChart } from "../../helpers/chart_drag_and_drop";
import { cssPropertiesToCss } from "../../helpers/css";
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

type DragEndCallback = (
  droppedFigures: FigureUI[],
  overlappingFigure: FigureUI | undefined
) => void;

/**
 * ADRM TODO:
 * - remove inverse viewport stuff (make sure coordiates are correct at drag start & end, also snap line position)
 * - make sure it works if we scroll during dnd
 * - make chart drag & drop use this plugin
 * - 2 biggest differences: 1) display naother component than figureComponent 2) allow d&d over side panel
 * - everything could be draggable over side panel TBH, not that big of an issue
 * - even more so if we implement edge scroll aftwerwards
 * - sounds good ?
 */
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

  private getVisibleFigures(): FigureUI[] {
    const visibleFigures = this.viewStore.visibleFigures;
    for (const figure of this.dnd.selectedFigures || []) {
      if (!visibleFigures.some((figureUI) => figureUI.id === figure.id)) {
        visibleFigures.push(figure);
      }
    }
    return visibleFigures;
  }

  private rectToCss(rect: Rect): string {
    return cssPropertiesToCss({
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  get selectedRectStyle(): string {
    return this.dnd.selectedRect ? this.rectToCss(this.dnd.selectedRect) : "";
  }

  get maxDimensions() {
    const sheetId = this.model().getters.getActiveSheetId();
    return {
      maxX: this.model().getters.getColDimensions(
        sheetId,
        this.model().getters.getNumberCols(sheetId) - 1
      ).end,
      maxY: this.model().getters.getRowDimensions(
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
    const bottomRightFigure = { ...figureUI };
    const { x: viewportX, y: viewportY } = this.viewStore.mainViewportCoordinates;

    // if (figureUI.x < viewportX && figureUI.y < viewportY) {
    //   // Topleft viewport
    //   bottomRightFigure.x += scrollX;
    //   bottomRightFigure.y += scrollY;
    // } else if (figureUI.x < viewportX) {
    //   // Bottomleft viewport
    //   bottomRightFigure.x += scrollX;
    // } else if (figureUI.y < viewportY) {
    //   // Topright viewport
    //   bottomRightFigure.y += scrollY;
    // } else {
    //   // Bottomright viewport
    // }

    if (figureUI.x < viewportX && figureUI.y < viewportY) {
      // Topleft viewport
    } else if (figureUI.x < viewportX) {
      // Bottomleft viewport
      bottomRightFigure.x -= scrollX;
    } else if (figureUI.y < viewportY) {
      // Topright viewport
      bottomRightFigure.y -= scrollY;
    } else {
      // Bottomright viewport
      bottomRightFigure.x -= scrollX;
      bottomRightFigure.y -= scrollY;
    }

    return bottomRightFigure;
  }

  startDraggingFigure(figureUI: FigureUI, ev: MouseEvent, onDragEnd: DragEndCallback) {
    const sheetId = this.model().getters.getActiveSheetId();
    const zoom = this.zoomStore.zoomLevel;
    const initialMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
    const initialScrollPosition = this.viewStore.activeSheetScrollInfo;
    const maxDimensions = this.maxDimensions;
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
        maxDimensions,
        initialScrollPosition,
        this.viewStore.activeSheetScrollInfo
      );
      const draggedFigure = selectedFigures.find((f) => f.id === draggedFigureId);

      overlappingChartOrCarousel = undefined;
      const otherFigures = this.getOtherFigures(selectedFigures.map((f) => f.id));
      if (draggedFigure && !selectedFigures.find((f) => f.tag !== "chart")) {
        overlappingChartOrCarousel = getCarouselOverlappingChart(draggedFigure, otherFigures, [
          "carousel",
          "chart",
        ]);
      }
      this.chartDragStore.setHighlightedFigure(overlappingChartOrCarousel?.id);

      if (!overlappingChartOrCarousel) {
        const snapReturn = snapForMove(
          { model: this.model(), viewStore: this.viewStore },
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
        onDragEnd(this.dnd.selectedFigures, overlappingChartOrCarousel);
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
    onDragEnd: DragEndCallback
  ) {
    ev.stopPropagation();

    const sheetId = this.model().getters.getActiveSheetId();
    const zoom = this.zoomStore.zoomLevel;
    const initialMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
    const initialScrollPosition = this.viewStore.activeSheetScrollInfo;
    const maxDimensions = this.maxDimensions;
    const selectedFiguresIds = this.model().getters.getSelectedFigureIds();
    const initialFigures = selectedFiguresIds
      .map((id) => this.model().getters.getFigure(sheetId, id))
      .filter(isDefined)
      .map((figure) => this.model().getters.getFigureUI(sheetId, figure))
      .map(this.toScreenPosition.bind(this));

    const mutlipleFiguresSelected = selectedFiguresIds.length > 1;
    const otherFiguresUI = this.getOtherFigures(selectedFiguresIds);
    if (initialFigures.length === 0) {
      return;
    }
    let minAggregateSize: DOMDimension;
    if (mutlipleFiguresSelected) {
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
        mutlipleFiguresSelected || ev.shiftKey
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
        maxDimensions
      );

      const { snappedRect, verticalSnapLine, horizontalSnapLine } = snapForResize(
        { model: this.model(), viewStore: this.viewStore },
        dirX,
        dirY,
        resizedRect,
        otherFiguresUI
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
      onDragEnd(this.dnd.selectedFigures, undefined);
      this.stopDragAndDrop();
    };

    this.dnd.cancelDnd = startDnd(onMouseMove, onMouseUp);
  }

  private getOtherFigures(figIds: UID[]): FigureUI[] {
    return this.getVisibleFigures().filter((f) => !figIds.includes(f.id));
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

  getFigureClass(figureUI: FigureUI): string {
    if (figureUI.id !== this.chartDragStore.highlightedFigureId) {
      return "";
    }
    return "o-add-to-carousel";
  }

  private getSnap<T extends HFigureAxisType | VFigureAxisType>(
    snapLine: SnapLine<T> | undefined
  ): Snap<T> | undefined {
    if (!snapLine || !this.dnd.draggedFigure) {
      return undefined;
    }
    const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;
    const figureVisibleRects = snapLine.matchedFigIds
      .map((id) => this.getVisibleFigures().find((figureUI) => figureUI.id === id))
      .filter(isDefined)
      .map((figureUI) => {
        return {
          x: figureUI.x - scrollX,
          y: figureUI.y - scrollY,
          width: figureUI.width,
          height: figureUI.height,
        };
      })
      .filter(isDefined);
    const containerRect = rectUnion(
      {
        ...this.dnd.draggedFigure,
        x: this.dnd.draggedFigure.x - scrollX,
        y: this.dnd.draggedFigure.y - scrollY,
      },
      ...figureVisibleRects
    );
    return {
      line: snapLine,
      containerStyle: this.rectToCss(containerRect),
      lineStyle: this.getSnapLineStyle(snapLine, containerRect),
    };
  }

  private getSnapLineStyle(
    snapLine: SnapLine<HFigureAxisType | VFigureAxisType> | undefined,
    containerRect: Rect
  ): string {
    if (!snapLine) {
      return "";
    }
    const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;
    if (["top", "vCenter", "bottom"].includes(snapLine.snappedAxisType)) {
      return cssPropertiesToCss({
        top: `${snapLine.position - containerRect.y - scrollY}px`,
        left: `0px`,
        width: `100%`,
      });
    } else {
      return cssPropertiesToCss({
        top: `0px`,
        left: `${snapLine.position - containerRect.x - scrollX}px`,
        height: `100%`,
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
}
