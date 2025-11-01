import { TABLE_HOVER_BACKGROUND_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { PositionMap } from "@odoo/o-spreadsheet-engine/helpers/cells/position_map";
import { range } from "../../helpers";
import { SpreadsheetStore } from "../../stores";
import { Color, Command, Position } from "../../types";

export class HoveredTableStore extends SpreadsheetStore {
  mutators = ["clear", "hover"] as const;

  col: number | undefined;
  row: number | undefined;

  overlayColors: PositionMap<Color> = new PositionMap();

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.clear();
    }
  }

  hover(position: Partial<Position>) {
    if (!this.getters.isDashboard() || (position.col === this.col && position.row === this.row)) {
      return "noStateChange";
    }
    this.col = position.col;
    this.row = position.row;
    this.computeOverlay();
    return;
  }

  clear() {
    this.col = undefined;
    this.row = undefined;
  }

  private computeOverlay() {
    this.overlayColors = new PositionMap();
    const { col, row } = this;
    if (col === undefined || row === undefined) {
      return;
    }
    const sheetId = this.getters.getActiveSheetId();
    const table = this.getters.getTable({ sheetId, col, row });
    if (!table) {
      return;
    }
    const { left, right, top } = table.range.zone;
    const isTableHeader = row < top + table.config.numberOfHeaders;
    const doesTableRowHaveContent = range(left, right + 1).some((col) => {
      return (
        !this.getters.isColHidden(sheetId, col) &&
        this.getters.getFormattedValue(this.getters.getEvaluatedCell({ sheetId, col, row }))
      );
    });

    if (!isTableHeader && doesTableRowHaveContent) {
      for (let col = left; col <= right; col++) {
        this.overlayColors.set({ sheetId, col, row }, TABLE_HOVER_BACKGROUND_COLOR);
      }
    }
  }
}
