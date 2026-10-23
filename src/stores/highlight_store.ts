import { zoneToDimension } from "../helpers";
import { drawHighlight } from "../helpers/rendering";
import { Get } from "../store_engine";
import { GridRenderingContext, Highlight, LayerName, Rect } from "../types";
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
    return this.getVisibleHighlights().map(({ highlight }) => highlight);
  }

  private getVisibleHighlights(): { highlight: Highlight; rect: Rect }[] {
    const activeSheetId = this.getters.getActiveSheetId();
    const visibleHighlights: { highlight: Highlight; rect: Rect }[] = [];
    for (const provider of this.providers) {
      for (const highlight of provider.highlights) {
        if (highlight.sheetId !== activeSheetId) {
          continue;
        }
        const { numberOfRows, numberOfCols } = zoneToDimension(highlight.zone);
        const zone =
          numberOfRows * numberOfCols === 1
            ? this.getters.expandZone(highlight.sheetId, highlight.zone)
            : highlight.zone;
        // compute once here as it's used in drawLayer
        const rect = this.getters.getVisibleRect(zone);
        if (!(rect.width > 0 && rect.height > 0)) {
          continue;
        }
        visibleHighlights.push({ highlight: { ...highlight, zone }, rect });
      }
    }
    return visibleHighlights;
  }

  register(highlightProvider: HighlightProvider) {
    this.providers.push(highlightProvider);
  }

  unRegister(highlightProvider: HighlightProvider) {
    this.providers = this.providers.filter((h) => h !== highlightProvider);
  }

  drawLayer(ctx: GridRenderingContext, layer: LayerName): void {
    if (layer === "Highlights") {
      for (const { highlight, rect } of this.getVisibleHighlights()) {
        drawHighlight(ctx, highlight, rect);
      }
    }
  }
}
