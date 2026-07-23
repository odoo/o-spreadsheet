import { TABLE_HOVER_BACKGROUND_COLOR } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import { deepEquals, range } from "../../helpers/misc";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { CellPosition, Color } from "../../types/misc";

export class HoveredTableStore extends SpreadsheetStore {
  mutators = ["clear", "hover"] as const;

  position: CellPosition | undefined;

  overlayColors: PositionMap<Color> = new PositionMap();

  hover(position: CellPosition | undefined) {
    if (!this.getters.isDashboard() || deepEquals(this.position, position)) {
      return "noStateChange";
    }
    this.position = position;
    this.computeOverlay();
    return;
  }

  clear() {
    this.position = undefined;
  }

  private computeOverlay() {
    this.overlayColors = new PositionMap();
    if (!this.position) {
      return;
    }
    const { sheetId, col, row } = this.position;
    const table = this.getters.getTable({ sheetId, col, row });
    if (!table) {
      return;
    }
    const { left, right, top } = table.range.zone;
    const isTableHeader = row < top + table.config.numberOfHeaders;
    const doesTableRowHaveContent = range(left, right + 1).some((col) => {
      return (
        !this.getters.isColHidden(sheetId, col) &&
        this.getters.getEvaluatedCell({ sheetId, col, row }).formattedValue
      );
    });

    if (!isTableHeader && doesTableRowHaveContent) {
      for (let col = left; col <= right; col++) {
        this.overlayColors.set({ sheetId, col, row }, TABLE_HOVER_BACKGROUND_COLOR);
      }
    }
  }
}
