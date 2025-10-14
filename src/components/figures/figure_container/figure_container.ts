import { Component, onMounted, onWillUpdateProps, useState } from "@odoo/owl";
import { ComponentsImportance, DRAG_THRESHOLD, MIN_FIG_SIZE } from "../../../constants";
import { isDefined } from "../../../helpers";
import { rectUnion } from "../../../helpers/rectangle";
import { figureRegistry } from "../../../registries/figures_registry";
import {
  AnchorOffset,
  Figure,
  FigureUI,
  Rect,
  ResizeDirection,
  SpreadsheetChildEnv,
  UID,
} from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers";
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

interface Props {}

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
  horizontalSnap?: Snap<HFigureAxisType>;
  verticalSnap?: Snap<VFigureAxisType>;
  cancelDnd: (() => void) | undefined;
  overlappingCarousel?: FigureUI;
}

css/*SCSS*/ `
  .o-figure-snap-line {
    position: relative;
    z-index: ${ComponentsImportance.FigureSnapLine};
    &.vertical {
      width: 0px;
      border-left: 1px dashed black;
    }
    &.horizontal {
      border-top: 1px dashed black;
      height: 0px;
    }
  }
  .o-figure-container {
    -webkit-user-select: none; /* safari */
    user-select: none;
  }
`;

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
export class FiguresContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FiguresContainer";
  static props = {};
  static components = { FigureComponent };

  dnd = useState<DndState>({
    draggedFigure: undefined,
    horizontalSnap: undefined,
    verticalSnap: undefined,
    cancelDnd: undefined,
    overlappingCarousel: undefined,
  });

  setup() {
    onMounted(() => {
      // horrible, but necessary
      // the following line ensures that we render the figures with the correct
      // viewport.  The reason is that whenever we initialize the grid
      // component, we do not know yet the actual size of the viewport, so the
      // first owl rendering is done with an empty viewport.  Only then we can
      // compute which figures should be displayed, so we have to force a
      // new rendering
      this.render();
    });
    onWillUpdateProps(() => {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const draggedFigureId = this.dnd.draggedFigure?.id;
      if (draggedFigureId && !this.env.model.getters.getFigure(sheetId, draggedFigureId)) {
        if (this.dnd.cancelDnd) {
          this.dnd.cancelDnd();
        }
        this.dnd.draggedFigure = undefined;
        this.dnd.horizontalSnap = undefined;
        this.dnd.verticalSnap = undefined;
        this.dnd.overlappingCarousel = undefined;
        this.dnd.cancelDnd = undefined;
      }
    });
  }

  private getVisibleFigures(): FigureUI[] {
    const visibleFigures = this.env.model.getters.getVisibleFigures();
    if (
      this.dnd.draggedFigure &&
      !visibleFigures.some((figureUI) => figureUI.id === this.dnd.draggedFigure?.id)
    ) {
      if (this.dnd.draggedFigure) {
        visibleFigures.push(this.dnd.draggedFigure);
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

    if (this.dnd.draggedFigure) {
      containers.push({
        type: "dnd",
        figures: [this.getDndFigure()],
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
    const { width: viewWidth, height: viewHeight } = this.env.model.getters.getSheetViewDimension();
    const { x: viewportX, y: viewportY } = this.env.model.getters.getMainViewportCoordinates();

    const x = ["bottomRight", "topRight"].includes(container) ? viewportX : 0;
    const width = viewWidth - x;
    const y = ["bottomRight", "bottomLeft"].includes(container) ? viewportY : 0;
    const height = viewHeight - y;

    return { x, y, width, height };
  }

  private getInverseViewportPositionStyle(container: ContainerType): string {
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
    const { x: viewportX, y: viewportY } = this.env.model.getters.getMainViewportCoordinates();

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
    const { x: viewportX, y: viewportY } = this.env.model.getters.getMainViewportCoordinates();
    if (figureUI.id === this.dnd.draggedFigure?.id) {
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

  private toBottomRightViewport(figureUI: FigureUI): FigureUI {
    const container = this.getFigureContainer(figureUI);
    const initialScrollPosition = this.env.model.getters.getActiveSheetScrollInfo();
    const bottomRightFigure = { ...figureUI };

    if (["bottomLeft", "topLeft"].includes(container)) {
      bottomRightFigure.x += initialScrollPosition.scrollX;
    }
    if (["topLeft", "topRight"].includes(container)) {
      bottomRightFigure.y += initialScrollPosition.scrollY;
    }
    return bottomRightFigure;
  }

  startDraggingFigure(figureUI: FigureUI, ev: MouseEvent) {
    if (ev.button > 0 || this.env.model.getters.isReadonly()) {
      // not main button, probably a context menu and no d&d in readonly mode
      return;
    }
    const selectResult = this.env.model.dispatch("SELECT_FIGURE", { figureId: figureUI.id });
    if (!selectResult.isSuccessful) {
      return;
    }

    if (this.env.isMobile()) {
      return;
    }

    const sheetId = this.env.model.getters.getActiveSheetId();

    const initialMousePosition = { x: ev.clientX, y: ev.clientY };
    const initialScrollPosition = this.env.model.getters.getActiveSheetScrollInfo();

    const initialFigure = this.toBottomRightViewport(figureUI);

    const maxDimensions = {
      maxX: this.env.model.getters.getColDimensions(
        sheetId,
        this.env.model.getters.getNumberCols(sheetId) - 1
      ).end,
      maxY: this.env.model.getters.getRowDimensions(
        sheetId,
        this.env.model.getters.getNumberRows(sheetId) - 1
      ).end,
    };

    let hasStartedDnd = false;
    const onMouseMove = (ev: MouseEvent) => {
      const getters = this.env.model.getters;
      const currentMousePosition = { x: ev.clientX, y: ev.clientY };

      const offsetX = Math.abs(currentMousePosition.x - initialMousePosition.x);
      const offsetY = Math.abs(currentMousePosition.y - initialMousePosition.y);
      if (!hasStartedDnd && offsetX < DRAG_THRESHOLD && offsetY < DRAG_THRESHOLD) {
        return; // add a small threshold to avoid dnd when just clicking
      }
      hasStartedDnd = true;

      const draggedFigure = dragFigureForMove(
        currentMousePosition,
        initialMousePosition,
        initialFigure,
        maxDimensions,
        initialScrollPosition,
        getters.getActiveSheetScrollInfo()
      );

      const otherFigures = this.getOtherFigures(initialFigure.id);
      const overlappingCarousel = this.getCarouselOverlappingChart(draggedFigure, otherFigures);
      this.dnd.overlappingCarousel = overlappingCarousel;

      if (!overlappingCarousel) {
        const snapResult = snapForMove(getters, draggedFigure, otherFigures);
        this.dnd.draggedFigure = snapResult.snappedFigure;
        this.dnd.horizontalSnap = this.getSnap(snapResult.horizontalSnapLine);
        this.dnd.verticalSnap = this.getSnap(snapResult.verticalSnapLine);
      } else {
        this.dnd.draggedFigure = draggedFigure;
        this.dnd.horizontalSnap = undefined;
        this.dnd.verticalSnap = undefined;
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      if (!this.dnd.draggedFigure) {
        return;
      }
      const { col, row, offset } = this.env.model.getters.getPositionAnchorOffset(
        this.dnd.draggedFigure
      );
      if (!this.dnd.overlappingCarousel) {
        this.env.model.dispatch("UPDATE_FIGURE", {
          sheetId,
          figureId: figureUI.id,
          offset,
          col,
          row,
        });
      } else {
        this.env.model.dispatch("ADD_FIGURE_CHART_TO_CAROUSEL", {
          sheetId,
          carouselFigureId: this.dnd.overlappingCarousel.id,
          chartFigureId: figureUI.id,
        });
      }

      this.dnd.draggedFigure = undefined;
      this.dnd.horizontalSnap = undefined;
      this.dnd.verticalSnap = undefined;
      this.dnd.overlappingCarousel = undefined;
    };

    this.dnd.cancelDnd = startDnd(onMouseMove, onMouseUp);
  }

  /**
   * Initialize the resize of a figure with mouse movements
   *
   * @param dirX X direction of the resize. -1 : resize from the left border of the figure, 0 : no resize in X, 1 :
   * resize from the right border of the figure
   * @param dirY Y direction of the resize. -1 : resize from the top border of the figure, 0 : no resize in Y, 1 :
   * resize from the bottom border of the figure
   * @param ev Mouse Event
   */
  startResize(figureUI: FigureUI, dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent) {
    ev.stopPropagation();
    const initialMousePosition = { x: ev.clientX, y: ev.clientY };
    const initialScrollPosition = this.env.model.getters.getActiveSheetScrollInfo();

    const keepRatio = figureRegistry.get(figureUI.tag).keepRatio || false;
    const minFigSize = figureRegistry.get(figureUI.tag).minFigSize || MIN_FIG_SIZE;
    const sheetId = this.env.model.getters.getActiveSheetId();

    const maxDimensions = {
      maxX: this.env.model.getters.getColDimensions(
        sheetId,
        this.env.model.getters.getNumberCols(sheetId) - 1
      ).end,
      maxY: this.env.model.getters.getRowDimensions(
        sheetId,
        this.env.model.getters.getNumberRows(sheetId) - 1
      ).end,
    };

    const onMouseMove = (ev: MouseEvent) => {
      const currentMousePosition = { x: ev.clientX, y: ev.clientY };
      const draggedFigure = dragFigureForResize(
        figureUI,
        dirX,
        dirY,
        currentMousePosition,
        initialMousePosition,
        keepRatio,
        minFigSize,
        initialScrollPosition,
        this.env.model.getters.getActiveSheetScrollInfo(),
        maxDimensions
      );

      const otherFigures = this.getOtherFigures(figureUI.id);
      const snapResult = snapForResize(
        this.env.model.getters,
        dirX,
        dirY,
        draggedFigure,
        otherFigures
      );
      this.dnd.draggedFigure = snapResult.snappedFigure;
      this.dnd.horizontalSnap = this.getSnap(snapResult.horizontalSnapLine);
      this.dnd.verticalSnap = this.getSnap(snapResult.verticalSnapLine);
    };

    const onMouseUp = (ev: MouseEvent) => {
      if (!this.dnd.draggedFigure) {
        return;
      }
      const update: Partial<Figure> & AnchorOffset = this.env.model.getters.getPositionAnchorOffset(
        this.dnd.draggedFigure
      );
      if (dirX) {
        update.width = this.dnd.draggedFigure.width;
      }
      if (dirY) {
        update.height = this.dnd.draggedFigure.height;
      }
      this.env.model.dispatch("UPDATE_FIGURE", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        figureId: figureUI.id,
        ...update,
      });
      this.dnd.draggedFigure = undefined;
      this.dnd.horizontalSnap = undefined;
      this.dnd.verticalSnap = undefined;
      this.dnd.overlappingCarousel = undefined;
    };

    this.dnd.cancelDnd = startDnd(onMouseMove, onMouseUp);
  }

  private getOtherFigures(figId: UID): FigureUI[] {
    return this.getVisibleFigures().filter((f) => f.id !== figId);
  }

  private getDndFigure(): FigureUI {
    const figure = this.dnd.draggedFigure;
    if (!figure) throw new Error("Dnd figure not found");
    return figure;
  }

  getFigureStyle(figureUI: FigureUI): string {
    if (figureUI.id !== this.dnd.draggedFigure?.id) return "";
    return cssPropertiesToCss({
      opacity: this.dnd.overlappingCarousel?.id ? "0.6" : "0.9",
      cursor: "grabbing",
    });
  }

  getFigureClass(figureUI: FigureUI): string {
    if (figureUI.id !== this.dnd.overlappingCarousel?.id) return "";
    return "o-add-to-carousel";
  }

  private getSnap<T extends HFigureAxisType | VFigureAxisType>(
    snapLine: SnapLine<T> | undefined
  ): Snap<T> | undefined {
    if (!snapLine || !this.dnd.draggedFigure) return undefined;
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
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
    if (!snapLine) return "";
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
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

  private getCarouselOverlappingChart(
    figureUI: FigureUI,
    otherFigures: FigureUI[]
  ): FigureUI | undefined {
    if (figureUI.tag !== "chart") {
      return undefined;
    }

    const figureCenterX = figureUI.x + figureUI.width / 2;
    const figureCenterY = figureUI.y + figureUI.height / 2;

    let bestMatch: FigureUI | undefined;
    let smallestDistance = Infinity;

    for (const figure of otherFigures) {
      if (figure.tag !== "carousel") {
        continue;
      }
      const carouselCenterX = figure.x + figure.width / 2;
      const carouselCenterY = figure.y + figure.height / 2;

      const distanceX = Math.abs(figureCenterX - carouselCenterX);
      const distanceY = Math.abs(figureCenterY - carouselCenterY);
      const squaredDistance = distanceX ** 2 + distanceY ** 2;

      if (
        distanceX <= figureUI.width / 2 &&
        distanceY <= figureUI.height / 2 &&
        squaredDistance < smallestDistance
      ) {
        smallestDistance = squaredDistance;
        bestMatch = figure;
      }
    }

    return bestMatch;
  }
}
