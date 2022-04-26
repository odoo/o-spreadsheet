import { isEqual, toZone, zoneToDimension } from "../../helpers/index";
import { Mode } from "../../model";
import { GridRenderingContext, Highlight, LAYERS } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

/**
 * HighlightPlugin
 */
export class HighlightPlugin extends UIPlugin {
  static modes: Mode[] = ["normal"];
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

  private prepareHighlights(ranges: [string, string][]): Highlight[] {
    if (ranges.length === 0) {
      return [];
    }
    const activeSheetId = this.getters.getActiveSheetId();
    const preparedHighlights: Highlight[] = [];
    for (let [r1c1, color] of ranges) {
      const [xc, sheet] = r1c1.split("!").reverse();
      const sheetId = sheet ? this.getters.getSheetIdByName(sheet) : activeSheetId;
      if (sheetId) {
        let zone = toZone(xc);
        const { height, width } = zoneToDimension(zone);
        zone = height * width === 1 ? this.getters.expandZone(activeSheetId, toZone(xc)) : zone;
        preparedHighlights.push({ zone, color, sheet: sheetId });
      }
    }
    return preparedHighlights.filter(
      (x) =>
        x.zone.top >= 0 &&
        x.zone.left >= 0 &&
        x.zone.bottom < this.getters.getSheet(x.sheet).rows.length &&
        x.zone.right < this.getters.getSheet(x.sheet).cols.length
    );
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    // rendering selection highlights
    const { ctx, viewport, thinLineWidth } = renderingContext;
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

    for (let h of this.getHighlights().filter(
      (highlight, index) =>
        // For every highlight in the sheet, deduplicated by zone
        this.getHighlights().findIndex(
          (h) => isEqual(h.zone, highlight.zone) && h.sheet === sheetId
        ) === index
    )) {
      const [x, y, width, height] = this.getters.getRect(h.zone, viewport);
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
