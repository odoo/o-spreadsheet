import { signal } from "@odoo/owl";
import { TABLE_HOVER_BACKGROUND_COLOR } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import { range } from "../../helpers/misc";
import { Command } from "../../types/commands";
import { Color, Position } from "../../types/misc";
import { SpreadsheetOwlPlugin } from "./spreadsheet_owl_plugin";

export class HoveredTablePlugin extends SpreadsheetOwlPlugin {
  col = signal<number | undefined>(undefined);
  row = signal<number | undefined>(undefined);

  overlayColors = signal(new PositionMap<Color>());

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.clear();
    }
  }

  hover(position: Partial<Position>) {
    if (
      !this.getters.isDashboard() ||
      (position.col === this.col() && position.row === this.row())
    ) {
      return;
    }
    this.col.set(position.col);
    this.row.set(position.row);
    this.computeOverlay();
  }

  clear() {
    this.col.set(undefined);
    this.row.set(undefined);
  }

  private computeOverlay() {
    const newPositionMap = new PositionMap<Color>();
    this.overlayColors.set(newPositionMap);
    const col = this.col();
    const row = this.row();
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
        this.getters.getEvaluatedCell({ sheetId, col, row }).formattedValue
      );
    });

    if (!isTableHeader && doesTableRowHaveContent) {
      for (let col = left; col <= right; col++) {
        newPositionMap.set({ sheetId, col, row }, TABLE_HOVER_BACKGROUND_COLOR);
      }
    }
  }
}
