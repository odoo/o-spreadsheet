import { signal } from "@odoo/owl";
import { OwlPluginWithModel } from "../../owl_plugins/owl_plugin_with_model";
import { FigureUI } from "../../types/figure";
import { UID } from "../../types/misc";

export class FullScreenFigurePlugin extends OwlPluginWithModel {
  fullScreenFigure = signal<FigureUI | undefined>(undefined);

  toggleFullScreenFigure(figureId: string) {
    if (this.fullScreenFigure()?.id === figureId) {
      this.fullScreenFigure.set(undefined);
    } else {
      this.makeFullScreen(figureId);
    }
  }

  private makeFullScreen(figureId: UID) {
    const sheetId = this.model().getters.getActiveSheetId();
    const figure = this.model().getters.getFigure(sheetId, figureId);
    if (figure) {
      this.fullScreenFigure.set({ ...figure, x: 0, y: 0, width: 0, height: 0 });
    }
  }
}
