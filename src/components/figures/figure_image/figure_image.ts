import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv, UID } from "../../../types";

interface Props {
  figureId: UID;
  onFigureDeleted: () => void;
}

export class ImageFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ImageFigure";
  static components = {};

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get figureId(): UID {
    return this.props.figureId;
  }

  get getImagePath(): string {
    return this.env.model.getters.getImagePath(this.figureId);
  }
}

ImageFigure.props = {
  figureId: String,
  onFigureDeleted: Function,
};
