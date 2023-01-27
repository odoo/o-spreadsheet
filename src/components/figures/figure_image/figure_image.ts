import { Component, useRef } from "@odoo/owl";
import { MENU_WIDTH } from "../../../constants";
import { getMaxFigureSize } from "../../../helpers/figures/figure/figure";
import { createMenu } from "../../../registries/menu_items_registry";
import { _lt } from "../../../translation";
import { DOMCoordinates, Figure, SpreadsheetChildEnv, UID } from "../../../types";
import { MenuInterface, useMenu } from "../../helpers/menu_hook";
import { useAbsolutePosition, useGridRect } from "../../helpers/position_hook";
import { Menu } from "../../menu/menu";

interface Props {
  figure: Figure;
  onFigureDeleted: () => void;
}

export class ImageFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ImageFigure";
  static components = { Menu };

  private imageContainerRef = useRef("o-image");
  private menuButtonRef = useRef("menuButton");
  private menuButtonPosition = useAbsolutePosition(this.menuButtonRef);
  private position = useAbsolutePosition(this.imageContainerRef);
  private gridRect = useGridRect();

  private menu!: MenuInterface;

  setup() {
    this.menu = useMenu();
  }

  readonly menuItems = createMenu([
    {
      id: "copy",
      name: _lt("Copy"),
      description: "Ctrl+C",
      action: async () => {
        this.env.model.dispatch("SELECT_FIGURE", { id: this.figureId });
        this.env.model.dispatch("COPY");
        await this.env.clipboard.clear();
      },
    },
    {
      id: "cut",
      name: _lt("Cut"),
      description: "Ctrl+X",
      action: async () => {
        this.env.model.dispatch("SELECT_FIGURE", { id: this.figureId });
        this.env.model.dispatch("CUT");
        await this.env.clipboard.clear();
      },
    },
    {
      id: "reset_size",
      name: _lt("Reset size"),
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
    },
    {
      id: "delete",
      name: _lt("Delete image"),
      description: "delete",
      action: () => {
        this.env.model.dispatch("DELETE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          id: this.figureId,
        });
      },
    },
  ]);

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
    this.menu.open({
      position,
      menuItems: this.menuItems,
      containerRect: this.gridRect,
    });
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
