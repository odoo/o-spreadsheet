import { toRaw } from "@odoo/owl";
import { HIGHLIGHT_COLOR } from "../constants";
import { changeColorAlpha, zoneToDimension } from "../helpers";
import { drawRectBorders } from "../helpers/rendering";
import { Get } from "../store_engine";
import { BorderDescr, GridRenderingContext, Highlight, LayerName } from "../types";
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
    return this.providers
      .flatMap((h) => h.highlights)
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
        this.drawHighlight(ctx, highlight);
      }
    }
  }

  drawHighlight(renderingContext: GridRenderingContext, highlight: Highlight) {
    const color = highlight.color || HIGHLIGHT_COLOR;
    const borderDescr: BorderDescr = { style: "medium", color };

    const visibleRect = this.getters.getVisibleRect(highlight.zone);
    const visibleBorders = this.getters.getZoneVisibleBorders(highlight.zone, borderDescr);

    const { x, y, width, height } = visibleRect;
    if (width < 0 || height < 0) {
      return;
    }

    const { ctx } = renderingContext;

    drawRectBorders(ctx, visibleRect, visibleBorders);
    ctx.globalCompositeOperation = "source-over";
    if (!highlight.noFill) {
      ctx.fillStyle = changeColorAlpha(color, highlight.fillAlpha ?? 0.12);
      ctx.fillRect(x, y, width, height);
    }
  }
}
