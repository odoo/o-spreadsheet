import { Component, onMounted, useState } from "@odoo/owl";
import { MIN_FIG_SIZE } from "../../../constants";
import { figureRegistry } from "../../../registries";
import {
  DOMCoordinates,
  Figure,
  Pixel,
  ResizeDirection,
  SpreadsheetChildEnv,
} from "../../../types/index";
import { cssPropertiesToCss } from "../../helpers";
import { startDnd } from "../../helpers/drag_and_drop";
import { FigureComponent } from "../figure/figure";
import { ChartFigure } from "../figure_chart/figure_chart";

type ContainerType = "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "dnd";

interface DndState {
  figId: string | undefined;
  x: Pixel;
  y: Pixel;
  width: Pixel;
  height: Pixel;
}
interface Props {
  sidePanelIsOpen: Boolean;
  onFigureDeleted: () => void;
}

interface Container {
  type: ContainerType;
  figures: Figure[];
  style: string;
  inverseViewportStyle: string;
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
export class FiguresContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FiguresContainer";
  static components = { FigureComponent };

  dnd = useState<DndState>({
    figId: undefined,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
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
    if (this.dnd.figId && !visibleFigures.some((figure) => figure.id === this.dnd.figId)) {
      visibleFigures.push(
        this.env.model.getters.getFigure(this.env.model.getters.getActiveSheetId(), this.dnd.figId)!
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

    if (this.dnd.figId) {
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
    const { width: viewWidth, height: viewHeight } = this.env.model.getters.getSheetViewDimension();
    const { x: viewportX, y: viewportY } = this.env.model.getters.getMainViewportCoordinates();

    const left = ["bottomRight", "topRight"].includes(container) ? viewportX : 0;
    const width = viewWidth - left;
    const top = ["bottomRight", "bottomLeft"].includes(container) ? viewportY : 0;
    const height = viewHeight - top;

    return cssPropertiesToCss({
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
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
    if (figure.id === this.dnd.figId) {
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

    const mouseInitialX = ev.clientX;
    const mouseInitialY = ev.clientY;

    const { x: dndInitialX, y: dndInitialY } = this.internalToScreenCoordinates(figure);
    this.dnd.x = dndInitialX;
    this.dnd.y = dndInitialY;
    this.dnd.width = figure.width;
    this.dnd.height = figure.height;

    const onMouseMove = (ev: MouseEvent) => {
      const { x: viewportX, y: viewportY } = this.env.model.getters.getMainViewportCoordinates();
      const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();

      const minX = viewportX ? 0 : -scrollX;
      const minY = viewportY ? 0 : -scrollY;

      this.dnd.figId = figure.id;

      const newX = ev.clientX;
      let deltaX = newX - mouseInitialX;
      this.dnd.x = Math.max(dndInitialX + deltaX, minX);

      const newY = ev.clientY;
      let deltaY = newY - mouseInitialY;
      this.dnd.y = Math.max(dndInitialY + deltaY, minY);
    };
    const onMouseUp = (ev: MouseEvent) => {
      if (!this.dnd.figId) {
        return;
      }
      let { x, y } = this.screenCoordinatesToInternal(this.dnd);
      this.dnd.figId = undefined;
      this.env.model.dispatch("UPDATE_FIGURE", { sheetId, id: figure.id, x, y });
    };
    startDnd(onMouseMove, onMouseUp);
  }

  startResize(figure: Figure, dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent) {
    ev.stopPropagation();
    const initialX = ev.clientX;
    const initialY = ev.clientY;

    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
    const { x: dndInitialX, y: dndInitialY } = this.internalToScreenCoordinates(figure);
    this.dnd.x = dndInitialX;
    this.dnd.y = dndInitialY;
    this.dnd.width = figure.width;
    this.dnd.height = figure.height;

    let onMouseMove: (ev: MouseEvent) => void;
    onMouseMove = (ev: MouseEvent) => {
      this.dnd.figId = figure.id;
      const deltaX = Math.max(dirX * (ev.clientX - initialX), MIN_FIG_SIZE - figure.width);
      const deltaY = Math.max(dirY * (ev.clientY - initialY), MIN_FIG_SIZE - figure.height);
      this.dnd.width = figure.width + deltaX;
      this.dnd.height = figure.height + deltaY;
      if (dirX < 0) {
        this.dnd.x = dndInitialX - deltaX;
      }
      if (dirY < 0) {
        this.dnd.y = dndInitialY - deltaY;
      }

      // Adjusts figure dimensions to ensure it remains within header boundaries and viewport during resizing.
      if (this.dnd.x + scrollX <= 0) {
        this.dnd.width = this.dnd.width + this.dnd.x + scrollX;
        this.dnd.x = -scrollX;
      }
      if (this.dnd.y + scrollY <= 0) {
        this.dnd.height = this.dnd.height + this.dnd.y + scrollY;
        this.dnd.y = -scrollY;
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      if (!this.dnd.figId) {
        return;
      }
      this.dnd.figId = undefined;
      let { x, y } = this.screenCoordinatesToInternal(this.dnd);
      const update: Partial<Figure> = { x, y };
      if (dirX) {
        update.width = this.dnd.width;
      }
      if (dirY) {
        update.height = this.dnd.height;
      }
      this.env.model.dispatch("UPDATE_FIGURE", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        id: figure.id,
        ...update,
      });
    };
    startDnd(onMouseMove, onMouseUp);
  }

  private getDndFigure(): Figure {
    const figure = this.getVisibleFigures().find((fig) => fig.id === this.dnd.figId);
    if (!figure) throw new Error("Dnd figure not found");
    return {
      ...figure,
      x: this.dnd.x,
      y: this.dnd.y,
      width: this.dnd.width,
      height: this.dnd.height,
    };
  }

  getFigureStyle(figure: Figure): string {
    if (figure.id !== this.dnd.figId) return "";
    return cssPropertiesToCss({
      opacity: "0.9",
      cursor: "grabbing",
    });
  }

  private internalToScreenCoordinates({ x, y }: DOMCoordinates): DOMCoordinates {
    const { x: viewportX, y: viewportY } = this.env.model.getters.getMainViewportCoordinates();
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();

    x = x < viewportX ? x : x - scrollX;
    y = y < viewportY ? y : y - scrollY;

    return { x, y };
  }

  private screenCoordinatesToInternal({ x, y }: DOMCoordinates): DOMCoordinates {
    const { x: viewportX, y: viewportY } = this.env.model.getters.getMainViewportCoordinates();
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();

    x = viewportX && x < viewportX ? x : x + scrollX;
    y = viewportY && y < viewportY ? y : y + scrollY;

    return { x, y };
  }
}

figureRegistry.add("chart", { Component: ChartFigure, SidePanelComponent: "ChartPanel" });
