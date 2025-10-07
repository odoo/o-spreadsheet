import { SpreadsheetStore } from "../../stores";
import { UID } from "../../types";
import { FigureUI } from "../../types/figureUI";

export class FullScreenChartStore extends SpreadsheetStore {
  mutators = ["toggleFullScreenChart"] as const;

  fullScreenFigure: FigureUI | undefined = undefined;

  toggleFullScreenChart(figureId: string) {
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
