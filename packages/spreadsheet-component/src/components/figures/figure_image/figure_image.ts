import { Component } from "@odoo/owl";
import { Figure, SpreadsheetChildEnv, UID } from "../../../types";

interface Props {
  figure: Figure;
  onFigureDeleted: () => void;
}

export class ImageFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ImageFigure";
  static props = {
    figure: Object,
    onFigureDeleted: Function,
  };
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
