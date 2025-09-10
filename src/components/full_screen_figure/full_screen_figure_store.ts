import { SpreadsheetStore } from "../../stores";
import { FigureUI, UID } from "../../types";

export class FullScreenFigureStore extends SpreadsheetStore {
  mutators = ["toggleFullScreenFigure"] as const;

  fullScreenFigure: FigureUI | undefined = undefined;

  toggleFullScreenFigure(figureId: string) {
    if (this.fullScreenFigure?.id === figureId) {
      this.fullScreenFigure = undefined;
    } else {
      this.makeFullScreen(figureId);
    }
  }

  private makeFullScreen(figureId: UID) {
    const sheetId = this.getters.getActiveSheetId();
    const figure = this.getters.getFigure(sheetId, figureId);
    if (figure) {
      this.fullScreenFigure = { ...figure, x: 0, y: 0, width: 0, height: 0 };
    }
  }
}
