import { toRaw } from "@odoo/owl";
import { zoneToDimension } from "../helpers";
import { drawHighlight } from "../helpers/rendering";
import { Get } from "../store_engine";
import { GridRenderingContext, Highlight, LayerName } from "../types";
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
    return ["Highlights"] as const;
  }

  get highlights(): Highlight[] {
    const activeSheetId = this.getters.getActiveSheetId();
    return this.providers
      .flatMap((h) => h.highlights)
      .filter((h) => h.sheetId === activeSheetId)
      .map((highlight) => {
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

  register(highlightProvider: HighlightProvider) {
    this.providers.push(highlightProvider);
  }

  unRegister(highlightProvider: HighlightProvider) {
    this.providers = this.providers.filter((h) => toRaw(h) !== toRaw(highlightProvider));
  }

  drawLayer(ctx: GridRenderingContext, layer: LayerName): void {
    if (layer === "Highlights") {
      for (const highlight of this.highlights) {
        const rect = this.getters.getVisibleRect(highlight.zone);
        drawHighlight(ctx, highlight, rect);
      }
    }
  }
}
