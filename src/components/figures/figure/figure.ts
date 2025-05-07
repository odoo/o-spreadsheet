import { Component, useRef, useState } from "@odoo/owl";
import { figureRegistry } from "../../../registries/figures_registry";
import { Figure, Rect, SpreadsheetChildEnv } from "../../../types/index";
import { css } from "../../helpers/css";
import { useAbsoluteBoundingRect } from "../../helpers/position_hook";
import { Menu, MenuState } from "../../menu/menu";

css/*SCSS*/ `
  div.o-figure {
    position: absolute;
    width: 100%;
    height: 100%;
    user-select: none;

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
  figureUI: Figure;
  style: string;
  onFigureDeleted: () => void;
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
  };

  private menuState: MenuState = useState({ isOpen: false, anchorRect: null, menuItems: [] });

  private menuButtonRef = useRef("menuButton");
  private menuButtonRect = useAbsoluteBoundingRect(this.menuButtonRef);

  get figureRegistry() {
    return figureRegistry;
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
