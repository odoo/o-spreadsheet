import { props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { CSSProperties, UID } from "../../../types/misc";
import { Rect } from "../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { useModel } from "../../owl_plugins/model_plugin";
import { types } from "../../props_validation";

export class ImageFigure extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ImageFigure";
  static components = {};

  protected props = props({
    figureUI: types.FigureUI(),
    "editFigureStyle?": types.function<[properties: CSSProperties]>([types.CSSProperties()]),
    "openContextMenu?": types.function<[anchorRect: Rect, onClose?: () => void]>([
      types.Rect(),
      types.function([]),
    ]),
  });

  private model = useModel();

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get figureId(): UID {
    return this.props.figureUI.id;
  }

  get getImagePath(): string {
    return this.model().getters.getImagePath(this.figureId);
  }
}
