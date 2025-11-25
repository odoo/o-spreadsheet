import { TABLE_HOVER_BACKGROUND_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { PositionMap } from "@odoo/o-spreadsheet-engine/helpers/cells/position_map";
import { range } from "../../helpers";
import { SpreadsheetStore } from "../../stores";
import { Color, Command } from "../../types";

export class HoveredTableStore extends SpreadsheetStore {
  overlayColors: PositionMap<Color> = new PositionMap();

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
      case "SET_HOVERED_CELL":
        this.computeOverlay();
        break;
    }
  }

  private computeOverlay() {
    this.overlayColors = new PositionMap();
    const { col, row, sheetId } = this.getters.getHoveredCell() || {};
    if (col === undefined || row === undefined || sheetId === undefined) {
      return;
    }
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
