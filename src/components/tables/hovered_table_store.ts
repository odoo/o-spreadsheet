import { TABLE_HOVER_BACKGROUND_COLOR } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import { range } from "../../helpers/misc";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import { Command } from "../../types/commands";
import { Color, Position, UID } from "../../types/misc";

export class HoveredTableStore extends SpreadsheetStore {
  mutators = ["clear", "hover"] as const;

  col: number | undefined;
  row: number | undefined;
  sheetId: UID | undefined;

  overlayColors: PositionMap<Color> = new PositionMap();

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.clear();
    }
  }

  hover(position: Partial<Position> & { sheetId?: UID }) {
    if (
      !this.getters.isDashboard() ||
      (position.col === this.col && position.row === this.row && position.sheetId === this.sheetId)
    ) {
      return "noStateChange";
    }
    this.col = position.col;
    this.row = position.row;
    this.sheetId = position.sheetId;
    this.computeOverlay();
    return;
  }

  clear() {
    this.col = undefined;
    this.row = undefined;
    this.sheetId = undefined;
  }

  private computeOverlay() {
    this.overlayColors = new PositionMap();
    const { col, row } = this;
    if (col === undefined || row === undefined) {
      return;
    }
    const sheetId = this.sheetId ?? this.getters.getActiveSheetId();
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
