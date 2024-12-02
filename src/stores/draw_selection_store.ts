import { SELECTION_BORDER_COLOR } from "../constants";
import { positionToZone } from "../helpers";
import { Get } from "../store_engine";
import { GridRenderingContext, Highlight, LayerName, Zone } from "../types";
import { SpreadsheetStore } from "./spreadsheet_store";

export interface HighlightProvider {
  highlights: Highlight[];
}

export class DrawSelectionStore extends SpreadsheetStore {
  // mutators = ["register", "unRegister"] as const;

  constructor(get: Get) {
    super(get);
  }

  get renderingLayers() {
    return ["Selection"] as const;
  }

  drawLayer(renderingContext: GridRenderingContext, layer: LayerName): void {
    if (this.getters.isDashboard()) {
      return;
    }
    const { ctx, thinLineWidth } = renderingContext;
    // selection
    const zones = this.getters.getSelectedZones();
    ctx.fillStyle = "#f3f7fe";
    const onlyOneCell =
      zones.length === 1 && zones[0].left === zones[0].right && zones[0].top === zones[0].bottom;
    ctx.fillStyle = onlyOneCell ? "#f3f7fe" : "#e9f0ff";
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 1.5 * thinLineWidth;
    for (const zone of zones) {
      const { x, y, width, height } = this.getters.getVisibleRect(zone);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillRect(x, y, width, height);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeRect(x, y, width, height);
    }
    ctx.globalCompositeOperation = "source-over";

    // active zone
    const position = this.getters.getActivePosition();

    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 3 * thinLineWidth;
    let zone: Zone;
    if (this.getters.isInMerge(position)) {
      zone = this.getters.getMerge(position)!;
    } else {
      zone = positionToZone(position);
    }
    const { x, y, width, height } = this.getters.getVisibleRect(zone);
    if (width > 0 && height > 0) {
      ctx.strokeRect(x, y, width, height);
    }
  }
}
