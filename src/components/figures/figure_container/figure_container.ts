import { onMounted, onWillUpdateProps, proxy } from "@odoo/owl";
import { DRAG_THRESHOLD } from "../../../constants";
import { isDefined } from "../../../helpers/misc";
import { render } from "../../../helpers/owl3_helpers";
import { rectUnion } from "../../../helpers/rectangle";
import { Component } from "../../../owl3_compatibility_layer";
import { figureRegistry } from "../../../registries/figures_registry";
import { useStore } from "../../../store_engine/store_hooks";
import { ChartDragStore } from "../../../stores/chart_drag_store";
import { ViewportsStore } from "../../../stores/viewports_store";
import { ZoomStore } from "../../../stores/zoom_store";
import { AnchorOffset, Figure, FigureUI, ResizeDirection } from "../../../types/figure";
import { UID } from "../../../types/misc";
import { DOMDimension, Rect } from "../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { getOverlappedFigure } from "../../helpers/chart_drag_and_drop";
import { cssPropertiesToCss } from "../../helpers/css";
import { isCtrlKey } from "../../helpers/dom_helpers";
import { startDnd } from "../../helpers/drag_and_drop";
import { dragFigureForMove, dragFigureForResize } from "../../helpers/figure_drag_helper";
import {
  HFigureAxisType,
  SnapLine,
  VFigureAxisType,
  snapForMove,
  snapForResize,
} from "../../helpers/figure_snap_helper";
import { FigureComponent } from "../figure/figure";

type ContainerType = "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "dnd";

interface Container {
  type: ContainerType;
  figures: FigureUI[];
  style: string;
  inverseViewportStyle: string;
}

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

/**
 * Each figure ⭐ is positioned inside a container `div` placed and sized
 * according to the split pane the figure is part of, or a separate container for the figure
 * currently drag & dropped. Any part of the figure outside of the container is hidden
 * thanks to its `overflow: hidden` property.
 *
 * Additionally, the figure is placed inside a "inverse viewport" `div` 🟥.
 * Its position represents the viewport position in the grid: its top/left
 * corner represents the top/left corner of the grid.
 *
 * It allows to position the figure inside this div regardless of the
 * (possibly freezed) viewports and the scrolling position.
 *
 * --: container limits
 * 🟥: inverse viewport
 * ⭐: figure top/left position
 *
 *                     container
 *                         ↓
 * |🟥--------------------------------------------
 * |  \                                          |
 * |   \                                         |
 * |    \                                        |
 * |     \          visible area                 |  no scroll
 * |      ⭐                                     |
 * |                                             |
 * |                                             |
 * -----------------------------------------------
 *
 * the scrolling of the pane is applied as an inverse offset
 * to the div which will in turn move the figure up and down
 * inside the container.
 * Hence, once the figure position is (resp. partly) out of
 * the container dimensions, it will be (resp. partly) hidden.
 *
 * The same reasoning applies to the horizontal axis.
 *
 *  🟥 ························
 *    \                       ↑
 *     \                      |
 *      \                     | inverse viewport = -1 * scroll of pane
 *       \                    |
 *        ⭐ <- not visible   |
 *                            ↓
 * -----------------------------------------------
 * |                                             |
 * |                                             |
 * |                                             |
 * |               visible area                  |
 * |                                             |
 * |                                             |
 * |                                             |
 * -----------------------------------------------
 *
 * In the case the d&d figure container, the container is the same as the "topLeft" container for
 * frozen pane (unaffected by scroll and always visible). The figure coordinates are transformed
 * for this container at the start of the d&d, and transformed back at the end to adapt to the scroll
 * that occurred during the drag & drop, and to position the figure on the correct pane.
 *
 */
