import { Component } from "@odoo/owl";
import { CSSProperties, FigureUI, Rect, SpreadsheetChildEnv, UID } from "../../../types";

interface Props {
  figureUI: FigureUI;
  editFigureStyle?: (properties: CSSProperties) => void;
  openContextMenu?: (anchorRect: Rect, onClose?: () => void) => void;
}

export class ImageFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ImageFigure";
  static props = {
    figureUI: Object,
    editFigureStyle: { type: Function, optional: true },
    openContextMenu: { type: Function, optional: true },
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
