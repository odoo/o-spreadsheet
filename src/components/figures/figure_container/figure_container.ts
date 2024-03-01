import { Component, onMounted, useState } from "@odoo/owl";
import { ComponentsImportance, MIN_FIG_SIZE } from "../../../constants";
import { isDefined } from "../../../helpers";
import { rectIntersection, rectUnion } from "../../../helpers/rectangle";
import { figureRegistry } from "../../../registries";
import { Figure, Rect, ResizeDirection, SpreadsheetChildEnv, UID } from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers";
import { startDnd } from "../../helpers/drag_and_drop";
import {
  internalFigureToScreen,
  screenFigureToInternal,
} from "../../helpers/figure_container_helper";
import { dragFigureForMove, dragFigureForResize } from "../../helpers/figure_drag_helper";
import {
  HFigureAxisType,
  snapForMove,
  snapForResize,
  SnapLine,
  VFigureAxisType,
} from "../../helpers/figure_snap_helper";
import { FigureComponent } from "../figure/figure";

type ContainerType = "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "dnd";

interface Props {
  onFigureDeleted: () => void;
}

interface Container {
  type: ContainerType;
  figures: Figure[];
  style: string;
  inverseViewportStyle: string;
}

interface Snap<T extends HFigureAxisType | VFigureAxisType> {
  line: SnapLine<T>;
  lineStyle: string;
  containerStyle: string;
}

interface DndState {
  draggedFigure?: Figure;
  horizontalSnap?: Snap<HFigureAxisType>;
  verticalSnap?: Snap<VFigureAxisType>;
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
  static components = { FigureComponent };

