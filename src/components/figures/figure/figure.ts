import { Component, useEffect, useRef, useState } from "@odoo/owl";
import {
  ComponentsImportance,
  FIGURE_BORDER_COLOR,
  MIN_FIG_SIZE,
  SELECTION_BORDER_COLOR,
} from "../../../constants";
import { figureRegistry } from "../../../registries/index";
import { Figure, Pixel, SpreadsheetChildEnv, UID } from "../../../types/index";
import { css } from "../../helpers/css";
import { gridOverlayPosition } from "../../helpers/dom_helpers";
import { startDnd } from "../../helpers/drag_and_drop";

type ResizeAnchor =
  | "top left"
  | "top"
  | "top right"
  | "right"
  | "bottom right"
  | "bottom"
  | "bottom left"
  | "left";

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
const ANCHOR_SIZE = 8;
const BORDER_WIDTH = 1;
const ACTIVE_BORDER_WIDTH = 2;

css/*SCSS*/ `
  div.o-figure {
    box-sizing: border-box;
    position: absolute;
    width: 100%;
    height: 100%;

    border: solid ${FIGURE_BORDER_COLOR};
    &:focus {
      outline: none;
    }

    &.o-dragging {
      opacity: 0.9;
      cursor: grabbing;
    }
  }

  div.o-active-figure-border {
    box-sizing: border-box;
    z-index: 1;
    border: ${ACTIVE_BORDER_WIDTH}px solid ${SELECTION_BORDER_COLOR};
  }

  .o-figure-wrapper {
    position: absolute;
    box-sizing: content-box;

    .o-fig-resizer {
      z-index: ${ComponentsImportance.ChartAnchor};
      position: absolute;
      width: ${ANCHOR_SIZE}px;
      height: ${ANCHOR_SIZE}px;
      background-color: #1a73e8;
      outline: ${BORDER_WIDTH}px solid white;

      &.o-top {
        cursor: n-resize;
      }
      &.o-topRight {
        cursor: ne-resize;
      }
      &.o-right {
        cursor: e-resize;
      }
      &.o-bottomRight {
        cursor: se-resize;
      }
      &.o-bottom {
        cursor: s-resize;
      }
      &.o-bottomLeft {
        cursor: sw-resize;
      }
      &.o-left {
        cursor: w-resize;
      }
      &.o-topLeft {
        cursor: nw-resize;
      }
    }
  }
`;

interface DndState {
  isActive: boolean;
  x: Pixel;
  y: Pixel;
  width: Pixel;
  height: Pixel;
}

interface Props {
  sidePanelIsOpen: Boolean;
  onFigureDeleted: () => void;
  figure: Figure;
}

/**
 * Each figure ⭐ is positioned inside a container `div` placed and sized
 * according to the split pane the figure is part of.
 * Any part of the figure outside of the container is hidden
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
 */

