import { TABLE_HOVER_BACKGROUND_COLOR } from "../../constants";
import { PositionMap } from "../../plugins/ui_core_views/cell_evaluation/position_map";
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
    const isTableRowHasContent = (): boolean => {
      for (let c = left; c <= right; c++) {
        if (
          !this.getters.isColHidden(sheetId, c) &&
          this.getters.getEvaluatedCell({ sheetId, col: c, row })?.formattedValue.length > 0
        ) {
          return true;
        }
      }
      return false;
    };
    if (isTableHeader || !isTableRowHasContent()) {
      return;
    }

    for (let c = left; c <= right; c++) {
      this.overlayColors.set({ sheetId, col: c, row }, TABLE_HOVER_BACKGROUND_COLOR);
    }
  }
}
