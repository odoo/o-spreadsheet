import { Get } from "../../store_engine";
import { SpreadsheetStore } from "../../stores";
import { FigureUI, UID } from "../../types";

export class FullScreenFigureStore extends SpreadsheetStore {
  mutators = ["toggleFullScreenFigure"] as const;

  fullScreenFigure: FigureUI | undefined = undefined;

  constructor(get: Get) {
    super(get);

    const sheetId = this.getters.getActiveSheetId();
    const figures = this.getters.getFigures(sheetId);
    if (figures.length > 0) {
      // ADRM TODO: delete this
      // this.makeFullScreen(figures[0].id);
    }
  }

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
