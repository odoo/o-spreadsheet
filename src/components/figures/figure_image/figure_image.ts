import { Component } from "@odoo/owl";
import { FigureUI, SpreadsheetChildEnv, UID } from "../../../types";

interface Props {
  figureUI: FigureUI;
}

export class ImageFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ImageFigure";
  static props = {
    figureUI: Object,
  };
  static components = {};

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get figureId(): UID {
    return this.props.figureUI.id;
  }

  get getImagePath(): string {
    return this.env.model.getters.getImagePath(this.figureId);
  }
}
