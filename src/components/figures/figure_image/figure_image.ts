import { UID } from "../../../types/misc";
import { Rect } from "../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";

import { signal, useProps } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { getElBoundingRect, isCtrlKey } from "../../helpers/dom_helpers";
import { types } from "../../props_validation";

export class ImageFigure extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ImageFigure";

  protected props = useProps({
    figureUI: types.FigureUI(),
    openContextMenu: types.function<(anchorRect: Rect, onClose?: () => void) => void>(),
  });

  private menuButtonRef = signal<HTMLElement | null>(null);

  showMenu(ev: MouseEvent) {
    if (!this.env.model.getters.getSelectedFigureIds().includes(this.props.figureUI.id)) {
      this.env.model.dispatch("SELECT_FIGURE", {
        figureId: this.props.figureUI.id,
        selectMultiple: ev.shiftKey || isCtrlKey(ev),
      });
    }
    this.props.openContextMenu(getElBoundingRect(this.menuButtonRef()));
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get figureId(): UID {
    return this.props.figureUI.id;
  }

  get getImagePath(): string {
    return this.env.model.getters.getImagePath(this.figureId);
  }

  get shouldShowMenuButton(): boolean {
    return !this.env.model.getters.isReadonly() && !this.env.model.getters.isDashboard();
  }
}
