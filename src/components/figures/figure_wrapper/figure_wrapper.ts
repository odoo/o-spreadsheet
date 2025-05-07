import { Component } from "@odoo/owl";
import {
  ComponentsImportance,
  FIGURE_BORDER_COLOR,
  SELECTION_BORDER_COLOR,
} from "../../../constants";
import { figureRegistry } from "../../../registries/figures_registry";
import {
  CSSProperties,
  FigureUI,
  Pixel,
  ResizeDirection,
  SpreadsheetChildEnv,
} from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { Menu } from "../../menu/menu";
import { FigureComponent } from "../figure/figure";

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
  div.o-figure-border {
    z-index: 1;
  }

  .o-figure-wrapper {
    position: absolute;
    box-sizing: content-box;

    .o-fig-anchor {
      z-index: ${ComponentsImportance.FigureAnchor};
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
  figureUI: FigureUI;
  style: string;
  onFigureDeleted: () => void;
  onMouseDown: (ev: MouseEvent) => void;
  onClickAnchor(dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent): void;
}

export class FigureWrapper extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FigureWrapper";
  static props = {
    figureUI: Object,
    style: { type: String, optional: true },
    onFigureDeleted: { type: Function, optional: true },
    onMouseDown: { type: Function, optional: true },
    onClickAnchor: { type: Function, optional: true },
  };
  static components = { Menu, FigureComponent };
  static defaultProps = {
    onFigureDeleted: () => {},
    onMouseDown: () => {},
    onClickAnchor: () => {},
  };

  private borderWidth!: number;

  get isSelected(): boolean {
    return this.env.model.getters.getSelectedFigureId() === this.props.figureUI.id;
  }

  get figureRegistry() {
    return figureRegistry;
  }

  private getBorderWidth(): Pixel {
    if (this.env.isDashboard()) return 0;
    return this.isSelected ? ACTIVE_BORDER_WIDTH : this.borderWidth;
  }

  get borderStyle() {
    const borderWidth = this.getBorderWidth();
    const borderColor = this.isSelected ? SELECTION_BORDER_COLOR : FIGURE_BORDER_COLOR;
    return `border: ${borderWidth}px solid ${borderColor};`;
  }

  get wrapperStyle() {
    const { x, y, width, height } = this.props.figureUI;
    const properties: CSSProperties = {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      "z-index": String(ComponentsImportance.Figure + (this.isSelected ? 1 : 0)),
    };

    if (this.env.isDashboard()) {
      properties.transition = "all 0.2s ease-in-out";
    }

    return cssPropertiesToCss(properties);
  }

  getResizerPosition(resizer: ResizeAnchor): string {
    const anchorCenteringOffset = (ANCHOR_SIZE - ACTIVE_BORDER_WIDTH) / 2;
    const style: CSSProperties = {};
    if (resizer.includes("top")) {
      style.top = `${-anchorCenteringOffset}px`;
    } else if (resizer.includes("bottom")) {
      style.bottom = `${-anchorCenteringOffset}px`;
    } else {
      style.bottom = `calc(50% - ${anchorCenteringOffset}px)`;
    }

    if (resizer.includes("left")) {
      style.left = `${-anchorCenteringOffset}px`;
    } else if (resizer.includes("right")) {
      style.right = `${-anchorCenteringOffset}px`;
    } else {
      style.right = `calc(50% - ${anchorCenteringOffset}px)`;
    }
    return cssPropertiesToCss(style);
  }

  setup() {
    const borderWidth = figureRegistry.get(this.props.figureUI.tag).borderWidth;
    this.borderWidth = borderWidth !== undefined ? borderWidth : BORDER_WIDTH;
  }

  clickAnchor(dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent) {
    this.props.onClickAnchor(dirX, dirY, ev);
  }
}
