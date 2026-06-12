import { CSSProperties, UID } from "../../../types/misc";
import { Rect } from "../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";

import { props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { types } from "../../props_validation";

export class ImageFigure extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ImageFigure";
  static components = {};

  protected props = props({
    figureUI: types.FigureUI(),
    editFigureStyle: types.function<(properties: CSSProperties) => void>().optional(),
    openContextMenu: types.function<(anchorRect: Rect, onClose?: () => void) => void>().optional(),
  });

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
