import { toRaw } from "@odoo/owl";
import { drawHighlight } from "../helpers/rendering";
import { Get } from "../store_engine";
import { GridRenderingContext, Highlight, LAYERS } from "../types";
import { SpreadsheetStore } from "./spreadsheet_store";

export interface HighlightProvider {
  highlights: Highlight[];
}

export class HighlightStore extends SpreadsheetStore {
  private providers: HighlightProvider[] = [];

  constructor(get: Get) {
    super(get);
    this.onDispose(() => {
      this.providers = [];
    });
  }

  get renderingLayers() {
    return [LAYERS.Highlights];
  }

  register(highlightProvider: HighlightProvider) {
    this.providers.push(highlightProvider);
  }

  unRegister(highlightProvider: HighlightProvider) {
    this.providers = this.providers.filter((h) => toRaw(h) !== toRaw(highlightProvider));
  }

  drawLayer(ctx: GridRenderingContext, layer: LAYERS): void {
    if (layer === LAYERS.Highlights) {
      for (const provider of this.providers) {
        for (const highlight of provider.highlights) {
          const rect = this.getters.getVisibleRect(highlight.zone);
          drawHighlight(ctx, highlight, rect);
        }
      }
    }
  }
}
