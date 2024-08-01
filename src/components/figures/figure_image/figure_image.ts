import { Component } from "@odoo/owl";
import type { Figure, SpreadsheetChildEnv, UID } from "../../../types";

interface Props {
  figure: Figure;
  onFigureDeleted: () => void;
}

export class ImageFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ImageFigure";
  static components = {};

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
