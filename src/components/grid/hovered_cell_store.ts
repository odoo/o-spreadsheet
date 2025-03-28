import { setColorAlpha } from "../../helpers";
import { PositionMap } from "../../plugins/ui_core_views/cell_evaluation/position_map";
import { SpreadsheetStore } from "../../stores";
import { Color, Command, Position } from "../../types";

export class HoveredCellStore extends SpreadsheetStore {
  mutators = ["clear", "hover", "debouncedHover"] as const;
  debouncedCol: number | undefined;
  debouncedRow: number | undefined;

  col: number | undefined;
  row: number | undefined;

  overlayColors: PositionMap<Color> = new PositionMap();

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.clear();
    }
  }

  debouncedHover(position: Partial<Position>) {
    this.debouncedCol = position.col;
    this.debouncedRow = position.row;
  }

  hover(position: Partial<Position>) {
    this.col = position.col;
    this.row = position.row;
    this.computeOverlay();
  }

  clear() {
    this.debouncedCol = undefined;
    this.debouncedRow = undefined;
  }

  private computeOverlay() {
    if (!this.getters.isDashboard()) {
      return;
    }
    this.overlayColors = new PositionMap();
    const col = this.col;
    const row = this.row;
    if (col === undefined || row === undefined) {
      return;
    }
    const sheetId = this.getters.getActiveSheetId();
    const table = this.getters.getTable({ sheetId, col, row });
    if (!table) {
      return;
    }
    const { left, right } = table.range.zone;
    for (let c = left; c <= right; c++) {
      this.overlayColors.set({ sheetId, col: c, row }, setColorAlpha("#000000", 0.06));
    }
  }
}
