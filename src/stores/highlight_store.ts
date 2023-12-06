import { zoneToDimension } from "../helpers";
import { drawHighlight } from "../helpers/rendering";
import { GridRenderingContext, Highlight, LAYERS } from "../types";
import { RendererStore } from "./renderer_store";

export interface HighlightGetter {
  getHighlights: () => Highlight[];
}

export class HighlightStore extends RendererStore {
  private highlightGetters: HighlightGetter[] = [];

  get layers(): LAYERS[] {
    return [LAYERS.Highlights];
  }

  get highlights(): Highlight[] {
    return this.highlightGetters
      .flatMap((h) => h.getHighlights())
      .concat(this.model.getters.getHighlights())
      .map((highlight) => {
        // FIXME duplicated from the highlight plugin
        const { numberOfRows, numberOfCols } = zoneToDimension(highlight.zone);
        const zone =
          numberOfRows * numberOfCols === 1
            ? this.getters.expandZone(highlight.sheetId, highlight.zone)
            : highlight.zone;
        return {
          ...highlight,
          zone,
        };
      });
  }

  register(highlightGetter: HighlightGetter) {
    this.highlightGetters.push(highlightGetter);
  }

  unRegister(highlightGetter: HighlightGetter) {
    this.highlightGetters = this.highlightGetters.filter((h) => h !== highlightGetter);
  }

  dispose() {
    super.dispose();
    this.highlightGetters = [];
  }

  draw(ctx: GridRenderingContext, layer: LAYERS): void {
    if (layer === LAYERS.Highlights) {
      for (const highlight of this.highlights) {
        const rect = this.getters.getVisibleRect(highlight.zone);
        drawHighlight(ctx, highlight, rect);
      }
    }
  }
}
