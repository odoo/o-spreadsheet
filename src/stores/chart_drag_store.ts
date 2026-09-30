import {
  HFigureAxisType,
  RenderedSnap,
  VFigureAxisType,
} from "../components/helpers/figure_snap_helper";
import { UID } from "../types/misc";

/**
 * Holds the transient UI state of a chart suggestion being dragged: the id of the figure it's
 * currently hovering over (so it can be highlighted reactively instead of through direct DOM
 * manipulation) and the snap lines to display, if any.
 */
export class ChartDragStore {
  mutators = ["setHighlightedFigure", "setSnapLines"] as const;
  highlightedFigureId: UID | undefined = undefined;
  horizontalSnap: RenderedSnap<HFigureAxisType> | undefined = undefined;
  verticalSnap: RenderedSnap<VFigureAxisType> | undefined = undefined;

  setHighlightedFigure(figureId: UID | undefined) {
    this.highlightedFigureId = figureId;
  }

  setSnapLines(
    horizontalSnap: RenderedSnap<HFigureAxisType> | undefined,
    verticalSnap: RenderedSnap<VFigureAxisType> | undefined
  ) {
    this.horizontalSnap = horizontalSnap;
    this.verticalSnap = verticalSnap;
  }
}
