import { Highlight } from "@odoo/o-spreadsheet-engine";
import { zoneToDimension } from "../helpers";
import { drawHighlight } from "../helpers/rendering";
import { Get } from "../store_engine";
import { GridRenderingContext, LayerName } from "../types";
import { SpreadsheetStore } from "./spreadsheet_store";

export interface HighlightProvider {
  highlights: Highlight[];
}

export class HighlightStore extends SpreadsheetStore {
  mutators = ["register", "unRegister"] as const;
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
      .filter((h) => h.range.sheetId === activeSheetId)
      .map((highlight) => {
        const { numberOfRows, numberOfCols } = zoneToDimension(highlight.range.zone);
        const zone =
          numberOfRows * numberOfCols === 1
            ? this.getters.expandZone(highlight.range.sheetId, highlight.range.zone)
            : highlight.range.unboundedZone;

        return {
          ...highlight,
          range: this.model.getters.getRangeFromZone(highlight.range.sheetId, zone),
        };
      });
  }

  register(highlightProvider: HighlightProvider) {
    this.providers.push(highlightProvider);
  }

  unRegister(highlightProvider: HighlightProvider) {
    this.providers = this.providers.filter((h) => h !== highlightProvider);
  }

  drawLayer(ctx: GridRenderingContext, layer: LayerName): void {
    if (layer === "Highlights") {
      for (const highlight of this.highlights) {
        const rect = this.getters.getVisibleRect(highlight.range.zone);
        drawHighlight(ctx, highlight, rect);
      }
    }
  }
}
