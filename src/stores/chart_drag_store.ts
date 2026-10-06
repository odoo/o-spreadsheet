import { UID } from "../types/misc";

/**
 * Holds the id of the figure that a dragged chart suggestion is currently
 * hovering over, so it can be highlighted reactively instead of through direct DOM manipulation.
 */
export class ChartDragStore {
  mutators = ["setHighlightedFigure"] as const;
  highlightedFigureId: UID | undefined = undefined;

  setHighlightedFigure(figureId: UID | undefined) {
    if (figureId === this.highlightedFigureId) {
      return "noStateChange";
    }
    this.highlightedFigureId = figureId;
    return "";
  }
}
