import { TABLE_HOVER_BACKGROUND_COLOR } from "../constants";
import { PositionMap } from "../helpers/cells/position_map";
import { CellPosition, Color } from "../types/misc";
import { SpreadsheetStore } from "./spreadsheet_store";

export interface CellHoverOverlayProvider {
  getHighlightedPositions: (hoveredPosition: CellPosition) => CellPosition[];
}

export class CellHoverOverlayStore extends SpreadsheetStore {
  mutators = ["hover", "register", "unRegister"] as const;
  storeGetters = ["getCellHoverOverlayColor"] as const;

  private providers: CellHoverOverlayProvider[] = [];

  overlayColors: PositionMap<Color> = new PositionMap();

  hover(hoveredPosition: CellPosition | undefined) {
    this.overlayColors = new PositionMap();
    if (!hoveredPosition) {
      return;
    }

    for (const provider of this.providers) {
      const positions = provider.getHighlightedPositions(hoveredPosition);
      for (const position of positions) {
        this.overlayColors.set(position, TABLE_HOVER_BACKGROUND_COLOR);
      }
    }
  }

  register(highlightProvider: CellHoverOverlayProvider) {
    this.providers.push(highlightProvider);
  }

  unRegister(highlightProvider: CellHoverOverlayProvider) {
    this.providers = this.providers.filter((h) => h !== highlightProvider);
  }
}
