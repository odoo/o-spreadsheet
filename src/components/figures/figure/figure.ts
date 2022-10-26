import { Component, useEffect, useRef, useState } from "@odoo/owl";
import {
  ComponentsImportance,
  FIGURE_BORDER_COLOR,
  SELECTION_BORDER_COLOR,
} from "../../../constants";
import { figureRegistry } from "../../../registries/index";
import { Figure, Pixel, SpreadsheetChildEnv, UID } from "../../../types/index";
import { css } from "../../helpers/css";
import { gridOverlayPosition } from "../../helpers/dom_helpers";
import { startDnd } from "../../helpers/drag_and_drop";

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
const MIN_FIG_SIZE = 80;
const BORDER_WIDTH = 1;
const ACTIVE_BORDER_WIDTH = 2;

css/*SCSS*/ `
  div.o-figure {
    box-sizing: content-box;
    position: absolute;
    width: 100%;
    height: 100%;
    user-select: none;

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

    .o-figure-menu {
      right: 0px;
      display: none;
      position: absolute;
      padding: 5px;
    }

    .o-figure-menu-item {
      cursor: pointer;
    }

    .o-figure.active:focus,
    .o-figure:hover {
      .o-figure-menu {
        display: flex;
      }
    }
  }
`;

interface Props {
  figure: Figure;
  sidePanelIsOpen: boolean;
  onFigureDeleted: () => void;
}

export class FigureComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FigureComponent";
  static components = {};
  static defaultProps = {
    sidePanelIsOpen: false,
    onFigureDeleted: function () {},
  };

  private figureRegistry = figureRegistry;
  private keepRatio!: boolean;
  private borderWidth!: number;
  private minFigSize!: number;
  setup() {
    this.figureRegistry = figureRegistry;
    this.keepRatio = this.figureRegistry.get(this.props.figure.tag).keepRatio || false;
    this.minFigSize = this.figureRegistry.get(this.props.figure.tag).minFigSize || MIN_FIG_SIZE;
    const borderWidth = this.figureRegistry.get(this.props.figure.tag).borderWidth;
    this.borderWidth = borderWidth !== undefined ? borderWidth : BORDER_WIDTH;
    useEffect(
      (selectedFigureId: UID | null, thisFigureId: UID, el: HTMLElement | null) => {
        if (selectedFigureId === thisFigureId) {
          el?.focus();
        }
      },
      () => [this.env.model.getters.getSelectedFigureId(), this.props.figure.id, this.figureRef.el]
    );
  }

  private figureRef = useRef("figure");

  dnd = useState({
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

  private getBorderWidth(): Pixel {
    return this.isSelected ? ACTIVE_BORDER_WIDTH : this.env.isDashboard() ? 0 : this.borderWidth;
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
    const borderShift = ANCHOR_SIZE / 2;

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
    const borderOffset = this.borderWidth - this.getBorderWidth();
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
    const borderShift = ANCHOR_SIZE / 2;

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

  resize(dirX: number, dirY: number, ev: MouseEvent) {
    const figure = this.props.figure;

    ev.stopPropagation();
    const initialX = ev.clientX;
    const initialY = ev.clientY;
    this.dnd.isActive = true;
    this.dnd.x = figure.x;
    this.dnd.y = figure.y;
    this.dnd.width = figure.width;
    this.dnd.height = figure.height;

    let onMouseMove: (ev: MouseEvent) => void;
    if (this.keepRatio && dirX != 0 && dirY != 0) {
      onMouseMove = (ev: MouseEvent) => {
        const deltaX = Math.min(dirX * (initialX - ev.clientX), figure.width - this.minFigSize);
        const deltaY = Math.min(dirY * (initialY - ev.clientY), figure.height - this.minFigSize);
        const fraction = Math.min(deltaX / figure.width, deltaY / figure.height);
        this.dnd.width = figure.width * (1 - fraction);
        this.dnd.height = figure.height * (1 - fraction);
        if (dirX < 0) {
          this.dnd.x = figure.x + figure.width * fraction;
        }
        if (dirY < 0) {
          this.dnd.y = figure.y + figure.height * fraction;
        }
      };
    } else {
      onMouseMove = (ev: MouseEvent) => {
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
    }
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

    const initialX = ev.clientX - position.left;
    const initialY = ev.clientY - position.top;
    this.dnd.isActive = true;
    this.dnd.x = figure.x;
    this.dnd.y = figure.y;
    this.dnd.width = figure.width;
    this.dnd.height = figure.height;

    const onMouseMove = (ev: MouseEvent) => {
      const newX = ev.clientX - position.left;
      let deltaX = newX - initialX;
      if (newX > offsetCorrectionX && initialX < offsetCorrectionX) {
        deltaX += offsetX;
      } else if (newX < offsetCorrectionX && initialX > offsetCorrectionX) {
        deltaX -= offsetX;
      }
      this.dnd.x = Math.max(figure.x + deltaX, 0);

      const newY = ev.clientY - position.top;
      let deltaY = newY - initialY;

      if (newY > offsetCorrectionY && initialY < offsetCorrectionY) {
        deltaY += offsetY;
      } else if (newY < offsetCorrectionY && initialY > offsetCorrectionY) {
        deltaY -= offsetY;
      }
      this.dnd.y = Math.max(figure.y + deltaY, 0);
    };
    const onMouseUp = (ev: MouseEvent) => {
      this.dnd.isActive = false;
      this.env.model.dispatch("UPDATE_FIGURE", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        id: figure.id,
        x: this.dnd.x,
        y: this.dnd.y,
      });
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
        ev.stopPropagation();
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
        ev.stopPropagation();
        ev.preventDefault();
        break;
    }
  }
}

FigureComponent.props = {
  figure: Object,
  sidePanelIsOpen: { type: Boolean, optional: true },
  onFigureDeleted: { type: Function, optional: true },
};