export class FiguresContainer extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FiguresContainer";
  static components = { FigureComponent };

  dnd = proxy<DndState>({
    draggedFigure: undefined,
    selectedFigures: undefined,
    selectedRect: undefined,
    horizontalSnap: undefined,
    verticalSnap: undefined,
    cancelDnd: undefined,
  });
  private viewStore!: Store<ViewportsStore>;
  private zoomStore!: Store<ZoomStore>;
  private chartDragStore!: Store<ChartDragStore>;

  setup() {
    this.viewStore = useStore(ViewportsStore);
    this.zoomStore = useStore(ZoomStore);
    this.chartDragStore = useStore(ChartDragStore);
    onMounted(() => {
      // horrible, but necessary
      // the following line ensures that we render the figures with the correct
      // viewport.  The reason is that whenever we initialize the grid
      // component, we do not know yet the actual size of the viewport, so the
      // first owl rendering is done with an empty viewport.  Only then we can
      // compute which figures should be displayed, so we have to force a
      // new rendering
      render(this);
    });
    onWillUpdateProps(() => {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const draggedFigureId = this.dnd.draggedFigure?.id;
      if (draggedFigureId && !this.env.model.getters.getFigure(sheetId, draggedFigureId)) {
        this.dnd.cancelDnd?.();
        this.dnd.draggedFigure = undefined;
        this.dnd.selectedFigures = undefined;
        this.dnd.selectedRect = undefined;
        this.dnd.horizontalSnap = undefined;
        this.dnd.verticalSnap = undefined;
        this.chartDragStore.setHighlightedFigure(undefined);
        this.dnd.cancelDnd = undefined;
      }
    });
  }

  private getVisibleFigures(): FigureUI[] {
    const visibleFigures = this.viewStore.visibleFigures;
    for (const figure of this.dnd.selectedFigures || []) {
      if (!visibleFigures.some((figureUI) => figureUI.id === figure.id)) {
        visibleFigures.push(figure);
      }
    }
    return visibleFigures;
  }

  get containers(): Container[] {
    const visibleFigures = this.getVisibleFigures();
    const containers: Container[] = [];

    for (const containerType of [
      "topLeft",
      "topRight",
      "bottomLeft",
      "bottomRight",
    ] as ContainerType[]) {
      const containerFigures = visibleFigures.filter(
        (figure) => this.getFigureContainer(figure) === containerType
      );

      if (containerFigures.length > 0) {
        containers.push({
          type: containerType,
          figures: containerFigures,
          style: this.getContainerStyle(containerType),
          inverseViewportStyle: this.getInverseViewportPositionStyle(containerType),
        });
      }
    }

    if (this.dnd.selectedFigures) {
      containers.push({
        type: "dnd",
        figures: this.dnd.selectedFigures,
        style: this.getContainerStyle("dnd"),
        inverseViewportStyle: this.getInverseViewportPositionStyle("dnd"),
      });
    }

    return containers;
  }

  private getContainerStyle(container: ContainerType): string {
    return this.rectToCss(this.getContainerRect(container));
  }

  private rectToCss(rect: Rect): string {
    return cssPropertiesToCss({
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  private getContainerRect(container: ContainerType): Rect {
    const { width: viewWidth, height: viewHeight } = this.viewStore.sheetViewDimension;
    const { x: viewportX, y: viewportY } = this.viewStore.mainViewportCoordinates;

    const x = ["bottomRight", "topRight"].includes(container) ? viewportX : 0;
    const width = viewWidth - x;
    const y = ["bottomRight", "bottomLeft"].includes(container) ? viewportY : 0;
    const height = viewHeight - y;

    return { x, y, width, height };
  }

  get selectedRectStyle(): string {
    return this.dnd.selectedRect ? this.rectToCss(this.dnd.selectedRect) : "";
  }

  get maxDimensions() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return {
      maxX: this.env.model.getters.getColDimensions(
        sheetId,
        this.env.model.getters.getNumberCols(sheetId) - 1
      ).end,
      maxY: this.env.model.getters.getRowDimensions(
        sheetId,
        this.env.model.getters.getNumberRows(sheetId) - 1
      ).end,
    };
  }

  private getInverseViewportPositionStyle(container: ContainerType): string {
    const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;
    const { x: viewportX, y: viewportY } = this.viewStore.mainViewportCoordinates;

    let left = 0;
    let top = 0;

    if (container === "dnd") {
      left = -scrollX;
      top = -scrollY;
    }
    if (["bottomRight", "topRight"].includes(container)) {
      left = -scrollX - viewportX;
    }
    if (["bottomRight", "bottomLeft"].includes(container)) {
      top = -scrollY - viewportY;
    }

    return cssPropertiesToCss({
      left: `${left}px`,
      top: `${top}px`,
    });
  }

  private getFigureContainer(figureUI: FigureUI): ContainerType {
    const { x: viewportX, y: viewportY } = this.viewStore.mainViewportCoordinates;
    if (this.dnd.selectedFigures?.some((f) => f.id === figureUI.id)) {
      return "dnd";
    } else if (figureUI.x < viewportX && figureUI.y < viewportY) {
      return "topLeft";
    } else if (figureUI.x < viewportX) {
      return "bottomLeft";
    } else if (figureUI.y < viewportY) {
      return "topRight";
    } else {
      return "bottomRight";
    }
  }

  private getDndFigureRect(): Rect | undefined {
    if (this.dnd.selectedFigures && this.dnd.selectedFigures.length > 1) {
      return rectUnion(...this.dnd.selectedFigures);
    }
    return;
  }

  private toBottomRightViewport(figureUI: FigureUI): FigureUI {
    const container = this.getFigureContainer(figureUI);
    const initialScrollPosition = this.viewStore.activeSheetScrollInfo;
    const bottomRightFigure = { ...figureUI };

    if (["bottomLeft", "topLeft"].includes(container)) {
      bottomRightFigure.x += initialScrollPosition.scrollX;
    }
    if (["topLeft", "topRight"].includes(container)) {
      bottomRightFigure.y += initialScrollPosition.scrollY;
    }
    return bottomRightFigure;
  }

  private isMenuClick(ev: MouseEvent): boolean {
    const target = ev.target;
    if (target && target instanceof Element) {
      return !!target.closest(".o-figure-menu");
    }
    return false;
  }

  startDraggingFigure(figureUI: FigureUI, ev: MouseEvent) {
    if (ev.button > 0 || this.env.model.getters.isReadonly() || this.isMenuClick(ev)) {
      // not main button, probably a context menu and no d&d in readonly mode
      return;
    }
    const selected = this.env.model.getters.getSelectedFigureIds().includes(figureUI.id);
    if (!selected) {
      const selectResult = this.env.model.dispatch("SELECT_FIGURE", {
        figureId: figureUI.id,
        selectMultiple: ev.shiftKey || isCtrlKey(ev),
      });
      if (!selectResult.isSuccessful) {
        return;
      }
    }

    if (this.env.isMobile() || this.env.model.getters.isCurrentSheetLocked()) {
      return;
    }

    const sheetId = this.env.model.getters.getActiveSheetId();
    const zoom = this.zoomStore.zoomLevel;
    const initialMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
    const initialScrollPosition = this.viewStore.activeSheetScrollInfo;
    const maxDimensions = this.maxDimensions;
    const selectedFiguresIds = this.env.model.getters.getSelectedFigureIds();
    const initialFigures = selectedFiguresIds
      .map((id) => this.env.model.getters.getFigure(sheetId, id))
      .filter(isDefined)
      .map((f) => this.env.model.getters.getFigureUI(sheetId, f))
      .map(this.toBottomRightViewport.bind(this));

    const draggedFigureId = figureUI.id;

    let hasStartedDnd = false;
    let overlappedFigure: FigureUI | undefined = undefined;
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

      overlappedFigure = undefined;
      const otherFigures = this.getOtherFigures(selectedFigures.map((f) => f.id));
      if (draggedFigure && !selectedFigures.find((f) => f.tag !== "chart")) {
        overlappedFigure = getOverlappedFigure(draggedFigure, otherFigures, ["carousel", "chart"]);
      }
      this.chartDragStore.setHighlightedFigure(overlappedFigure?.id);

      if (!overlappedFigure) {
        const snapReturn = snapForMove(this.env, selectedFigures, otherFigures);
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
      if (!this.dnd.draggedFigure) {
        // on click without move
        if (selected) {
          if (ev.shiftKey || isCtrlKey(ev)) {
            this.env.model.dispatch("UNSELECT_FIGURE", { figureId: figureUI.id });
          } else {
            this.env.model.dispatch("SELECT_FIGURE", { figureId: figureUI.id });
          }
        }
        return;
      }
      if (!overlappedFigure) {
        const payloads =
          this.dnd.selectedFigures?.map((f) => {
            return {
              sheetId,
              figureId: f.id,
              ...this.viewStore.viewports.getPositionAnchorOffset(sheetId, f),
            };
          }) || [];
        this.env.model.dispatch("UPDATE_FIGURES", { figures: payloads });
      } else {
        const overlappingFigureId = overlappedFigure.id;
        const chartFigureIds = this.dnd.selectedFigures?.map((f) => f.id) || [];
        if (overlappedFigure.tag === "carousel") {
          this.env.model.dispatch("ADD_FIGURES_CHART_TO_CAROUSEL", {
            sheetId,
            carouselFigureId: overlappingFigureId,
            chartFigureIds: chartFigureIds,
          });
        } else if (overlappedFigure.tag === "chart") {
          this.env.model.dispatch("MERGE_CHART_FIGURES_INTO_CAROUSEL", {
            sheetId,
            baseFigureId: overlappingFigureId,
            chartFigureIds: [overlappingFigureId, ...chartFigureIds],
          });
        }
      }

      this.dnd.draggedFigure = undefined;
      this.dnd.selectedFigures = undefined;
      this.dnd.selectedRect = undefined;
      this.dnd.horizontalSnap = undefined;
      this.dnd.verticalSnap = undefined;
      this.chartDragStore.setHighlightedFigure(undefined);
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
  resizeAllSelectedFigures(dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent) {
    ev.stopPropagation();

    const sheetId = this.env.model.getters.getActiveSheetId();
    const zoom = this.zoomStore.zoomLevel;
    const initialMousePosition = { x: ev.clientX / zoom, y: ev.clientY / zoom };
    const initialScrollPosition = this.viewStore.activeSheetScrollInfo;
    const maxDimensions = this.maxDimensions;
    const selectedFiguresIds = this.env.model.getters.getSelectedFigureIds();
    const initialFigures = selectedFiguresIds
      .map((id) => this.env.model.getters.getFigure(sheetId, id))
      .filter(isDefined)
      .map((figure) => this.env.model.getters.getFigureUI(sheetId, figure))
      .map(this.toBottomRightViewport.bind(this));

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
        this.env,
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
      const dispatchPayload = this.dnd.selectedFigures.map((figureUI) => {
        const update: Partial<Figure> & AnchorOffset =
          this.viewStore.viewports.getPositionAnchorOffset(sheetId, figureUI);
        if (dirX) {
          update.width = figureUI.width;
        }
        if (dirY) {
          update.height = figureUI.height;
        }
        return {
          sheetId,
          figureId: figureUI.id,
          ...update,
        };
      });
      this.env.model.dispatch("UPDATE_FIGURES", { figures: dispatchPayload });
      this.dnd.draggedFigure = undefined;
      this.dnd.selectedFigures = undefined;
      this.dnd.selectedRect = undefined;
      this.dnd.horizontalSnap = undefined;
      this.dnd.verticalSnap = undefined;
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
}
