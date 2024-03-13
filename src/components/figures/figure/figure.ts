import { Component, onWillUnmount, useEffect, useRef, useState } from "@odoo/owl";
import {
  ComponentsImportance,
  FIGURE_BORDER_COLOR,
  MENU_WIDTH,
  SELECTION_BORDER_COLOR,
} from "../../../constants";
import { figureRegistry } from "../../../registries/index";
import {
  CSSProperties,
  DOMCoordinates,
  Figure,
  Pixel,
  ResizeDirection,
  SpreadsheetChildEnv,
  UID,
} from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { useAbsoluteBoundingRect } from "../../helpers/position_hook";
import { Menu, MenuState } from "../../menu/menu";

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
    user-select: none;

    &:focus {
      outline: none;
    }
  }

  div.o-figure-border {
    box-sizing: border-box;
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

    .o-figure-menu {
      right: 0px;
      top: 0px;
      display: none;
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
  style: string;
  onFigureDeleted: () => void;
  onMouseDown: (ev: MouseEvent) => void;
  onClickAnchor(dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent): void;
}

export class FigureComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FigureComponent";
  static components = { Menu };
  static defaultProps = {
    onFigureDeleted: () => {},
    onMouseDown: () => {},
    onClickAnchor: () => {},
  };

  private menuState: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  private figureRef = useRef("figure");
  private menuButtonRef = useRef("menuButton");
  private menuButtonRect = useAbsoluteBoundingRect(this.menuButtonRef);

  private borderWidth!: number;

  get isSelected(): boolean {
    return this.env.model.getters.getSelectedFigureId() === this.props.figure.id;
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
    const { x, y, width, height } = this.props.figure;
    return cssPropertiesToCss({
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      "z-index": String(ComponentsImportance.Figure + (this.isSelected ? 1 : 0)),
    });
  }

  getResizerPosition(resizer: ResizeAnchor): string {
    const anchorCenteringOffset = (ANCHOR_SIZE - ACTIVE_BORDER_WIDTH) / 2;
    let style: CSSProperties = {};
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
    const borderWidth = figureRegistry.get(this.props.figure.tag).borderWidth;
    this.borderWidth = borderWidth !== undefined ? borderWidth : BORDER_WIDTH;
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

    onWillUnmount(() => {
      this.props.onFigureDeleted();
    });
  }

  clickAnchor(dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent) {
    this.props.onClickAnchor(dirX, dirY, ev);
  }

  onMouseDown(ev: MouseEvent) {
    this.props.onMouseDown(ev);
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
        ev.stopPropagation();
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
        ev.stopPropagation();
        break;
    }
  }

  onContextMenu(ev: MouseEvent) {
    if (this.env.isDashboard()) return;
    const position = {
      x: ev.clientX,
      y: ev.clientY,
    };
    this.openContextMenu(position);
  }

  showMenu() {
    const { x, y, width } = this.menuButtonRect;
    const menuPosition = {
      x: x >= MENU_WIDTH ? x - MENU_WIDTH : x + width,
      y: y,
    };
    this.openContextMenu(menuPosition);
  }

  private openContextMenu(position: DOMCoordinates) {
    this.menuState.isOpen = true;
    this.menuState.position = position;
    this.menuState.menuItems = figureRegistry
      .get(this.props.figure.tag)
      .menuBuilder(this.props.figure.id, this.props.onFigureDeleted, this.env);
  }
}

FigureComponent.props = {
  figure: Object,
  style: { type: String, optional: true },
  onFigureDeleted: { type: Function, optional: true },
  onMouseDown: { type: Function, optional: true },
  onClickAnchor: { type: Function, optional: true },
};
