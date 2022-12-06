import { Component, useRef, useState } from "@odoo/owl";
import { MENU_WIDTH } from "../../../constants";
import { getMaxFigureSize } from "../../../helpers/figures/figure/figure";
import { MenuItemRegistry } from "../../../registries/menu_items_registry";
import { _lt } from "../../../translation";
import { DOMCoordinates, Figure, SpreadsheetChildEnv, UID } from "../../../types";
import { useAbsolutePosition } from "../../helpers/position_hook";
import { Menu, MenuState } from "../../menu/menu";

interface Props {
  figure: Figure;
  onFigureDeleted: () => void;
}

export class ImageFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ImageFigure";
  static components = { Menu };
  private menuState: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  private imageContainerRef = useRef("o-image");
  private menuButtonRef = useRef("menuButton");
  private menuButtonPosition = useAbsolutePosition(this.menuButtonRef);
  private position = useAbsolutePosition(this.imageContainerRef);

  private getMenuItemRegistry(): MenuItemRegistry {
    const registry = new MenuItemRegistry();
    registry.add("copy", {
      name: _lt("Copy"),
      description: "Ctrl+C",
      sequence: 1,
      action: async () => {
        this.env.model.dispatch("SELECT_FIGURE", { id: this.figureId });
        this.env.model.dispatch("COPY");
        await this.env.clipboard.clear();
      },
    });
    registry.add("cut", {
      name: _lt("Cut"),
      description: "Ctrl+X",
      sequence: 2,
      action: async () => {
        this.env.model.dispatch("SELECT_FIGURE", { id: this.figureId });
        this.env.model.dispatch("CUT");
        await this.env.clipboard.clear();
      },
    });
    registry.add("reset_size", {
      name: _lt("Reset size"),
      sequence: 3,
      action: () => {
        const size = this.env.model.getters.getImageSize(this.figureId);
        const { height, width } = getMaxFigureSize(this.env.model.getters, size);
        this.env.model.dispatch("UPDATE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          id: this.figureId,
          height,
          width,
        });
      },
    });
    registry.add("delete", {
      name: _lt("Delete image"),
      description: "delete",
      sequence: 5,
      action: () => {
        this.env.model.dispatch("DELETE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          id: this.figureId,
        });
      },
    });
    return registry;
  }

  onContextMenu(ev: MouseEvent) {
    const position = {
      x: this.position.x + ev.offsetX,
      y: this.position.y + ev.offsetY,
    };
    this.openContextMenu(position);
  }

  showMenu() {
    const position = {
      x: this.menuButtonPosition.x - MENU_WIDTH,
      y: this.menuButtonPosition.y,
    };
    this.openContextMenu(position);
  }

  private openContextMenu(position: DOMCoordinates) {
    const registry = this.getMenuItemRegistry();
    this.menuState.isOpen = true;
    this.menuState.menuItems = registry.getAll().filter((x) => x.isVisible(this.env));
    this.menuState.position = position;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get figureId(): UID {
    return this.props.figure.id;
  }

  get getImagePath(): string {
    return this.env.model.getters.getImagePath(this.figureId);
  }
}

ImageFigure.props = {
  figure: Object,
  onFigureDeleted: Function,
};
