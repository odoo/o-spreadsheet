import { BasePlugin } from "../base_plugin";
import { Command, LAYERS, Zone, GridRenderingContext, Highlight } from "../types/index";
import { toZone } from "../helpers/index";

/**
 * HighlightPlugin
 */
export class HighlightPlugin extends BasePlugin {
  static layers = [LAYERS.Highlights];

  private highlights: Highlight[] = [];

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ADD_HIGHLIGHTS":
        this.addHighlights(cmd.ranges);
        break;
      case "REMOVE_HIGHLIGHTS":
        this.highlights = [];
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------

  private addHighlights(ranges: { [range: string]: string }) {
    let highlights = Object.keys(ranges)
      .map((r1c1) => {
        const zone: Zone = this.getters.expandZone(toZone(r1c1));
        return { zone, color: ranges[r1c1] };
      })
      .filter(
        (x) =>
          x.zone.top >= 0 &&
          x.zone.left >= 0 &&
          x.zone.bottom < this.workbook.rows.length &&
          x.zone.right < this.workbook.cols.length
      );

    this.highlights = this.highlights.concat(highlights);
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    // rendering selection highlights
    const { ctx, viewport, thinLineWidth } = renderingContext;
    ctx.lineWidth = 3 * thinLineWidth;
    for (let h of this.highlights) {
      const [x, y, width, height] = this.getters.getRect(h.zone, viewport);
      if (width > 0 && height > 0) {
        ctx.strokeStyle = h.color!;
        ctx.strokeRect(x, y, width, height);
      }
    }
  }
}
