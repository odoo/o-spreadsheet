import { Component, useEffect, useRef } from "@odoo/owl";
import {
  ComponentsImportance,
  FIGURE_BORDER_COLOR,
  FIGURE_BORDER_WIDTH,
  SELECTION_BORDER_COLOR,
} from "../../../constants";
import { figureRegistry } from "../../../registries/index";
import { Figure, Pixel, SpreadsheetChildEnv, UID } from "../../../types/index";
import { css } from "../../helpers/css";
import { startDnd } from "../../helpers/drag_and_drop";
import {
  FigureDndManager,
  FigureDnDMoveManager,
  FigureDnDResizeManager,
} from "../../helpers/figure_dnd_manager";

type Anchor =
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
const ACTIVE_BORDER_WIDTH = 2;

css/*SCSS*/ `
  div.o-figure {
    box-sizing: content-box;
    position: absolute;
    width: 100%;
    height: 100%;

    bottom: 0px;
    right: 0px;
    border: solid ${FIGURE_BORDER_COLOR};
    &:focus {
      outline: none;
    }
    &.active {
      border: solid ${SELECTION_BORDER_COLOR};
    }

    &.o-dragging {
      opacity: 0.9;
      cursor: grabbing;
    }
  }

  .o-figure-wrapper {
    position: absolute;
    box-sizing: content-box;

    .o-figure-overflow-wrapper {
      position: absolute;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }
    .o-anchor {
      z-index: ${ComponentsImportance.ChartAnchor};
      position: absolute;
      width: ${ANCHOR_SIZE}px;
      height: ${ANCHOR_SIZE}px;
      background-color: #1a73e8;
      outline: ${FIGURE_BORDER_WIDTH}px solid white;

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

  .o-figure-snap-border {
    position: absolute;
    z-index: ${ComponentsImportance.ChartAnchor + 1};
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

interface Props {
  sidePanelIsOpen: Boolean;
  onFigureDeleted: () => void;
  figure: Figure;
}

export class FigureComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FigureComponent";
  static components = {};
  figureRegistry = figureRegistry;

  private figureRef = useRef("figure");

  private dndManager: FigureDndManager | undefined = undefined;

  get displayedFigure(): Figure {
    return this.dndManager
      ? { ...this.props.figure, ...this.dndManager.getDnd() }
      : this.props.figure;
  }

  get isSelected(): boolean {
    return this.env.model.getters.getSelectedFigureId() === this.props.figure.id;
  }

  /** Get the current figure size, which is either the stored figure size of the DnD figure size */
  private getFigureSize() {
    const { width, height } = this.displayedFigure;
    return { width, height };
  }

  private getFigureSizeWithBorders() {
    const { width, height } = this.getFigureSize();
    const borders = this.getBorderWidth() * 2;
    return { width: width + borders, height: height + borders };
  }

  private getBorderWidth() {
    return this.isSelected ? ACTIVE_BORDER_WIDTH : this.env.isDashboard() ? 0 : FIGURE_BORDER_WIDTH;
  }

  private getBorderShift() {
    return ANCHOR_SIZE / 2;
  }

  getFigureStyle() {
    const { width, height } = this.displayedFigure;
    return `width:${width}px;height:${height}px;border-width: ${this.getBorderWidth()}px;`;
  }

  getContainerStyle() {
    const target = this.displayedFigure;
    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      this.env.model.getters.getMainViewportCoordinates();

    const { offsetX, offsetY } = this.env.model.getters.getActiveSheetScrollInfo();
    let { width, height } = this.getFigureSizeWithBorders();
    let x: Pixel, y: Pixel;

    // Visually, the content of the container is slightly shifted as it includes borders and/or corners.
    // If we want to make assertions on the position of the content, we need to take this shift into account
    const borderShift = this.getBorderShift();

    if (target.x + borderShift < offsetCorrectionX) {
      x = target.x;
    } else if (target.x + borderShift < offsetCorrectionX + offsetX) {
      x = offsetCorrectionX;
      width += target.x - offsetCorrectionX - offsetX;
    } else {
      x = target.x - offsetX;
    }

    if (target.y + borderShift < offsetCorrectionY) {
      y = target.y;
    } else if (target.y + borderShift < offsetCorrectionY + offsetY) {
      y = offsetCorrectionY;
      height += target.y - offsetCorrectionY - offsetY;
    } else {
      y = target.y - offsetY;
    }

    if (width < 0 || height < 0) {
      return `display:none;`;
    }
    const borderOffset = FIGURE_BORDER_WIDTH - this.getBorderWidth();
    // TODO : remove the +1 once 2951210 is fixed
    return (
      `top:${y + borderOffset + 1}px;` +
      `left:${x + borderOffset}px;` +
      `width:${width}px;` +
      `height:${height}px;` +
      `z-index: ${ComponentsImportance.Figure + (this.isSelected ? 1 : 0)}`
    );
  }

  getAnchorPosition(anchor: Anchor) {
    let { width, height } = this.getFigureSizeWithBorders();

    const anchorCenteringOffset = (ANCHOR_SIZE - ACTIVE_BORDER_WIDTH) / 2;
    const target = this.displayedFigure;

    let x = 0;
    let y = 0;

    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      this.env.model.getters.getMainViewportCoordinates();
    const { offsetX, offsetY } = this.env.model.getters.getActiveSheetScrollInfo();
    const borderShift = this.getBorderShift();

    if (target.x + borderShift < offsetCorrectionX) {
      x = 0;
    } else if (target.x + borderShift < offsetCorrectionX + offsetX) {
      x = target.x - offsetCorrectionX - offsetX;
    } else {
      x = 0;
    }

    if (target.y + borderShift < offsetCorrectionY) {
      y = 0;
    } else if (target.y + borderShift < offsetCorrectionY + offsetY) {
      y = target.y - offsetCorrectionY - offsetY;
    } else {
      y = 0;
    }

    if (anchor.includes("top")) {
      y -= anchorCenteringOffset;
    } else if (anchor.includes("bottom")) {
      y += height - ACTIVE_BORDER_WIDTH - anchorCenteringOffset;
    } else {
      y += (height - ACTIVE_BORDER_WIDTH) / 2 - anchorCenteringOffset;
    }

    if (anchor.includes("left")) {
      x += -anchorCenteringOffset;
    } else if (anchor.includes("right")) {
      x += width - ACTIVE_BORDER_WIDTH - anchorCenteringOffset;
    } else {
      x += (width - ACTIVE_BORDER_WIDTH) / 2 - anchorCenteringOffset;
    }

    let visibility = "visible";
    if (x < -anchorCenteringOffset || y < -anchorCenteringOffset) {
      visibility = "hidden";
    }
    return `visibility:${visibility};top:${y}px; left:${x}px;`;
  }

  setup() {
    useEffect(
      (selectedFigureId: UID | null, thisFigureId: UID, el: HTMLElement | null) => {
        if (selectedFigureId === thisFigureId) {
          el?.focus();
        }
      },
      () => [this.env.model.getters.getSelectedFigureId(), this.props.figure.id, this.figureRef.el]
    );
  }

  resize(dirX: -1 | 0 | 1, dirY: -1 | 0 | 1, ev: MouseEvent) {
    const figure = this.props.figure;

    ev.stopPropagation();
    const visibleFigures = this.env.model.getters.getVisibleFigures();
    const otherFigures = visibleFigures.filter((fig) => fig.id !== figure.id);
    const mousePosition = { x: ev.clientX, y: ev.clientY };
    const dndManager = new FigureDnDResizeManager(figure, otherFigures, mousePosition);
    this.dndManager = dndManager;

    const onMouseMove = (ev: MouseEvent) => {
      dndManager.resize(dirX, dirY, { x: ev.clientX, y: ev.clientY });
      this.render();
    };
    const onMouseUp = (ev: MouseEvent) => {
      const dnd = dndManager.getDnd();
      const update: Partial<Figure> = {
        x: dnd.x,
        y: dnd.y,
      };
      if (dirX) {
        update.width = dnd.width;
      }
      if (dirY) {
        update.height = dnd.height;
      }
      this.env.model.dispatch("UPDATE_FIGURE", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        id: figure.id,
        ...update,
      });
      this.dndManager = undefined;
      this.render();
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
    const visibleFigures = this.env.model.getters.getVisibleFigures();
    const otherFigures = visibleFigures.filter((fig) => fig.id !== figure.id);
    const mousePosition = { x: ev.clientX, y: ev.clientY };
    const mainViewportPosition = this.env.model.getters.getMainViewportCoordinates();

    const dndManager = new FigureDnDMoveManager(
      figure,
      otherFigures,
      mousePosition,
      mainViewportPosition,
      this.getBorderShift()
    );
    this.dndManager = dndManager;

    const onMouseMove = (ev: MouseEvent) => {
      dndManager.drag(
        { x: ev.clientX, y: ev.clientY },
        this.env.model.getters.getActiveSheetScrollInfo()
      );
      this.render();
    };
    const onMouseUp = (ev: MouseEvent) => {
      const dnd = dndManager.getDnd();
      this.env.model.dispatch("UPDATE_FIGURE", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        id: figure.id,
        x: dnd.x,
        y: dnd.y,
      });
      this.dndManager = undefined;
      this.render();
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

  get horizontalSnapLineStyle(): string {
    if (!this.dndManager) return "";

    const snap = this.dndManager.getCurrentHorizontalSnapLine();
    const dnd = this.dndManager.getDnd();
    const { offsetX, offsetY } = this.env.model.getters.getActiveSheetScrollInfo();

    if (!snap || snap.y < offsetY) return "";

    const leftMost = Math.min(dnd.x, ...snap.matchedFigs.map((fig) => fig.x));
    const rightMost = Math.max(
      dnd.x + dnd.width,
      ...snap.matchedFigs.map((fig) => fig.x + fig.width)
    );

    const overflowX = offsetX - leftMost > 0 ? offsetX - leftMost : 0;
    const overflowY = offsetY - dnd.y > 0 ? offsetY - dnd.y : 0;

    const left = leftMost === dnd.x ? 0 : leftMost - dnd.x + overflowX;
    return `left: ${left}px;width: ${rightMost - leftMost - overflowX}px;top:${
      snap.y - dnd.y + FIGURE_BORDER_WIDTH - overflowY
    }px`;
  }

  get verticalSnapLineStyle(): string {
    if (!this.dndManager) return "";
    const snap = this.dndManager.getCurrentVerticalSnapLine();
    const dnd = this.dndManager.getDnd();

    const { offsetX, offsetY } = this.env.model.getters.getActiveSheetScrollInfo();

    if (!snap || snap.x < offsetX) return "";

    const topMost = Math.min(dnd.y, ...snap.matchedFigs.map((fig) => fig.y));
    const bottomMost = Math.max(
      dnd.y + dnd.height,
      ...snap.matchedFigs.map((fig) => fig.y + fig.height)
    );

    const overflowY = offsetY - topMost > 0 ? offsetY - topMost : 0;
    const overflowX = offsetX - dnd.x > 0 ? offsetX - dnd.x : 0;

    const top = topMost === dnd.y ? 0 : topMost - dnd.y + overflowY;
    return `top: ${top}px;height: ${bottomMost - topMost - overflowY}px;left:${
      snap.x - dnd.x + FIGURE_BORDER_WIDTH - overflowX
    }px`;
  }
}
