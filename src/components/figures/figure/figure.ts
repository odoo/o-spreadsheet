import { Component, onWillUnmount, useEffect, useRef, useState } from "@odoo/owl";
import { figureRegistry } from "../../../registries/figures_registry";
import { AnchorOffset, FigureUI, Rect, SpreadsheetChildEnv, UID } from "../../../types/index";
import { css } from "../../helpers/css";
import { keyboardEventToShortcutString } from "../../helpers/dom_helpers";
import { useAbsoluteBoundingRect } from "../../helpers/position_hook";
import { Menu, MenuState } from "../../menu/menu";

css/*SCSS*/ `
  div.o-figure {
    position: absolute;
    width: 100%;
    height: 100%;
    user-select: none;

    &:focus {
      outline: none;
    }

    .o-figure-menu {
      right: 0px;
      top: 0px;
      display: none;
    }

    .o-figure-menu-item {
      cursor: pointer;
    }

    &.active:focus,
    &:hover {
      .o-figure-menu {
        display: flex;
      }
    }
  }
`;

interface Props {
  figureUI: FigureUI;
  style: string;
  onFigureDeleted: () => void;
  onMouseDown: (ev: MouseEvent) => void;
}

export class FigureComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FigureComponent";
  static props = {
    figureUI: Object,
    style: { type: String, optional: true },
    onFigureDeleted: { type: Function, optional: true },
    onMouseDown: { type: Function, optional: true },
  };
  static components = { Menu };
  static defaultProps = {
    onFigureDeleted: () => {},
    onMouseDown: () => {},
  };

  private menuState: MenuState = useState({ isOpen: false, anchorRect: null, menuItems: [] });

  private figureRef = useRef("figure");
  private menuButtonRef = useRef("menuButton");
  private menuButtonRect = useAbsoluteBoundingRect(this.menuButtonRef);

  get isSelected(): boolean {
    return this.env.model.getters.getSelectedFigureId() === this.props.figureUI.id;
  }

  get figureRegistry() {
    return figureRegistry;
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
      () => [
        this.env.model.getters.getSelectedFigureId(),
        this.props.figureUI.id,
        this.figureRef.el,
      ]
    );

    onWillUnmount(() => {
      this.props.onFigureDeleted();
    });
  }

  onMouseDown(ev: MouseEvent) {
    this.props.onMouseDown(ev);
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
        this.props.onFigureDeleted();
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
    this.openContextMenu(this.menuButtonRect);
  }

  private openContextMenu(anchorRect: Rect) {
    this.menuState.isOpen = true;
    this.menuState.anchorRect = anchorRect;
    this.menuState.menuItems = figureRegistry
      .get(this.props.figureUI.tag)
      .menuBuilder(this.props.figureUI.id, this.props.onFigureDeleted, this.env);
  }
}