export class FigureComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FigureComponent";
  static components = {};
  figureRegistry = figureRegistry;

  private figureRef = useRef("figure");

  dnd: DndState = useState({
    isActive: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  get displayedFigure(): Figure {
    return this.dnd.isActive ? { ...this.props.figure, ...this.dnd } : this.props.figure;
  }

  get isSelected(): boolean {
    return this.env.model.getters.getSelectedFigureId() === this.props.figure.id;
  }

  get containerStyle(): string {
    const { x: figureX, y: figureY } = this.props.figure;
    const { width: viewWidth, height: viewHeight } = this.env.model.getters.getMainViewportRect();
    const { x, y } = this.env.model.getters.getMainViewportCoordinates();

    const left = figureX >= x ? x : 0;
    const width = viewWidth - left;
    const top = figureY >= y ? y : 0;
    const height = viewHeight - top;

    return `
      left: ${left}px;
      top: ${top}px;
      width: ${width}px;
      height: ${height}px
    `;
  }

  get inverseViewportPositionStyle(): string {
    const { x: figureX, y: figureY } = this.props.figure;
    const { offsetX, offsetY } = this.env.model.getters.getActiveSheetScrollInfo();
    const { x, y } = this.env.model.getters.getMainViewportCoordinates();

    const left = figureX >= x ? -(x + offsetX) : 0;
    const top = figureY >= y ? -(y + offsetY) : 0;

    return `
      left: ${left}px;
      top: ${top}px;
    `;
  }

  private getBorderWidth() {
    return this.env.isDashboard() ? 0 : BORDER_WIDTH;
  }

  get figureStyle() {
    return `border-width: ${this.getBorderWidth()}px;`;
  }

  get wrapperStyle() {
    const { x, y, width, height } = this.displayedFigure;
    return (
      `top:${y}px;` +
      `left:${x}px;` +
      `width:${width}px;` +
      `height:${height}px;` +
      `z-index: ${ComponentsImportance.Figure + (this.isSelected ? 1 : 0)}`
    );
  }

  getResizerPosition(resizer: ResizeAnchor) {
    const anchorCenteringOffset = (ANCHOR_SIZE - ACTIVE_BORDER_WIDTH) / 2;
    let style = "";
    if (resizer.includes("top")) {
      style += `top: ${-anchorCenteringOffset}px;`;
    } else if (resizer.includes("bottom")) {
      style += `bottom: ${-anchorCenteringOffset}px;`;
    } else {
      style += ` bottom: calc(50% - ${anchorCenteringOffset}px);`;
    }

    if (resizer.includes("left")) {
      style += `left: ${-anchorCenteringOffset}px;`;
    } else if (resizer.includes("right")) {
      style += `right: ${-anchorCenteringOffset}px;`;
    } else {
      style += ` right: calc(50% - ${anchorCenteringOffset}px);`;
    }
    return style;
  }

  setup() {
    useEffect(
      (selectedFigureId: UID | null, thisFigureId: UID, el: HTMLElement | null) => {
        if (selectedFigureId === thisFigureId) {
          /** Scrolling on a newly inserted figure that overflows outside the viewport
           * will break the whole layout.
           * NOTE: `preventScroll`does not work on mobile but then again,
           * mobile is not really supported ATM.
           *
           * TODO: When implementing proper mobile, we will need to scroll the viewport
           * correctly (and render?) before focusing the element.
           */
          el?.focus({ preventScroll: true });
        }
      },
      () => [this.env.model.getters.getSelectedFigureId(), this.props.figure.id, this.figureRef.el]
    );
  }

  resize(dirX: number, dirY: number, ev: MouseEvent) {
    const figure = this.props.figure;

    ev.stopPropagation();
    const initialX = ev.clientX;
    const initialY = ev.clientY;

    this.dnd.x = figure.x;
    this.dnd.y = figure.y;
    this.dnd.width = figure.width;
    this.dnd.height = figure.height;

    const onMouseMove = (ev: MouseEvent) => {
      this.dnd.isActive = true;
      const deltaX = Math.max(dirX * (ev.clientX - initialX), MIN_FIG_SIZE - figure.width);
      const deltaY = Math.max(dirY * (ev.clientY - initialY), MIN_FIG_SIZE - figure.height);
      this.dnd.width = figure.width + deltaX;
      this.dnd.height = figure.height + deltaY;
      if (dirX < 0) {
        this.dnd.x = figure.x - deltaX;
      }
      if (dirY < 0) {
        this.dnd.y = figure.y - deltaY;
      }
    };
    const onMouseUp = (ev: MouseEvent) => {
      this.dnd.isActive = false;
      const update: Partial<Figure> = {
        x: this.dnd.x,
        y: this.dnd.y,
      };
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

  onMouseDown(ev: MouseEvent) {
    const figure = this.props.figure;
    if (ev.button > 0 || this.env.model.getters.isReadonly()) {
      // not main button, probably a context menu
      return;
    }
    const selectResult = this.env.model.dispatch("SELECT_FIGURE", { id: figure.id });
    if (!selectResult.isSuccessful) {
      return;
    }
    if (this.props.sidePanelIsOpen) {
      this.env.openSidePanel("ChartPanel");
    }

    const position = gridOverlayPosition();
    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      this.env.model.getters.getMainViewportCoordinates();
    const { offsetX, offsetY } = this.env.model.getters.getActiveSheetScrollInfo();
    const sheetId = this.env.model.getters.getActiveSheetId();

    const initialX = ev.clientX - position.left;
    const initialY = ev.clientY - position.top;
    this.dnd.x = figure.x;
    this.dnd.y = figure.y;
    this.dnd.width = figure.width;
    this.dnd.height = figure.height;

    const onMouseMove = (ev: MouseEvent) => {
      this.dnd.isActive = true;
      const newX = ev.clientX - position.left;
      let deltaX = newX - initialX;
      this.dnd.x = Math.max(figure.x + deltaX, 0);

      const newY = ev.clientY - position.top;
      let deltaY = newY - initialY;
      this.dnd.y = Math.max(figure.y + deltaY, 0);
    };
    const onMouseUp = (ev: MouseEvent) => {
      let { x, y } = this.dnd;
      // Correct position in case of moving to/from a frozen pane
      if (this.dnd.x > offsetCorrectionX && figure.x < offsetCorrectionX) {
        x += offsetX;
      } else if (this.dnd.x < offsetCorrectionX && figure.x > offsetCorrectionX) {
        x -= offsetX;
      }
      if (this.dnd.y > offsetCorrectionY && figure.y < offsetCorrectionY) {
        y += offsetY;
      } else if (this.dnd.y < offsetCorrectionY && figure.y > offsetCorrectionY) {
        y -= offsetY;
      }
      this.dnd.isActive = false;
      this.env.model.dispatch("UPDATE_FIGURE", { sheetId, id: figure.id, x, y });
    };
    startDnd(onMouseMove, onMouseUp);
  }

  onKeyDown(ev: KeyboardEvent) {
    const figure = this.props.figure;

    switch (ev.key) {
      case "Delete":
        this.env.model.dispatch("DELETE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          id: figure.id,
        });
        this.props.onFigureDeleted();
        ev.preventDefault();
        break;
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
        const deltaMap = {
          ArrowDown: [0, 1],
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
        };
        const delta = deltaMap[ev.key];
        this.env.model.dispatch("UPDATE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          id: figure.id,
          x: figure.x + delta[0],
          y: figure.y + delta[1],
        });
        ev.preventDefault();
        break;
    }
  }
}
