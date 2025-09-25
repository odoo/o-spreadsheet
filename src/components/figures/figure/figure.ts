import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { figureRegistry } from "../../../registries/figures_registry";
import {
  AnchorOffset,
  CSSProperties,
  FigureUI,
  Pixel,
  Rect,
  ResizeDirection,
  UID,
} from "../../../types/index";
import { getRefBoundingRect, keyboardEventToShortcutString } from "../../helpers/dom_helpers";
import { withZoom } from "../../helpers/zoom";
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

interface Props {
  figureUI: FigureUI;
  style: string;
  class: string;
  onMouseDown: (ev: MouseEvent) => void;
  onClickAnchor(dirX: ResizeDirection, dirY: ResizeDirection, ev: MouseEvent): void;
}

export class FigureComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FigureComponent";
  static props = {
    figureUI: Object,
    style: { type: String, optional: true },
    class: { type: String, optional: true },
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
  private figureWrapperRef = useRef("figureWrapper");
  private menuButtonRef = useRef("menuButton");

  private borderWidth!: number;

  get isSelected(): boolean {
    return this.env.model.getters.getSelectedFigureId() === this.props.figureUI.id;
  }

  get figureRegistry() {
    return figureRegistry;
  }

  private getBorderWidth(): Pixel {
    if (this.env.isDashboard()) {
      return 0;
    }
    return this.isSelected ? ACTIVE_BORDER_WIDTH : this.borderWidth;
  }

  getBorderStyle(position: "top" | "right" | "bottom" | "left"): string {
    return `border-${position}-width: ${this.getBorderWidth()}px;`;
  }

  get wrapperStyle() {
    const { x, y, width, height } = this.props.figureUI;
    return cssPropertiesToCss({
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
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
    if (this.env.isDashboard()) {
      return;
    }
    const zoomedMouseEvent = withZoom(this.env, ev);
    this.openContextMenu({
      x: zoomedMouseEvent.clientX,
      y: zoomedMouseEvent.clientY,
      width: 0,
      height: 0,
    });
  }

  showMenu() {
    this.openContextMenu(getRefBoundingRect(this.menuButtonRef));
  }

  openContextMenu(anchorRect: Rect) {
    this.menuState.isOpen = true;
    this.menuState.anchorRect = anchorRect;
    this.menuState.menuItems = figureRegistry
      .get(this.props.figureUI.tag)
      .menuBuilder(this.props.figureUI.id, this.env);
  }

  editWrapperStyle(properties: CSSProperties) {
    if (this.figureWrapperRef.el) {
      for (const property in properties) {
        this.figureWrapperRef.el.style.setProperty(property, properties[property] || null);
      }
    }
  }

  get isFigureResizable(): boolean {
    return (
      this.isSelected &&
      !this.env.isMobile() &&
      !this.env.isDashboard() &&
      !this.env.model.getters.isCurrentSheetLocked()
    );
  }
}
