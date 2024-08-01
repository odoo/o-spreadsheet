import { isEqual, zoneToDimension } from "../../helpers/index";
import type { GridRenderingContext, Highlight } from "../../types/index";
import { LAYERS } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

/**
 * HighlightPlugin
 */
export class HighlightPlugin extends UIPlugin {
  static layers = [LAYERS.Highlights];
  static getters = ["getHighlights"] as const;

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getHighlights(): Highlight[] {
    return this.prepareHighlights(
      this.getters.getComposerHighlights().concat(this.getters.getSelectionInputHighlights())
    );
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  private prepareHighlights(highlights: Highlight[]): Highlight[] {
    return highlights
      .filter(
        (x) =>
          x.zone.top >= 0 &&
          x.zone.left >= 0 &&
          x.zone.bottom < this.getters.getNumberRows(x.sheetId) &&
          x.zone.right < this.getters.getNumberCols(x.sheetId)
      )
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

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    // rendering selection highlights
    const { ctx, thinLineWidth } = renderingContext;

    const sheetId = this.getters.getActiveSheetId();
    const lineWidth = 3 * thinLineWidth;
    ctx.lineWidth = lineWidth;
    /**
     * We only need to draw the highlights of the current sheet.
     *
     * Note that there can be several times the same highlight in 'this.highlights'.
     * In order to avoid superposing the same color layer and modifying the final
     * opacity, we filter highlights to remove duplicates.
     */
    const highlights = this.getHighlights();
    for (let h of highlights.filter(
      (highlight, index) =>
        // For every highlight in the sheet, deduplicated by zone
        highlights.findIndex((h) => isEqual(h.zone, highlight.zone) && h.sheetId === sheetId) ===
        index
    )) {
      const { x, y, width, height } = this.getters.getVisibleRect(h.zone);
      if (width > 0 && height > 0) {
        ctx.strokeStyle = h.color!;
        ctx.strokeRect(x + lineWidth / 2, y + lineWidth / 2, width - lineWidth, height - lineWidth);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = h.color! + "20";
        ctx.fillRect(x + lineWidth, y + lineWidth, width - 2 * lineWidth, height - 2 * lineWidth);
      }
    }
  }
}
