import { drawHighlight } from "../helpers/rendering";
import { GridRenderingContext, Highlight, LAYERS } from "../types";
import { RendererStore } from "./renderer_store";

export interface HighlightGetter {
  getHighlights: () => Highlight[];
}

export class HighlightStore extends RendererStore {
  private highlightGetters: HighlightGetter[] = [];

  register(highlightGetter: HighlightGetter) {
    this.highlightGetters.push(highlightGetter);
    this.triggerRender();
  }

  unRegister(highlightGetter: HighlightGetter) {
    this.highlightGetters = this.highlightGetters.filter((h) => h !== highlightGetter);
    this.triggerRender();
  }

  dispose() {
    this.highlightGetters = [];
    this.triggerRender();
  }

  draw(ctx: GridRenderingContext, layer: LAYERS): void {
    if (layer === LAYERS.Highlights) {
      for (const highlightGetters of this.highlightGetters) {
        for (const highlight of highlightGetters.getHighlights()) {
          const rect = this.getters.getVisibleRect(highlight.zone);
          drawHighlight(ctx, highlight, rect);
        }
      }
    }
  }
}
