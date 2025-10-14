import { Component, useEffect, useRef, useState } from "@odoo/owl";
import {
  ComponentsImportance,
  FIGURE_BORDER_COLOR,
  SELECTION_BORDER_COLOR,
} from "../../../constants";
import { figureRegistry } from "../../../registries/figures_registry";
import {
  AnchorOffset,
  CSSProperties,
  FigureUI,
  Pixel,
  Rect,
  ResizeDirection,
  SpreadsheetChildEnv,
  UID,
} from "../../../types/index";
import { css, cssPropertiesToCss } from "../../helpers/css";
import { getRefBoundingRect, keyboardEventToShortcutString } from "../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../menu_popover/menu_popover";

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
    position: absolute;
    width: 100%;
    height: 100%;
    user-select: none;

    &:focus {
      outline: none;
    }
  }

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
  figureUI: FigureUI;
  style: string;
  onMouseDown: (ev: MouseEvent) => void;
  onClickAnchor(dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent): void;
}

export class FigureComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FigureComponent";
  static props = {
    figureUI: Object,
    style: { type: String, optional: true },
    onMouseDown: { type: Function, optional: true },
    onClickAnchor: { type: Function, optional: true },
  };
  static components = { MenuPopover };
  static defaultProps = {
    onMouseDown: () => {},
    onClickAnchor: () => {},
  };

  private menuState: MenuState = useState({ isOpen: false, anchorRect: null, menuItems: [] });

  private figureRef = useRef("figure");
  private menuButtonRef = useRef("menuButton");

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
      () => [
        this.env.model.getters.getSelectedFigureId(),
        this.props.figureUI.id,
        this.figureRef.el,
      ]
    );
  }

  clickAnchor(dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent) {
    this.props.onClickAnchor(dirX, dirY, ev);
  }

  onMouseDown(ev: MouseEvent) {
    if (!this.env.isMobile()) {
      this.props.onMouseDown(ev);
    }
  }

  onClick(ev: MouseEvent) {
    if (this.env.isMobile()) {
      this.props.onMouseDown(ev);
    }
  }

  onKeyDown(ev: KeyboardEvent) {
    const keyDownShortcut = keyboardEventToShortcutString(ev);

    switch (keyDownShortcut) {
      case "Delete":
      case "Backspace":
        this.env.model.dispatch("DELETE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          figureId: this.props.figureUI.id,
        });
        ev.preventDefault();
        ev.stopPropagation();
        break;
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
        const { col, row, offset } = this.postionInBoundary(this.props.figureUI, ev.key);
        this.env.model.dispatch("UPDATE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          figureId: this.props.figureUI.id,
          offset,
          col,
          row,
        });
        ev.preventDefault();
        ev.stopPropagation();
        break;
      case "Ctrl+A":
        // Maybe in the future we will implement a way to select all figures
        ev.preventDefault();
        ev.stopPropagation();
        break;
      case "Ctrl+Y":
      case "Ctrl+Z":
        if (keyDownShortcut === "Ctrl+Y") {
          this.env.model.dispatch("REQUEST_REDO");
        } else if (keyDownShortcut === "Ctrl+Z") {
          this.env.model.dispatch("REQUEST_UNDO");
        }
        ev.preventDefault();
        ev.stopPropagation();
        break;
    }
  }

  private postionInBoundary(position: AnchorOffset, key: string): AnchorOffset {
    const sheetId = this.env.model.getters.getActiveSheetId();
    let { col, row, offset } = position;
    offset = { ...offset };
    switch (key) {
      case "ArrowUp":
        if (offset.y === 0) {
          row--;
          offset.y = this.env.model.getters.getRowSize(sheetId, row) - 1;
        } else {
          offset.y--;
        }
        break;
      case "ArrowLeft":
        if (offset.x === 0) {
          col--;
          offset.x = this.env.model.getters.getColSize(sheetId, col) - 1;
        } else {
          offset.x--;
        }
        break;
      case "ArrowDown":
        if (offset.y === this.env.model.getters.getRowSize(sheetId, row)) {
          row++;
          offset.y = 0;
        } else {
          offset.y++;
        }
        break;
      case "ArrowRight":
        if (offset.x === this.env.model.getters.getColSize(sheetId, row)) {
          col++;
          offset.x = 0;
        } else {
          offset.x++;
        }
    }
    return { col, row, offset };
  }

  onContextMenu(ev: MouseEvent) {
    if (this.env.isDashboard()) return;
    this.openContextMenu({ x: ev.clientX, y: ev.clientY, width: 0, height: 0 });
  }

  showMenu() {
    this.openContextMenu(getRefBoundingRect(this.menuButtonRef));
  }

  private openContextMenu(anchorRect: Rect) {
    this.menuState.isOpen = true;
    this.menuState.anchorRect = anchorRect;
    this.menuState.menuItems = figureRegistry
      .get(this.props.figureUI.tag)
      .menuBuilder(this.props.figureUI.id, this.env);
  }
}
