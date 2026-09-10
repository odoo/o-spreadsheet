import { SELECTION_BORDER_COLOR } from "../constants";
import { positionToZone } from "../helpers/zones";
import { Zone } from "../types/misc";
import { GridRenderingContext, LayerName } from "../types/rendering";
import { SpreadsheetStore } from "./spreadsheet_store";

export class SelectionRendererStore extends SpreadsheetStore {
  get renderingLayers() {
    return ["Selection"] as const;
  }

  drawLayer(renderingContext: GridRenderingContext, layer: LayerName) {
    // FIXME: during the rendering process, we need to render the sheet/viewports of the GridRenderingContext
    // But in stores, there's nothing preventing us to call the getters or to use the store state, and draw
    // at the wrong position. We should think of a way to improve that.
    const { ctx, thinLineWidth, viewports, sheetId, selectedZones: zones } = renderingContext;
    // selection
    const theme = this.getters.getSpreadsheetTheme();
    const onlyOneCell =
      zones.length === 1 && zones[0].left === zones[0].right && zones[0].top === zones[0].bottom;
    ctx.fillStyle = onlyOneCell
      ? theme.singleCellSelectionBackgroundColor
      : theme.multipleCellsSelectionBackgroundColor;
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 1.5 * thinLineWidth;
    const isDarkMode = this.getters.isDarkMode();
    for (const zone of zones) {
      if (!viewports.isZoneVisibleInViewport(sheetId, zone)) {
        continue;
      }
      const { x, y, width, height } = viewports.getVisibleRect(sheetId, zone);
      const currentLineWidth = ctx.lineWidth;
      if (!isDarkMode) {
        ctx.globalCompositeOperation = "multiply";
      }
      if (height === 0 || width === 0) {
        ctx.lineWidth = 3 * thinLineWidth;
      }
      if (height === 0 && width === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.stroke();
      } else {
        ctx.fillRect(x, y, width, height);
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeRect(x, y, width, height);
      }
      ctx.lineWidth = currentLineWidth;
    }

    ctx.globalCompositeOperation = "source-over";
    // active zone
    const position = renderingContext.activePosition;
    if (!position) {
      return;
    }

    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 3 * thinLineWidth;
    let zone: Zone;
    if (this.getters.isInMerge(position)) {
      zone = this.getters.getMerge(position)!;
    } else {
      zone = positionToZone(position);
    }
    const { x, y, width, height } = viewports.getVisibleRect(sheetId, zone);
    if (width > 0 && height > 0) {
      ctx.strokeRect(x, y, width, height);
    }
  }
}