  dnd = useState<DndState>({
    draggedFigure: undefined,
    horizontalSnap: undefined,
    verticalSnap: undefined,
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
  }

  private getVisibleFigures(): Figure[] {
    const visibleFigures = this.env.model.getters.getVisibleFigures();
    if (
      this.dnd.draggedFigure &&
      !visibleFigures.some((figure) => figure.id === this.dnd.draggedFigure?.id)
    ) {
      visibleFigures.push(
        this.env.model.getters.getFigure(
          this.env.model.getters.getActiveSheetId(),
          this.dnd.draggedFigure?.id
        )!
      );
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
    const { width: viewWidth, height: viewHeight } = this.env.model.getters.getMainViewportRect();
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

    const left = ["bottomRight", "topRight"].includes(container) ? -(viewportX + scrollX) : 0;
    const top = ["bottomRight", "bottomLeft"].includes(container) ? -(viewportY + scrollY) : 0;

    return cssPropertiesToCss({
      left: `${left}px`,
      top: `${top}px`,
    });
  }

  private getFigureContainer(figure: Figure): ContainerType {
    const { x: viewportX, y: viewportY } = this.env.model.getters.getMainViewportCoordinates();
    if (figure.id === this.dnd.draggedFigure?.id) {
      return "dnd";
    } else if (figure.x < viewportX && figure.y < viewportY) {
      return "topLeft";
    } else if (figure.x < viewportX) {
      return "bottomLeft";
    } else if (figure.y < viewportY) {
      return "topRight";
    } else {
      return "bottomRight";
    }
  }

  startDraggingFigure(figure: Figure, ev: MouseEvent) {
    if (ev.button > 0 || this.env.model.getters.isReadonly()) {
      // not main button, probably a context menu and no d&d in readonly mode
      return;
    }
    const selectResult = this.env.model.dispatch("SELECT_FIGURE", { id: figure.id });
    if (!selectResult.isSuccessful) {
      return;
    }

    const sheetId = this.env.model.getters.getActiveSheetId();

    const initialMousePosition = { x: ev.clientX, y: ev.clientY };

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

    const { x, y } = internalFigureToScreen(this.env.model.getters, figure);

    const initialFig = { ...figure, x, y };

    const onMouseMove = (ev: MouseEvent) => {
      const getters = this.env.model.getters;
      const currentMousePosition = { x: ev.clientX, y: ev.clientY };
      const draggedFigure = dragFigureForMove(
        currentMousePosition,
        initialMousePosition,
        initialFig,
        this.env.model.getters.getMainViewportCoordinates(),
        maxDimensions,
        getters.getActiveSheetScrollInfo()
      );

      const otherFigures = this.getOtherFigures(figure.id);
      const internalDragged = screenFigureToInternal(getters, draggedFigure);
      const snapResult = snapForMove(getters, internalDragged, otherFigures);

      this.dnd.draggedFigure = internalFigureToScreen(getters, snapResult.snappedFigure);
      this.dnd.horizontalSnap = this.getSnap(snapResult.horizontalSnapLine);
      this.dnd.verticalSnap = this.getSnap(snapResult.verticalSnapLine);
    };
    const onMouseUp = (ev: MouseEvent) => {
      if (!this.dnd.draggedFigure) {
        return;
      }
      let { x, y } = screenFigureToInternal(this.env.model.getters, this.dnd.draggedFigure);
      this.dnd.draggedFigure = undefined;
      this.dnd.horizontalSnap = undefined;
      this.dnd.verticalSnap = undefined;
      this.env.model.dispatch("UPDATE_FIGURE", { sheetId, id: figure.id, x, y });
    };
    startDnd(onMouseMove, onMouseUp);
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
  startResize(figure: Figure, dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent) {
    ev.stopPropagation();
    const initialMousePosition = { x: ev.clientX, y: ev.clientY };

    const { x, y } = internalFigureToScreen(this.env.model.getters, figure);

    const initialFig = { ...figure, x, y };
    const keepRatio = figureRegistry.get(figure.tag).keepRatio || false;
    const minFigSize = figureRegistry.get(figure.tag).minFigSize || MIN_FIG_SIZE;

    const onMouseMove = (ev: MouseEvent) => {
      const currentMousePosition = { x: ev.clientX, y: ev.clientY };
      const draggedFigure = dragFigureForResize(
        initialFig,
        dirX,
        dirY,
        currentMousePosition,
        initialMousePosition,
        keepRatio,
        minFigSize,
        this.env.model.getters.getActiveSheetScrollInfo()
      );

      const otherFigures = this.getOtherFigures(figure.id);
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
      let { x, y } = screenFigureToInternal(this.env.model.getters, this.dnd.draggedFigure);
      const update: Partial<Figure> = { x, y };
      if (dirX) {
        update.width = this.dnd.draggedFigure.width;
      }
      if (dirY) {
        update.height = this.dnd.draggedFigure.height;
      }
      this.env.model.dispatch("UPDATE_FIGURE", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        id: figure.id,
        ...update,
      });
      this.dnd.draggedFigure = undefined;
      this.dnd.horizontalSnap = undefined;
      this.dnd.verticalSnap = undefined;
    };
    startDnd(onMouseMove, onMouseUp);
  }

  private getOtherFigures(figId: UID): Figure[] {
    return this.getVisibleFigures().filter((f) => f.id !== figId);
  }

  private getDndFigure(): Figure {
    const figure = this.getVisibleFigures().find((fig) => fig.id === this.dnd.draggedFigure?.id);
    if (!figure) throw new Error("Dnd figure not found");
    return {
      ...figure,
      ...this.dnd.draggedFigure,
    };
  }

  getFigureStyle(figure: Figure): string {
    if (figure.id !== this.dnd.draggedFigure?.id) return "";
    return cssPropertiesToCss({
      opacity: "0.9",
      cursor: "grabbing",
    });
  }

  private getSnap<T extends HFigureAxisType | VFigureAxisType>(
    snapLine: SnapLine<T> | undefined
  ): Snap<T> | undefined {
    if (!snapLine || !this.dnd.draggedFigure) return undefined;

    const figureVisibleRects = snapLine.matchedFigIds
      .map((id) => this.getVisibleFigures().find((fig) => fig.id === id))
      .filter(isDefined)
      .map((fig) => {
        const figOnSCreen = internalFigureToScreen(this.env.model.getters, fig);
        const container = this.getFigureContainer(fig);
        return rectIntersection(figOnSCreen, this.getContainerRect(container));
      })
      .filter(isDefined);

    const containerRect = rectUnion(this.dnd.draggedFigure, ...figureVisibleRects);

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
    if (["top", "vCenter", "bottom"].includes(snapLine.snappedAxisType)) {
      return cssPropertiesToCss({
        top: `${snapLine.position - containerRect.y}px`,
        left: `0px`,
        width: `100%`,
      });
    } else {
      return cssPropertiesToCss({
        top: `0px`,
        left: `${snapLine.position - containerRect.x}px`,
        height: `100%`,
      });
    }
  }
}

FiguresContainer.props = {
  onFigureDeleted: Function,
};
