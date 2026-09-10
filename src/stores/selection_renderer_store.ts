import { SELECTION_BORDER_COLOR } from "../constants";
import { positionToZone } from "../helpers/zones";
import { GridRenderingContext, Rect } from "../types/rendering";
import { SpreadsheetStore } from "./spreadsheet_store";

interface SelectionRenderingState {
  fillStyle: string;
  selectedZonesRects: Rect[];
  activeZoneRect: Rect | null;
  isDarkMode: boolean;
}

export class SelectionRendererStore extends SpreadsheetStore {
  get renderingLayers() {
    return ["Selection"] as const;
  }

  drawLayer(renderingContext: GridRenderingContext) {
    const state = this.getRenderingState(renderingContext);
    this.drawSelection(renderingContext, state);
  }

  private getRenderingState(renderingContext: GridRenderingContext): SelectionRenderingState {
    // FIXME: during the rendering process, we need to render the sheet/viewports of the GridRenderingContext
    // But in stores, there's nothing preventing us to call the getters or to use the store state, and draw
    // at the wrong position. We should think of a way to improve that.
    const { viewports, sheetId, selectedZones: zones } = renderingContext;

    const theme = this.getters.getSpreadsheetTheme();
    const onlyOneCell =
      zones.length === 1 && zones[0].left === zones[0].right && zones[0].top === zones[0].bottom;
    const fillStyle = onlyOneCell
      ? theme.singleCellSelectionBackgroundColor
      : theme.multipleCellsSelectionBackgroundColor;

    const state: SelectionRenderingState = {
      isDarkMode: this.getters.isDarkMode(),
      fillStyle,
      selectedZonesRects: [],
      activeZoneRect: null,
    };

    for (const zone of zones) {
      if (!viewports.isZoneVisibleInViewport(sheetId, zone)) {
        continue;
      }
      const rect = viewports.getVisibleRect(sheetId, zone);
      state.selectedZonesRects.push(rect);
    }

    const position = renderingContext.activePosition;
    if (!position) {
      return state;
    }

    const zone = this.getters.isInMerge(position)
      ? this.getters.getMerge(position)!
      : positionToZone(position);
    state.activeZoneRect = viewports.getVisibleRect(sheetId, zone);
    return state;
  }

  drawSelection(renderingContext: GridRenderingContext, state: SelectionRenderingState) {
    const { ctx, thinLineWidth } = renderingContext;

    ctx.fillStyle = state.fillStyle;
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 1.5 * thinLineWidth;

    for (const rect of state.selectedZonesRects) {
      const { x, y, width, height } = rect;
      const currentLineWidth = ctx.lineWidth;
      if (!state.isDarkMode) {
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
    if (!state.activeZoneRect) {
      return;
    }

    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = 3 * thinLineWidth;
    const { x, y, width, height } = state.activeZoneRect;
    if (width > 0 && height > 0) {
      ctx.strokeRect(x, y, width, height);
    }
  }
}
