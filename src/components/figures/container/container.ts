import { Component, onMounted, useState } from "@odoo/owl";
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
import { ChartFigure } from "../figure_chart/figure_chart";

type Anchor =
  | "top left"
  | "top"
  | "top right"
  | "right"
  | "bottom right"
  | "bottom"
  | "bottom left"
  | "left";

interface FigureInfo {
  id: UID;
  isSelected: boolean;
  figure: Figure;
}

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
const ANCHOR_SIZE = 8;
const BORDER_WIDTH = 1;
const ACTIVE_BORDER_WIDTH = 2;
const MIN_FIG_SIZE = 80;

css/*SCSS*/ `
  .o-figure-wrapper {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  div.o-figure {
    box-sizing: content-box;
    position: absolute;
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

  .o-figure-container {
    position: absolute;
    box-sizing: content-box;

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
  }
`;

interface Props {
  sidePanelIsOpen: Boolean;
  onFigureDeleted: () => void;
}

export class FiguresContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FiguresContainer";
  static components = {};
  figureRegistry = figureRegistry;

  dnd = useState({
    figureId: "",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  getVisibleFigures(): FigureInfo[] {
    const selectedId = this.env.model.getters.getSelectedFigureId();
    return this.env.model.getters.getVisibleFigures().map((f) => {
      let figure = f;
      // Returns current state of drag&drop figure instead of its stored state
      if (this.dnd.figureId === f.id) {
        figure = {
          ...f,
          x: this.dnd.x,
          y: this.dnd.y,
          width: this.dnd.width,
          height: this.dnd.height,
        };
      }
      return {
        id: f.id,
        isSelected: f.id === selectedId,
        figure: figure,
      };
    });
  }

  /** Get the current figure size, which is either the stored figure size of the DnD figure size */
  private getFigureSize(info: FigureInfo) {
    const { figure, isSelected } = info;
    const target = figure.id === (isSelected && this.dnd.figureId) ? this.dnd : figure;
    const { width, height } = target;
    return { width, height };
  }

  private getFigureSizeWithBorders(info: FigureInfo) {
    const { width, height } = this.getFigureSize(info);
    const borders = this.getBorderWidth(info) * 2;
    return { width: width + borders, height: height + borders };
  }

  private getBorderWidth(info: FigureInfo) {
    return info.isSelected ? ACTIVE_BORDER_WIDTH : this.env.isDashboard() ? 0 : BORDER_WIDTH;
  }

  getFigureStyle(info: FigureInfo) {
    const { width, height } = info.figure;
    return `width:${width}px;height:${height}px;border-width: ${this.getBorderWidth(info)}px;`;
  }

  getContainerStyle(info: FigureInfo) {
    const { figure, isSelected } = info;
    const target = figure.id === (isSelected && this.dnd.figureId) ? this.dnd : figure;
    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      this.env.model.getters.getMainViewportCoordinates();

    const { offsetX, offsetY } = this.env.model.getters.getActiveSheetScrollInfo();
    let { width, height } = this.getFigureSizeWithBorders(info);
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
    const borderOffset = BORDER_WIDTH - this.getBorderWidth(info);
    // TODO : remove the +1 once 2951210 is fixed
    return (
      `top:${y + borderOffset + 1}px;` +
      `left:${x + borderOffset}px;` +
      `width:${width}px;` +
      `height:${height}px;` +
      `z-index: ${ComponentsImportance.Figure + (info.isSelected ? 1 : 0)}`
    );
  }

  getAnchorPosition(anchor: Anchor, info: FigureInfo) {
    let { width, height } = this.getFigureSizeWithBorders(info);

    const anchorCenteringOffset = (ANCHOR_SIZE - ACTIVE_BORDER_WIDTH) / 2;
    const { figure, isSelected } = info;
    const target = figure.id === (isSelected && this.dnd.figureId) ? this.dnd : figure;

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

  resize(figure: Figure, dirX: number, dirY: number, ev: MouseEvent) {
    ev.stopPropagation();
    const initialX = ev.clientX;
    const initialY = ev.clientY;
    this.dnd.figureId = figure.id;
    this.dnd.x = figure.x;
    this.dnd.y = figure.y;
    this.dnd.width = figure.width;
    this.dnd.height = figure.height;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaX = dirX * (ev.clientX - initialX);
      const deltaY = dirY * (ev.clientY - initialY);
      this.dnd.width = Math.max(figure.width + deltaX, MIN_FIG_SIZE);
      this.dnd.height = Math.max(figure.height + deltaY, MIN_FIG_SIZE);
      if (dirX < 0) {
        this.dnd.x = figure.x - deltaX;
      }
      if (dirY < 0) {
        this.dnd.y = figure.y - deltaY;
      }
    };
    const onMouseUp = (ev: MouseEvent) => {
      this.dnd.figureId = "";
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

  onMouseDown(figure: Figure, ev: MouseEvent) {
    if (ev.button > 0 || this.env.model.getters.isReadonly()) {
      // not main button, probably a context menu
      return;
    }
    const selectResult = this.env.model.dispatch("SELECT_FIGURE", { id: figure.id });
    if (!selectResult.isSuccessful) {
      return;
    }
    if (this.props.sidePanelIsOpen) {
      this.env.openSidePanel("ChartPanel", { figureId: figure.id });
    }

    const position = gridOverlayPosition();
    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      this.env.model.getters.getMainViewportCoordinates();
    const { offsetX, offsetY } = this.env.model.getters.getActiveSheetScrollInfo();

    const initialX = ev.clientX - position.left;
    const initialY = ev.clientY - position.top;
    this.dnd.figureId = figure.id;
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
      this.dnd.figureId = "";
      this.env.model.dispatch("UPDATE_FIGURE", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        id: figure.id,
        x: this.dnd.x,
        y: this.dnd.y,
      });
    };
    startDnd(onMouseMove, onMouseUp);
  }

  onKeyDown(figure: Figure, ev: KeyboardEvent) {
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

figureRegistry.add("chart", { Component: ChartFigure, SidePanelComponent: "ChartPanel" });
